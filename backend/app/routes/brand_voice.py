"""
Brand Voice Generation API

Generates brand voice system prompts from personality traits using AI.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import List
import os
from openai import OpenAI

router = APIRouter()

TRAIT_DESCRIPTIONS = {
    'cheerful': 'maintains an upbeat, positive, and enthusiastic tone',
    'agreeable': 'is accommodating, supportive, and validates user perspectives',
    'social': 'is conversational, engaging, and builds rapport',
    'gen_z': 'uses casual, trendy language with modern expressions',
    'funny': 'incorporates appropriate humor and wit',
    'realistic': 'is honest, practical, and sets clear expectations',
    'formal': 'maintains professional, polished communication',
    'empathetic': 'shows understanding and emotional awareness',
    'concise': 'keeps responses brief and to-the-point',
    'detailed': 'provides thorough, comprehensive explanations',
}


class GenerateBrandVoiceRequest(BaseModel):
    traits: List[str]


@router.post("/generate-brand-voice")
async def generate_brand_voice(request: GenerateBrandVoiceRequest):
    """
    Generate a brand voice system prompt from selected personality traits
    """
    # Build trait descriptions
    trait_texts = []
    for trait in request.traits:
        if trait in TRAIT_DESCRIPTIONS:
            trait_texts.append(TRAIT_DESCRIPTIONS[trait])

    if not trait_texts:
        return {"prompt": ""}

    # Use AI to generate cohesive brand voice prompt
    client = OpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1"
    )

    generation_prompt = f"""Create a concise system prompt instruction (2-3 paragraphs) that defines a brand voice with these characteristics:

{chr(10).join(f'- {text}' for text in trait_texts)}

The prompt should:
1. Be written as instructions for an AI assistant
2. Be natural and not sound like a list
3. Include specific guidance on tone, language style, and approach
4. Be practical and actionable

Output ONLY the system prompt text, no explanations or meta-commentary."""

    response = client.chat.completions.create(
        model="anthropic/claude-sonnet-4",
        messages=[{"role": "user", "content": generation_prompt}],
        temperature=0.7,
        max_tokens=500
    )

    generated_prompt = response.choices[0].message.content.strip()

    return {"prompt": generated_prompt}
