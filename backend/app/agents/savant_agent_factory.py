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

        # Get system prompt directly from savant
        savant_prompt = savant_data.get('system_prompt')

        # Fetch account-level prompts
        account_prompts_result = self.supabase.table('account_prompts')\
            .select('prompt, priority')\
            .eq('account_id', account_id)\
            .eq('is_active', True)\
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

        combined_instructions = "\n\n".join(instructions_parts) if instructions_parts else None

        # Create RAG function with bound savant_id
        rag_function = create_rag_function(savant_id)

        # Extract model config from JSONB
        model_config = savant_data.get('model_config', {})
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
            tools=[rag_function],
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
