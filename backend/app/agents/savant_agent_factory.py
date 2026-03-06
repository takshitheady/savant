"""
Savant Agent Factory

Dynamically creates Agno Agent instances based on Savant configuration.
Combines account-level prompts, savant-level prompts, and RAG capabilities.
Supports multiple AI providers (Anthropic, OpenAI, Google, Mistral, DeepSeek, ByteDance).
Includes conversation memory and user personalization via Agno's built-in storage.
"""

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.db.postgres import PostgresDb
from app.tools.rag_tool import create_rag_function
from supabase import create_client
import os
from typing import Optional

# Multi-provider API configuration
MODEL_API_BASE_URL = "https://openrouter.ai/api/v1"

# Memory configuration
MEMORY_CONFIG = {
    "add_history_to_context": True,     # Pass conversation history to LLM
    "num_history_runs": 10,             # Last 10 message exchanges
    "enable_user_memories": True,       # Remember user facts across sessions
}


class SavantAgentFactory:
    def __init__(self):
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

        # Initialize Agno session storage for conversation memory
        db_url = os.getenv("SUPABASE_DB_URL")
        if db_url:
            # Convert standard PostgreSQL URL to Agno-compatible format
            # Agno requires postgresql+psycopg:// instead of postgresql://
            if db_url.startswith("postgresql://"):
                db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

            self.agent_db = PostgresDb(
                db_url=db_url,
                session_table="agent_sessions"
            )
        else:
            self.agent_db = None

    async def create_agent(
        self,
        savant_id: str,
        account_id: str,
        session_id: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> Agent:
        """
        Create a dynamic agent instance for a specific savant with conversation memory

        Args:
            savant_id: UUID of the Savant
            account_id: UUID of the Account (for permission checking)
            session_id: Conversation/session ID for memory continuity
            user_id: User ID for personalized memories across sessions

        Returns:
            Configured Agno Agent instance with memory capabilities
        """
        # Fetch savant configuration
        savant_result = self.supabase.table('savants')\
            .select('*')\
            .eq('id', savant_id)\
            .eq('account_id', account_id)\
            .single()\
            .execute()

        if not savant_result.data:
            raise ValueError(f"Savant {savant_id} not found or access denied")

        savant_data = savant_result.data

        # Get system prompts - combine base (hidden from user) + user (customizable)
        base_prompt = savant_data.get('base_system_prompt')
        user_prompt = savant_data.get('user_system_prompt')

        # Compose final savant prompt: base takes priority, user customizations append
        savant_prompt_parts = []
        if base_prompt:
            savant_prompt_parts.append(base_prompt)
        if user_prompt:
            savant_prompt_parts.append("--- User Customizations ---")
            savant_prompt_parts.append(user_prompt)

        savant_prompt = "\n\n".join(savant_prompt_parts) if savant_prompt_parts else None

        # Extract model config
        model_config = savant_data.get('model_config', {})
        toolkits = model_config.get('toolkits', ['rag'])

        # Check if savant should use brand voice
        # Default: True for new savants, False for imported savants (have cloned_from_id)
        use_brand_voice = model_config.get('use_brand_voice')
        if use_brand_voice is None:
            # If not explicitly set, default based on whether it's an import
            use_brand_voice = savant_data.get('cloned_from_id') is None

        # Fetch account-level prompts
        account_prompts_query = self.supabase.table('account_prompts')\
            .select('prompt, priority, is_brand_voice')\
            .eq('account_id', account_id)\
            .eq('is_active', True)

        # If savant opts out of brand voice, filter out brand voice prompts
        if not use_brand_voice:
            account_prompts_query = account_prompts_query.neq('is_brand_voice', True)

        account_prompts_result = account_prompts_query\
            .order('priority', desc=True)\
            .order('created_at')\
            .execute()

        # Build hierarchical instructions
        # Order: account prompts first (by priority), then savant-specific prompt
        instructions_parts = []

        if account_prompts_result.data:
            for ap in account_prompts_result.data:
                instructions_parts.append(ap['prompt'])

        if savant_prompt:
            instructions_parts.append(savant_prompt)

        # RAG usage guidance is handled by Function.instructions in rag_tool.py
        # Agno automatically injects it into the system message via add_instructions=True

        # Build tools list dynamically based on model_config.toolkits
        tools_list = []

        # RAG tool (default for all savants)
        if 'rag' in toolkits:
            rag_function = create_rag_function(savant_id)
            tools_list.append(rag_function)

        # Composio-backed toolkits (GA4, GSC, etc.)
        composio_toolkit_names = [tk for tk in toolkits if tk != 'rag']
        if composio_toolkit_names and user_id:
            try:
                from app.tools.composio_tools import (
                    check_user_google_connection,
                    create_composio_mcp_tools,
                    get_connection_url,
                )

                is_connected = check_user_google_connection(user_id)
                if is_connected:
                    mcp_tools = create_composio_mcp_tools(user_id, composio_toolkit_names)
                    tools_list.append(mcp_tools)
                    instructions_parts.append(
                        "You have access to Composio tools for Google Analytics and Google Search Console. "
                        "When the user asks about website traffic, search performance, analytics, GSC, GA4, "
                        "keywords, impressions, clicks, or any data from their Google accounts, use the "
                        "COMPOSIO_SEARCH_TOOLS tool to find the right action, then COMPOSIO_MULTI_EXECUTE_TOOL "
                        "to run it. Always use these tools for analytics queries instead of relying on uploaded documents."
                    )
                else:
                    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
                    redirect_url = f"{frontend_url}/savants/{savant_id}/chat"
                    connect_url = get_connection_url(user_id, redirect_url)
                    instructions_parts.append(
                        f"\nIMPORTANT: The user has NOT connected their Google account. "
                        f"Before answering any analytics or search console questions, "
                        f"ask them to connect by clicking this link: {connect_url}\n"
                        f"After they connect, they should send their question again."
                    )
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(
                    f"Failed to load Composio tools for savant {savant_id}: {e}"
                )

        combined_instructions = "\n\n".join(instructions_parts) if instructions_parts else None

        # Default to Claude Sonnet 4.5
        model_name = model_config.get('model', 'anthropic/claude-sonnet-4.5')
        temperature = model_config.get('temperature', 0.7)

        # Get API key for model routing
        api_key = os.getenv("OPENROUTER_API_KEY")

        # Create agent with multi-provider configuration and memory
        agent = Agent(
            id=f"savant-{savant_id}",
            name=savant_data.get('name', 'Savant'),
            model=OpenAIChat(
                id=model_name,
                api_key=api_key,
                base_url=MODEL_API_BASE_URL,
                temperature=temperature,
                max_tokens=model_config.get('max_tokens', 4096),
            ),
            instructions=combined_instructions,
            tools=tools_list,
            markdown=True,
            # Memory configuration for conversation continuity
            db=self.agent_db,
            session_id=session_id,
            user_id=user_id,
            add_history_to_context=MEMORY_CONFIG["add_history_to_context"],
            num_history_runs=MEMORY_CONFIG["num_history_runs"],
            enable_user_memories=MEMORY_CONFIG["enable_user_memories"],
        )

        return agent
