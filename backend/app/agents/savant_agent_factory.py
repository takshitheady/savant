"""
Savant Agent Factory

Dynamically creates Agno Agent instances based on Savant configuration.
Combines account-level prompts, savant-level prompts, and RAG capabilities.
Uses OpenRouter for multi-model support (OpenAI, Anthropic, Google, etc.)
"""

from agno.agent import Agent
from agno.models.openai import OpenAIChat
from app.tools.rag_tool import create_rag_function
from supabase import create_client
import os
from typing import Optional

# OpenRouter configuration
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


class SavantAgentFactory:
    def __init__(self):
        self.supabase = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        )

    async def create_agent(self, savant_id: str, account_id: str) -> Agent:
        """
        Create a dynamic agent instance for a specific savant

        Args:
            savant_id: UUID of the Savant
            account_id: UUID of the Account (for permission checking)

        Returns:
            Configured Agno Agent instance
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
        # Default to OpenRouter format model ID
        model_name = model_config.get('model', 'openai/gpt-4o-mini')
        temperature = model_config.get('temperature', 0.7)

        # Get OpenRouter API key
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

        # Create agent with OpenRouter configuration
        # OpenRouter uses OpenAI-compatible API, so we can use OpenAIChat
        agent = Agent(
            id=f"savant-{savant_id}",
            name=savant_data.get('name', 'Savant'),
            model=OpenAIChat(
                id=model_name,
                api_key=openrouter_api_key,
                base_url=OPENROUTER_BASE_URL,
                temperature=temperature,
            ),
            instructions=combined_instructions,
            tools=[rag_function],
            markdown=True,
        )

        return agent
