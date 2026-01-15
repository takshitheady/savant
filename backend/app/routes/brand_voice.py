"""
Brand Voice Generation API

Generates brand voice system prompts from personality traits using AI.
"""

from fastapi import APIRouter, HTTPException
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
    print(f"[generate-brand-voice] Received request with traits: {request.traits}")

    # Build trait descriptions
    trait_texts = []
    for trait in request.traits:
        if trait in TRAIT_DESCRIPTIONS:
            trait_texts.append(TRAIT_DESCRIPTIONS[trait])

    print(f"[generate-brand-voice] Matched trait descriptions: {trait_texts}")

    if not trait_texts:
        print("[generate-brand-voice] No valid traits found, returning empty prompt")
        return {"prompt": ""}

    # Check API key
    api_key = os.getenv("OPENROUTER_API_KEY")
    print(f"[generate-brand-voice] OPENROUTER_API_KEY set: {bool(api_key)}")

    if not api_key:
        print("[generate-brand-voice] ERROR: OPENROUTER_API_KEY not set!")
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    try:
        # Use AI to generate cohesive brand voice prompt
        client = OpenAI(
            api_key=api_key,
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

        print(f"[generate-brand-voice] Calling OpenRouter API...")

        response = client.chat.completions.create(
            model="anthropic/claude-sonnet-4",
            messages=[{"role": "user", "content": generation_prompt}],
            temperature=0.7,
            max_tokens=500
        )

        generated_prompt = response.choices[0].message.content.strip()
        print(f"[generate-brand-voice] Success! Generated prompt length: {len(generated_prompt)}")

        return {"prompt": generated_prompt}

    except Exception as e:
        print(f"[generate-brand-voice] ERROR: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate: {str(e)}")
