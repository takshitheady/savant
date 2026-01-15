"""
Brand Voice Generation API

Generates brand voice system prompts from personality traits using AI.
Supports both simple (traits only) and advanced (full brand context) modes.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import httpx
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

# Voice dimension labels for prompt building
VOICE_DIMENSION_LABELS = {
    'casualVsFormal': {'a': 'casual and relaxed', 'b': 'formal and professional'},
    'playfulVsSerious': {'a': 'playful and light-hearted', 'b': 'serious and straightforward'},
    'polishedVsGritty': {'a': 'polished and refined', 'b': 'gritty and authentic'},
    'warmVsCool': {'a': 'warm and friendly', 'b': 'cool and composed'},
    'classicVsTrendy': {'a': 'classic and timeless', 'b': 'trendy and modern'},
    'expertVsInsider': {'a': 'authoritative and expert', 'b': 'relatable and peer-like'},
    'laidbackVsBold': {'a': 'laid-back and understated', 'b': 'bold and assertive'},
}


class AdvancedBusinessInfo(BaseModel):
    businessName: Optional[str] = None
    websiteUrl: Optional[str] = None
    businessDescription: Optional[str] = None
    primaryCategory: Optional[str] = None
    locations: Optional[str] = None
    idealCustomer: Optional[str] = None


class AdvancedBrandIdentity(BaseModel):
    brandPillars: Optional[List[str]] = None
    voiceDescription: Optional[str] = None
    differentiators: Optional[str] = None
    pastCampaigns: Optional[str] = None
    messagingRestrictions: Optional[str] = None


class AdvancedVoiceDimensions(BaseModel):
    casualVsFormal: Optional[str] = None
    playfulVsSerious: Optional[str] = None
    polishedVsGritty: Optional[str] = None
    warmVsCool: Optional[str] = None
    classicVsTrendy: Optional[str] = None
    expertVsInsider: Optional[str] = None
    laidbackVsBold: Optional[str] = None
    dimensionNotes: Optional[Dict[str, str]] = None


class AdvancedWebsiteAnalysis(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    analyzedAt: Optional[str] = None
    error: Optional[str] = None


class AdvancedData(BaseModel):
    businessInfo: Optional[AdvancedBusinessInfo] = None
    brandIdentity: Optional[AdvancedBrandIdentity] = None
    voiceDimensions: Optional[AdvancedVoiceDimensions] = None
    websiteAnalysis: Optional[AdvancedWebsiteAnalysis] = None


class GenerateBrandVoiceRequest(BaseModel):
    traits: List[str]
    advanced_data: Optional[AdvancedData] = None


class AnalyzeWebsiteRequest(BaseModel):
    url: str


async def extract_business_info(content: str) -> dict:
    """Use AI to extract structured business information from website content"""
    if not content or len(content.strip()) < 50:
        return {}

    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        print("[extract_business_info] No API key, skipping extraction")
        return {}

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )

        extraction_prompt = f"""Analyze this website content and extract business information. Return ONLY valid JSON with these fields (use null for unknown):

{{
  "businessName": "company/brand name",
  "businessDescription": "2-3 sentence description of what they do",
  "primaryCategory": "one of: Technology/SaaS, E-commerce/Retail, Healthcare, Finance, Food & Beverage, Professional Services, Education, Entertainment, Other",
  "targetAudience": "who they serve/sell to",
  "services": "main products or services offered",
  "toneHints": "observed communication style (formal/casual/friendly/professional)"
}}

Website content:
{content[:4000]}

Return ONLY the JSON object, no other text."""

        response = client.chat.completions.create(
            model="anthropic/claude-haiku-4.5",
            messages=[{"role": "user", "content": extraction_prompt}],
            temperature=0.3,
            max_tokens=500
        )

        result_text = response.choices[0].message.content.strip()

        # Try to parse JSON from response
        import json
        # Handle potential markdown code blocks
        if result_text.startswith("```"):
            result_text = result_text.split("```")[1]
            if result_text.startswith("json"):
                result_text = result_text[4:]
            result_text = result_text.strip()

        extracted = json.loads(result_text)
        print(f"[extract_business_info] Extracted: {list(extracted.keys())}")
        return extracted

    except Exception as e:
        print(f"[extract_business_info] Error: {type(e).__name__}: {str(e)}")
        return {}


@router.post("/analyze-website")
async def analyze_website(request: AnalyzeWebsiteRequest):
    """
    Analyze website content using Firecrawl API
    """
    print(f"[analyze-website] Analyzing URL: {request.url}")

    firecrawl_key = os.getenv("FIRECRAWL_API_KEY")
    if not firecrawl_key:
        print("[analyze-website] WARNING: FIRECRAWL_API_KEY not set")
        raise HTTPException(status_code=500, detail="Website analysis not configured")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.firecrawl.dev/v1/scrape",
                headers={
                    "Authorization": f"Bearer {firecrawl_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "url": request.url,
                    "formats": ["markdown"],
                    "onlyMainContent": True,
                    "timeout": 30000
                }
            )

            if response.status_code == 402:
                print("[analyze-website] Firecrawl credits exhausted (402)")
                return {
                    "success": False,
                    "error": "credits_exhausted",
                    "message": "Firecrawl credits exhausted. Website analysis is optional - skip this step to continue."
                }

            if response.status_code != 200:
                print(f"[analyze-website] Firecrawl error: {response.status_code}")
                return {
                    "success": False,
                    "error": "api_error",
                    "message": f"Failed to analyze website (error {response.status_code})"
                }

            data = response.json()
            print(f"[analyze-website] Firecrawl success! Now extracting with AI...")

            # Extract metadata and content
            metadata = data.get("data", {}).get("metadata", {})
            markdown = data.get("data", {}).get("markdown", "")

            # Use AI to extract structured business information
            extracted = await extract_business_info(markdown[:6000] if markdown else "")

            print(f"[analyze-website] AI extraction complete!")

            return {
                "success": True,
                "title": metadata.get("title", ""),
                "description": metadata.get("description", ""),
                "content": markdown[:4000] if markdown else "",
                "extracted": extracted
            }

    except httpx.TimeoutException:
        print("[analyze-website] Timeout while fetching website")
        return {
            "success": False,
            "error": "timeout",
            "message": "Website took too long to respond"
        }
    except Exception as e:
        print(f"[analyze-website] ERROR: {type(e).__name__}: {str(e)}")
        return {
            "success": False,
            "error": "unknown",
            "message": f"Failed to analyze website"
        }


def build_advanced_prompt_context(advanced_data: AdvancedData) -> str:
    """Build context string from advanced brand data"""
    sections = []

    # Business Info
    if advanced_data.businessInfo:
        bi = advanced_data.businessInfo
        business_parts = []
        if bi.businessName:
            business_parts.append(f"Business: {bi.businessName}")
        if bi.businessDescription:
            business_parts.append(f"Description: {bi.businessDescription}")
        if bi.primaryCategory:
            business_parts.append(f"Industry: {bi.primaryCategory}")
        if bi.locations:
            business_parts.append(f"Locations: {bi.locations}")
        if bi.idealCustomer:
            business_parts.append(f"Target audience: {bi.idealCustomer}")
        if business_parts:
            sections.append("BUSINESS CONTEXT:\n" + "\n".join(business_parts))

    # Brand Identity
    if advanced_data.brandIdentity:
        bid = advanced_data.brandIdentity
        identity_parts = []
        if bid.brandPillars:
            identity_parts.append(f"Core values: {', '.join(bid.brandPillars)}")
        if bid.voiceDescription:
            identity_parts.append(f"Desired voice: {bid.voiceDescription}")
        if bid.differentiators:
            identity_parts.append(f"Differentiators: {bid.differentiators}")
        if bid.pastCampaigns:
            identity_parts.append(f"Past learnings: {bid.pastCampaigns}")
        if bid.messagingRestrictions:
            identity_parts.append(f"Restrictions: {bid.messagingRestrictions}")
        if identity_parts:
            sections.append("BRAND IDENTITY:\n" + "\n".join(identity_parts))

    # Voice Dimensions
    if advanced_data.voiceDimensions:
        vd = advanced_data.voiceDimensions
        dimension_parts = []
        for dim_id, labels in VOICE_DIMENSION_LABELS.items():
            value = getattr(vd, dim_id, None)
            if value and value != 'neither':
                dimension_parts.append(f"- {labels[value]}")
                # Add note if present
                if vd.dimensionNotes and dim_id in vd.dimensionNotes:
                    dimension_parts.append(f"  Note: {vd.dimensionNotes[dim_id]}")
        if dimension_parts:
            sections.append("VOICE STYLE:\n" + "\n".join(dimension_parts))

    # Website Analysis
    if advanced_data.websiteAnalysis and advanced_data.websiteAnalysis.content:
        wa = advanced_data.websiteAnalysis
        website_context = f"WEBSITE CONTENT (for context):\n{wa.content[:2000]}"
        sections.append(website_context)

    return "\n\n".join(sections)


@router.post("/generate-brand-voice")
async def generate_brand_voice(request: GenerateBrandVoiceRequest):
    """
    Generate a brand voice system prompt from selected personality traits
    and optional advanced brand context
    """
    print(f"[generate-brand-voice] Received request with traits: {request.traits}")
    print(f"[generate-brand-voice] Has advanced data: {request.advanced_data is not None}")

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

        # Build context from advanced data if present
        advanced_context = ""
        if request.advanced_data:
            advanced_context = build_advanced_prompt_context(request.advanced_data)

        if advanced_context:
            # Advanced mode: use all the brand context
            generation_prompt = f"""Create a comprehensive brand voice system prompt (3-4 paragraphs) for an AI assistant based on the following brand information:

PERSONALITY TRAITS:
{chr(10).join(f'- {text}' for text in trait_texts)}

{advanced_context}

The brand voice prompt should:
1. Be written as direct instructions for an AI assistant
2. Seamlessly blend the personality traits with the brand's specific context
3. Include specific guidance on tone, language style, vocabulary choices, and approach
4. Reference the brand's values, target audience, and unique positioning
5. Be practical and immediately actionable
6. Respect any messaging restrictions mentioned

Output ONLY the system prompt text, no explanations or meta-commentary."""
        else:
            # Simple mode: just traits
            generation_prompt = f"""Create a concise system prompt instruction (2-3 paragraphs) that defines a brand voice with these characteristics:

{chr(10).join(f'- {text}' for text in trait_texts)}

The prompt should:
1. Be written as instructions for an AI assistant
2. Be natural and not sound like a list
3. Include specific guidance on tone, language style, and approach
4. Be practical and actionable

Output ONLY the system prompt text, no explanations or meta-commentary."""

        print(f"[generate-brand-voice] Calling OpenRouter API...")

        # Use more tokens for advanced mode
        max_tokens = 800 if request.advanced_data else 500

        response = client.chat.completions.create(
            model="anthropic/claude-haiku-4.5",
            messages=[{"role": "user", "content": generation_prompt}],
            temperature=0.7,
            max_tokens=max_tokens
        )

        generated_prompt = response.choices[0].message.content.strip()
        print(f"[generate-brand-voice] Success! Generated prompt length: {len(generated_prompt)}")

        return {"prompt": generated_prompt}

    except Exception as e:
        print(f"[generate-brand-voice] ERROR: {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate: {str(e)}")
