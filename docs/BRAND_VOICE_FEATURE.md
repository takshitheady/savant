# Brand Voice Feature - Complete Documentation

## Document Info
- **Version**: 1.0
- **Last Updated**: January 2026
- **Status**: Production

---

## Table of Contents
1. [Feature Overview](#1-feature-overview)
2. [Architecture](#2-architecture)
3. [Simple Mode](#3-simple-mode)
4. [Advanced Mode](#4-advanced-mode)
5. [Technical Implementation](#5-technical-implementation)
6. [API Reference](#6-api-reference)
7. [User Flow](#7-user-flow)
8. [Examples](#8-examples)
9. [Error Handling](#9-error-handling)
10. [Testing](#10-testing)

---

## 1. Feature Overview

### What is Brand Voice?

Brand Voice allows users to define their brand's personality and communication style, ensuring consistent messaging across all Savants (AI assistants) in their account. The generated brand voice becomes a system prompt that automatically applies to all conversations.

### Why It Matters

- **Consistency**: All Savants speak with the same brand personality
- **Time Savings**: No need to manually write system prompts
- **AI-Powered**: Uses Claude Haiku 4.5 to generate natural, cohesive brand voice instructions
- **Flexible**: Choose between simple trait-based or advanced comprehensive modes

### Key Features

✅ **Two Modes**:
- **Simple**: Quick trait selection with AI prompt generation
- **Advanced**: Comprehensive brand context with website analysis

✅ **10 Personality Traits**:
Cheerful, Agreeable, Social, Gen Z, Funny, Realistic, Formal, Empathetic, Concise, Detailed

✅ **Advanced Options**:
- Business Information with quick-select presets
- Website Analysis (auto-extract business data with Firecrawl + AI)
- Brand Identity (pillars, differentiators, restrictions)
- Voice Dimensions (7 "This vs That" spectrums)

✅ **Onboarding Integration**:
Tour step highlights advanced features for new users

---

## 2. Architecture

### System Flow

```
┌────────────┐         ┌────────────┐         ┌────────────┐
│  Frontend  │ ──────► │  Backend   │ ──────► │ OpenRouter │
│  (Next.js) │         │  (FastAPI) │         │  (Claude)  │
└────────────┘         └────────────┘         └────────────┘
      │                       │
      │                       │
      ▼                       ▼
┌────────────┐         ┌────────────┐
│  Supabase  │         │ Firecrawl  │
│ (Database) │         │   (Opt.)   │
└────────────┘         └────────────┘
```

### Data Flow - Simple Mode

```
1. User selects personality traits
2. Click "Generate Brand Voice"
3. Frontend → Server Action → Backend API
4. Backend calls Claude Haiku via OpenRouter
5. AI generates system prompt from traits
6. Prompt returned to frontend
7. User saves → Stored in account_prompts table
```

### Data Flow - Advanced Mode

```
1. User fills advanced sections (optional)
2. (Optional) Enter website URL → Click "Analyze"
   a. Backend calls Firecrawl API to scrape website
   b. Backend uses Claude to extract business info
   c. Auto-fills form fields
3. Click "Generate Brand Voice"
4. Backend combines traits + advanced context
5. Claude generates comprehensive brand voice
6. Full data saved to account_prompts.brand_voice_traits (JSONB)
```

### Component Structure

```
frontend/src/components/brand-voice/
├── brand-voice-form.tsx          # Main container
├── trait-selector.tsx            # Simple mode: trait chips
├── advanced-section.tsx          # Expandable advanced wrapper
├── business-info-form.tsx        # Business details + website analysis
├── brand-identity-form.tsx       # Brand pillars + restrictions
└── voice-dimensions.tsx          # "This vs That" sliders

frontend/src/actions/
└── brand-voice.ts                # Server actions (API calls)

backend/app/routes/
└── brand_voice.py                # API endpoints
```

---

## 3. Simple Mode

### Overview
Quick brand voice generation using personality trait selection.

### Features

**10 Personality Traits:**

| Trait | Description |
|-------|-------------|
| **Cheerful** | Upbeat and positive tone |
| **Agreeable** | Accommodating and supportive |
| **Social** | Conversational and engaging |
| **Gen Z Style** | Casual, trendy language |
| **Funny** | Uses humor and wit |
| **Realistic** | Honest and practical |
| **Formal** | Professional and polished |
| **Empathetic** | Understanding and caring |
| **Concise** | Brief and to-the-point |
| **Detailed** | Thorough explanations |

### Usage Flow

1. Navigate to `/prompts` (Brand Voice page)
2. Select 2-5 personality traits
3. (Optional) Add custom notes
4. Click "Generate Brand Voice"
5. AI generates system prompt (2-3 paragraphs)
6. Review and save

### Backend Prompt Template (Simple Mode)

```python
generation_prompt = f"""Create a concise system prompt instruction (2-3 paragraphs) that defines a brand voice with these characteristics:

- maintains an upbeat, positive, and enthusiastic tone
- is conversational, engaging, and builds rapport
- shows understanding and emotional awareness

The prompt should:
1. Be written as instructions for an AI assistant
2. Be natural and not sound like a list
3. Include specific guidance on tone, language style, and approach
4. Be practical and actionable

Output ONLY the system prompt text, no explanations or meta-commentary."""
```

### Example Output

**Input Traits**: Cheerful, Empathetic, Social

**Generated Prompt**:
```
You are a warm, supportive assistant who brightens every conversation. Your communication
style is upbeat and positive, approaching every interaction with genuine enthusiasm and
care for the person you're helping. You naturally build rapport through conversational
language that feels like talking with a thoughtful friend.

When responding, lead with empathy and understanding. Acknowledge the user's feelings
and perspectives before offering solutions. Your tone should feel authentic and human,
using natural expressions and appropriate encouragement without being overly effusive.

Keep conversations engaging by asking thoughtful follow-up questions and showing real
interest in helping. Your goal is to make users feel heard, supported, and optimistic
about moving forward with their tasks.
```

---

## 4. Advanced Mode

### Overview
Comprehensive brand voice generation using detailed business context, brand identity, and voice preferences.

### 4.1 Business Information Section

**Fields:**

| Field | Type | Features |
|-------|------|----------|
| **Business Name** | Text | Auto-filled from website analysis |
| **Website URL** | URL | Triggers website analysis |
| **Business Description** | Textarea | Auto-filled with AI extraction |
| **Primary Category** | Dropdown | 9 categories, auto-detected |
| **Locations** | Text | Quick-select presets: USA, Global, Europe, Asia-Pacific |
| **Ideal Customer** | Text | Quick-select presets: B2B, B2C, Enterprise, SMB, Startups |

**Website Analysis Feature:**

```
┌─────────────────────────────────────────────────────────┐
│ Website URL                                              │
│ [https://example.com_______________] [🌐 Analyze]        │
│                                                          │
│ ✓ Website analyzed! Auto-filled 4 fields below.         │
└─────────────────────────────────────────────────────────┘
```

**How It Works:**
1. User enters website URL
2. Click "Analyze" button (shows loading spinner)
3. Backend calls Firecrawl API to scrape website (markdown format)
4. Backend uses Claude Haiku to extract structured data:
   - Business name
   - Business description (2-3 sentences)
   - Primary category (matched to dropdown)
   - Target audience
   - Services offered
   - Tone hints
5. Auto-fills form fields with extracted data

**Supported Categories:**
- Technology/SaaS
- E-commerce/Retail
- Healthcare
- Finance
- Food & Beverage
- Professional Services
- Education
- Entertainment
- Other

### 4.2 Brand Identity Section

**Fields:**

| Field | Description | Presets |
|-------|-------------|---------|
| **Brand Pillars** | Core values (multi-select) | Quality, Innovation, Trust, Speed, Simplicity, Customer-First, Transparency, Excellence |
| **Voice Description** | How you want to sound | Professional, Friendly, Expert, Warm, Bold |
| **Differentiators** | What makes you unique | Free text |
| **Past Campaigns** | Learnings from previous messaging | Free text |
| **Messaging Restrictions** | Words/phrases to avoid | Free text |

**Quick-Select Presets:**

```tsx
// Voice Description Presets
{ label: 'Professional', value: 'Professional but approachable' }
{ label: 'Friendly', value: 'Friendly and casual' }
{ label: 'Expert', value: 'Expert and authoritative' }
{ label: 'Warm', value: 'Warm and empathetic' }
{ label: 'Bold', value: 'Bold and confident' }
```

### 4.3 Voice Dimensions Section

**7 "This vs That" Spectrums:**

| Dimension | Option A | Option B | Neither |
|-----------|----------|----------|---------|
| **Tone** | Casual & relaxed | Formal & professional | ✓ |
| **Style** | Playful & light-hearted | Serious & straightforward | ✓ |
| **Polish** | Polished & refined | Gritty & authentic | ✓ |
| **Warmth** | Warm & friendly | Cool & composed | ✓ |
| **Era** | Classic & timeless | Trendy & modern | ✓ |
| **Authority** | Expert & authoritative | Insider & peer-like | ✓ |
| **Energy** | Laid-back & understated | Bold & assertive | ✓ |

**Features:**
- Radio button selection (A, B, or Neither)
- Optional notes field for each dimension
- Visual clarity with spectrum labels

### Backend Prompt Template (Advanced Mode)

```python
generation_prompt = f"""Create a comprehensive brand voice system prompt (3-4 paragraphs) for an AI assistant based on the following brand information:

PERSONALITY TRAITS:
- maintains an upbeat, positive, and enthusiastic tone
- is conversational, engaging, and builds rapport

BUSINESS CONTEXT:
Business: Acme SaaS Inc.
Description: Enterprise project management platform for distributed teams
Industry: Technology/SaaS
Locations: Global
Target audience: Engineering teams at Series B+ startups

BRAND IDENTITY:
Core values: Innovation, Speed, Simplicity
Desired voice: Professional but approachable
Differentiators: Real-time collaboration, AI-powered insights
Restrictions: Avoid overly technical jargon, don't use "disruptive"

VOICE STYLE:
- warm and friendly
- trendy and modern
- expert and authoritative

The brand voice prompt should:
1. Be written as direct instructions for an AI assistant
2. Seamlessly blend the personality traits with the brand's specific context
3. Include specific guidance on tone, language style, vocabulary choices, and approach
4. Reference the brand's values, target audience, and unique positioning
5. Be practical and immediately actionable
6. Respect any messaging restrictions mentioned

Output ONLY the system prompt text, no explanations or meta-commentary."""
```

---

## 5. Technical Implementation

### 5.1 Frontend Components

**Main Form Component:**

```typescript
// frontend/src/components/brand-voice/brand-voice-form.tsx

export function BrandVoiceForm() {
  const [selectedTraits, setSelectedTraits] = useState<PersonalityTraitId[]>([])
  const [advancedData, setAdvancedData] = useState<BrandVoiceAdvanced>({})
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    const result = await generateBrandVoicePrompt(selectedTraits, advancedData)
    if (result.success) {
      setGeneratedPrompt(result.prompt)
    }
    setIsGenerating(false)
  }

  // ... render TraitSelector and AdvancedSection
}
```

**Website Analysis Component:**

```typescript
// frontend/src/components/brand-voice/business-info-form.tsx

const handleAnalyzeWebsite = async () => {
  setIsAnalyzing(true)
  const result = await analyzeWebsite(values.websiteUrl)

  if (result.success) {
    // Auto-fill from AI-extracted data
    const extracted = result.extracted || {}
    onChange({
      ...values,
      businessName: extracted.businessName || result.title,
      businessDescription: extracted.businessDescription || result.description,
      primaryCategory: matchCategory(extracted.primaryCategory),
      idealCustomer: extracted.targetAudience
    })
  }
  setIsAnalyzing(false)
}
```

### 5.2 Type Definitions

```typescript
// frontend/src/types/brand-voice.ts

export interface BrandVoiceTraits {
  selectedTraits: PersonalityTraitId[]
  customNotes?: string
  advanced?: BrandVoiceAdvanced
}

export interface BrandVoiceAdvanced {
  businessInfo?: BusinessInfo
  brandIdentity?: BrandIdentity
  voiceDimensions?: VoiceDimensionValues
  websiteAnalysis?: WebsiteAnalysis
}

export interface BusinessInfo {
  businessName?: string
  websiteUrl?: string
  businessDescription?: string
  primaryCategory?: BusinessCategory
  locations?: string
  idealCustomer?: string
}

export interface WebsiteAnalysis {
  title?: string
  description?: string
  content?: string
  analyzedAt?: string
  error?: string
}
```

### 5.3 Backend API

**Endpoint 1: Generate Brand Voice**

```python
# backend/app/routes/brand_voice.py

@router.post("/generate-brand-voice")
async def generate_brand_voice(request: GenerateBrandVoiceRequest):
    """
    Generate a brand voice system prompt from selected personality traits
    and optional advanced brand context
    """
    # Build trait descriptions
    trait_texts = [TRAIT_DESCRIPTIONS[trait] for trait in request.traits]

    # Build advanced context if present
    advanced_context = ""
    if request.advanced_data:
        advanced_context = build_advanced_prompt_context(request.advanced_data)

    # Call Claude via OpenRouter
    client = OpenAI(
        api_key=os.getenv("OPENROUTER_API_KEY"),
        base_url="https://openrouter.ai/api/v1"
    )

    response = client.chat.completions.create(
        model="anthropic/claude-haiku-4.5",
        messages=[{"role": "user", "content": generation_prompt}],
        temperature=0.7,
        max_tokens=800 if request.advanced_data else 500
    )

    return {"prompt": response.choices[0].message.content.strip()}
```

**Endpoint 2: Analyze Website**

```python
@router.post("/analyze-website")
async def analyze_website(request: AnalyzeWebsiteRequest):
    """
    Analyze website content using Firecrawl API + AI extraction
    """
    # Step 1: Scrape website with Firecrawl
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={"Authorization": f"Bearer {firecrawl_key}"},
            json={
                "url": request.url,
                "formats": ["markdown"],
                "onlyMainContent": True
            }
        )

    # Step 2: Extract structured data with AI
    markdown = response.json().get("data", {}).get("markdown", "")
    extracted = await extract_business_info(markdown)

    return {
        "success": True,
        "title": metadata.get("title"),
        "description": metadata.get("description"),
        "extracted": extracted
    }
```

**AI Extraction Function:**

```python
async def extract_business_info(content: str) -> dict:
    """Use AI to extract structured business information from website content"""
    extraction_prompt = f"""Analyze this website content and extract business information. Return ONLY valid JSON:

{{
  "businessName": "company/brand name",
  "businessDescription": "2-3 sentence description",
  "primaryCategory": "one of: Technology/SaaS, E-commerce/Retail, ...",
  "targetAudience": "who they serve",
  "services": "main products/services",
  "toneHints": "communication style"
}}

Website content:
{content[:4000]}

Return ONLY the JSON object."""

    response = client.chat.completions.create(
        model="anthropic/claude-haiku-4.5",
        messages=[{"role": "user", "content": extraction_prompt}],
        temperature=0.3,
        max_tokens=500
    )

    # Parse JSON response
    result_text = response.choices[0].message.content.strip()
    return json.loads(result_text)
```

### 5.4 Database Schema

**Storage Location:** `account_prompts` table

**Fields:**
```sql
CREATE TABLE account_prompts (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts(id),
  name TEXT DEFAULT 'Brand Voice',
  prompt TEXT NOT NULL,  -- Generated system prompt
  brand_voice_traits JSONB,  -- All trait data
  is_brand_voice BOOLEAN DEFAULT FALSE,  -- Flag for brand voice
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 100,
  applies_to_all BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**JSONB Structure:**
```json
{
  "selectedTraits": ["cheerful", "empathetic", "social"],
  "customNotes": "Always mention our 24/7 support",
  "advanced": {
    "businessInfo": {
      "businessName": "Acme Inc",
      "websiteUrl": "https://acme.com",
      "businessDescription": "...",
      "primaryCategory": "Technology/SaaS",
      "locations": "Global",
      "idealCustomer": "Enterprise teams"
    },
    "brandIdentity": {
      "brandPillars": ["Innovation", "Speed", "Trust"],
      "voiceDescription": "Professional but approachable",
      "differentiators": "...",
      "messagingRestrictions": "..."
    },
    "voiceDimensions": {
      "casualVsFormal": "b",
      "warmVsCool": "a",
      "dimensionNotes": {
        "casualVsFormal": "Professional in sales, casual in support"
      }
    },
    "websiteAnalysis": {
      "title": "Acme - Project Management",
      "description": "...",
      "content": "...",
      "analyzedAt": "2026-01-15T10:30:00Z"
    }
  }
}
```

### 5.5 Environment Variables

**Backend (.env):**
```env
OPENROUTER_API_KEY=sk-or-xxx        # Required
FIRECRAWL_API_KEY=fc-xxx            # Optional (for website analysis)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
```

**Frontend (.env.local):**
```env
AGNO_API_URL=https://backend.railway.app  # Backend URL
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

---

## 6. API Reference

### POST /api/generate-brand-voice

**Description:** Generate brand voice system prompt from traits and advanced context

**Request Body:**
```json
{
  "traits": ["cheerful", "empathetic"],
  "advanced_data": {
    "businessInfo": {
      "businessName": "Acme Inc",
      "businessDescription": "...",
      "primaryCategory": "Technology/SaaS",
      "idealCustomer": "Engineering teams"
    },
    "brandIdentity": {
      "brandPillars": ["Innovation", "Speed"],
      "voiceDescription": "Professional but approachable"
    },
    "voiceDimensions": {
      "casualVsFormal": "b",
      "warmVsCool": "a"
    }
  }
}
```

**Response (Success):**
```json
{
  "prompt": "You are a warm, professional assistant representing Acme Inc..."
}
```

**Response (Error):**
```json
{
  "detail": "OPENROUTER_API_KEY not configured"
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: API key missing or AI generation failed

---

### POST /api/analyze-website

**Description:** Scrape website and extract structured business information

**Request Body:**
```json
{
  "url": "https://example.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "title": "Example Company - Homepage",
  "description": "We help businesses grow",
  "content": "# About Us\n\nExample Company...",
  "extracted": {
    "businessName": "Example Company",
    "businessDescription": "Example Company provides innovative solutions...",
    "primaryCategory": "Technology/SaaS",
    "targetAudience": "Small and medium businesses",
    "services": "CRM, Marketing automation, Analytics",
    "toneHints": "Professional, friendly, solution-oriented"
  }
}
```

**Response (Firecrawl 402 - Credits Exhausted):**
```json
{
  "success": false,
  "error": "credits_exhausted",
  "message": "Firecrawl credits exhausted. Website analysis is optional - skip this step to continue."
}
```

**Response (Other Error):**
```json
{
  "success": false,
  "error": "timeout",
  "message": "Website took too long to respond"
}
```

**Status Codes:**
- `200 OK`: Always returns 200, check `success` field
- Error details in response body

**Error Codes:**
- `credits_exhausted`: Firecrawl free tier limit reached
- `timeout`: Website didn't respond in time
- `api_error`: Firecrawl API returned non-200 status
- `unknown`: Unexpected error

---

## 7. User Flow

### Simple Mode Flow

```
1. User lands on /prompts
   ↓
2. See personality trait chips
   ↓
3. Select 2-3 traits (click to toggle)
   ↓
4. (Optional) Add custom notes
   ↓
5. Click "Generate Brand Voice"
   ↓
6. Loading spinner (3-5 seconds)
   ↓
7. AI-generated prompt appears in text area
   ↓
8. Review and edit if needed
   ↓
9. Click "Save Brand Voice"
   ↓
10. Success! Brand voice active for all Savants
```

### Advanced Mode Flow

```
1. User lands on /prompts
   ↓
2. Select personality traits
   ↓
3. Click "Advanced Options" to expand
   ↓
4. Choose section: Business / Identity / Dimensions
   ↓
5. BUSINESS INFO PATH:
   a. Enter website URL
   b. Click "Analyze" button
   c. Wait for scraping + AI extraction (5-10 sec)
   d. Form fields auto-fill
   e. Review and adjust
   ↓
6. BRAND IDENTITY PATH:
   a. Select brand pillars from presets
   b. Choose voice style preset
   c. Add differentiators, restrictions
   ↓
7. VOICE DIMENSIONS PATH:
   a. For each spectrum, choose A, B, or Neither
   b. Add optional notes
   ↓
8. Click "Generate Brand Voice"
   ↓
9. AI generates comprehensive prompt (5-8 sec)
   ↓
10. Review generated prompt
   ↓
11. Save → All data stored in JSONB
```

### Onboarding Tour Integration

```
Tour Step 5: "Your Brand Voice"
- Target: [data-tour="sidebar-voice"]
- Explains brand voice concept
- Points to Brand Voice menu item

Tour Step 6: "Advanced Brand Options"
- Target: [data-tour="advanced-brand-voice"]
- Highlights advanced section
- Mentions website analysis feature
- Content: "Want richer results? Add your business details, brand pillars,
  and voice style. You can even paste your website URL to auto-fill information!"
```

---

## 8. Examples

### Example 1: Simple Mode - Friendly Support Bot

**Input:**
- Traits: Cheerful, Empathetic, Concise
- Custom Notes: "Mention our 24/7 support availability"

**Generated Prompt:**
```
You are a warm, supportive assistant who approaches every interaction with genuine
care and enthusiasm. Your primary goal is to help users quickly and efficiently
while making them feel heard and valued. Always remind users that our support team
is available 24/7 if they need additional help.

Keep your responses brief and actionable, getting straight to the point while
maintaining a friendly, upbeat tone. Show empathy by acknowledging the user's
situation before jumping into solutions. Use conversational language that feels
like talking to a helpful friend who's genuinely invested in solving their problem.

When appropriate, use encouraging language and celebrate small wins with users.
Your efficiency should never come at the cost of warmth - balance being concise
with being genuinely helpful and caring.
```

---

### Example 2: Advanced Mode - Enterprise SaaS

**Input:**

**Traits:** Formal, Detailed, Realistic

**Business Info:**
- Name: DataFlow Analytics
- Category: Technology/SaaS
- Description: Enterprise data analytics platform for Fortune 500 companies
- Ideal Customer: Data teams at large enterprises
- Locations: North America, Europe

**Brand Identity:**
- Pillars: Trust, Accuracy, Excellence
- Voice: Expert and authoritative
- Differentiators: SOC 2 compliance, 99.99% uptime, white-glove onboarding
- Restrictions: Never oversimplify technical concepts, avoid casual language

**Voice Dimensions:**
- Casual vs Formal: Formal
- Classic vs Trendy: Classic
- Expert vs Insider: Expert

**Generated Prompt:**
```
You are the voice of DataFlow Analytics, an enterprise-grade data analytics platform
trusted by Fortune 500 companies worldwide. Your communication reflects the gravitas
and precision expected in enterprise software, maintaining a consistently professional,
authoritative tone that underscores our commitment to trust, accuracy, and excellence.

When responding, provide comprehensive, technically accurate information without
oversimplifying. Your audience consists of sophisticated data professionals and
enterprise decision-makers who value depth and precision. Reference our key
differentiators when relevant: our SOC 2 compliance, industry-leading 99.99% uptime
SLA, and white-glove onboarding process. Set clear, realistic expectations rather
than making ambitious promises.

Maintain a formal, classic communication style befitting an expert in the enterprise
data space. Your responses should feel authoritative and knowledgeable, positioning
DataFlow as the trusted advisor for complex data analytics challenges. Use industry-
standard terminology appropriately, and when explaining concepts, ensure thoroughness
without condescension. Every interaction should reinforce our reputation for reliability
and technical excellence.
```

---

### Example 3: Advanced Mode with Website Analysis

**Flow:**

1. User enters: `https://useheady.com`
2. Clicks "Analyze"
3. Firecrawl scrapes website
4. AI extracts:
   ```json
   {
     "businessName": "Heady",
     "businessDescription": "Heady is a digital marketing agency specializing in cannabis brands, offering SEO, social media management, and compliant content marketing.",
     "primaryCategory": "Professional Services",
     "targetAudience": "Cannabis brands and dispensaries",
     "services": "SEO, social media, content marketing, brand strategy",
     "toneHints": "Professional yet approachable, industry-savvy"
   }
   ```
5. Form auto-fills with extracted data
6. User adds:
   - Traits: Social, Realistic, Empathetic
   - Brand Pillars: Transparency, Expertise
   - Voice: Warm and empathetic + expert and authoritative
7. Generates comprehensive brand voice incorporating all context

---

## 9. Error Handling

### Frontend Errors

**Website Analysis Failure:**
```tsx
if (result.success === false) {
  if (result.error === 'credits_exhausted') {
    // Show amber/warning message (not error red)
    showWarning("Website analysis unavailable (Firecrawl credits exhausted). You can skip this step.")
  } else {
    showError(result.message || "Failed to analyze website")
  }
}
```

**Generation Failure:**
```tsx
try {
  const result = await generateBrandVoicePrompt(traits, advancedData)
  if (!result.success) {
    showError("Failed to generate brand voice. Please try again.")
  }
} catch (error) {
  showError("Network error. Check your connection.")
}
```

### Backend Errors

**Missing API Key:**
```python
if not api_key:
    raise HTTPException(
        status_code=500,
        detail="OPENROUTER_API_KEY not configured"
    )
```

**Firecrawl 402 (Credits Exhausted):**
```python
if response.status_code == 402:
    return {
        "success": False,
        "error": "credits_exhausted",
        "message": "Firecrawl credits exhausted. Website analysis is optional - skip this step to continue."
    }
```

**AI Generation Timeout:**
```python
try:
    response = client.chat.completions.create(...)
except OpenAIError as e:
    raise HTTPException(
        status_code=500,
        detail=f"AI generation failed: {str(e)}"
    )
```

### Error Messages - User-Facing

| Error | User Message | Action |
|-------|-------------|--------|
| No traits selected | "Please select at least one personality trait" | Disable generate button |
| API key missing | "Brand voice generation not configured. Contact support." | Show in alert |
| Firecrawl 402 | "Website analysis unavailable (credits exhausted). Skip this step to continue." | Amber warning, allow proceeding |
| Network error | "Failed to connect. Check your internet connection." | Show retry button |
| AI timeout | "Generation taking longer than expected. Please try again." | Show retry button |

---

## 10. Testing

### Manual Testing Checklist

**Simple Mode:**
- [ ] Select traits and generate prompt
- [ ] Add custom notes and verify they influence output
- [ ] Save brand voice and verify database storage
- [ ] Reload page and confirm data persists
- [ ] Toggle brand voice active/inactive
- [ ] Verify brand voice applies to new Savant conversations

**Advanced Mode - Business Info:**
- [ ] Enter website URL and click "Analyze"
- [ ] Verify loading state shows
- [ ] Confirm auto-fill of business name, description, category, customer
- [ ] Test with invalid URL (should show error)
- [ ] Test with Firecrawl credits exhausted (402 error)
- [ ] Verify quick-select presets work (locations, customer types)

**Advanced Mode - Brand Identity:**
- [ ] Select brand pillars from presets
- [ ] Add custom brand pillar
- [ ] Select voice style preset
- [ ] Add differentiators and restrictions
- [ ] Verify all data saves and persists

**Advanced Mode - Voice Dimensions:**
- [ ] Select A/B/Neither for each spectrum
- [ ] Add notes to dimensions
- [ ] Verify selections persist on reload
- [ ] Generate and verify dimensions influence output

**Onboarding:**
- [ ] Start onboarding tour
- [ ] Verify brand voice tour step appears
- [ ] Verify advanced section tour step appears
- [ ] Confirm spotlight highlights correct elements

**Error Scenarios:**
- [ ] Generate with no traits selected
- [ ] Analyze website with no URL
- [ ] Analyze with invalid URL format
- [ ] Test with OPENROUTER_API_KEY unset
- [ ] Test with FIRECRAWL_API_KEY unset
- [ ] Test with slow/timeout website

### API Testing

**Generate Brand Voice - Simple:**
```bash
curl -X POST http://localhost:8000/api/generate-brand-voice \
  -H "Content-Type: application/json" \
  -d '{
    "traits": ["cheerful", "empathetic", "social"]
  }'
```

**Generate Brand Voice - Advanced:**
```bash
curl -X POST http://localhost:8000/api/generate-brand-voice \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "traits": ["formal", "detailed"],
  "advanced_data": {
    "businessInfo": {
      "businessName": "Test Corp",
      "primaryCategory": "Technology/SaaS",
      "idealCustomer": "Enterprise teams"
    },
    "brandIdentity": {
      "brandPillars": ["Trust", "Innovation"]
    }
  }
}
EOF
```

**Analyze Website:**
```bash
curl -X POST http://localhost:8000/api/analyze-website \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com"
  }'
```

### Performance Benchmarks

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Generate (simple) | 3-5 seconds | Claude Haiku via OpenRouter |
| Generate (advanced) | 5-8 seconds | More context, more tokens |
| Website analysis | 5-15 seconds | Firecrawl scrape + AI extraction |
| Save brand voice | <500ms | Database write |
| Load brand voice | <200ms | Database read |

---

## Appendix A: Model Selection

### Why Claude Haiku 4.5?

| Model | Speed | Cost | Quality | Our Choice |
|-------|-------|------|---------|------------|
| GPT-4o | Medium | High | Excellent | ❌ Too slow/expensive |
| GPT-4o-mini | Fast | Low | Good | ❌ Quality concerns |
| **Claude Haiku 4.5** | **Fast** | **Low** | **Excellent** | **✅ Perfect balance** |
| Claude Sonnet 4.5 | Slow | Medium | Excellent | ❌ Overkill for this task |

**Decision Factors:**
- **Speed**: Haiku generates prompts in 2-4 seconds
- **Quality**: Excellent at following instructions and creating natural prose
- **Cost**: ~1¢ per generation (vs 3¢ for Sonnet)
- **Reliability**: Consistent JSON output for extraction tasks

### Why OpenRouter?

- **Multi-model support**: Easy to switch models if needed
- **Cost tracking**: Built-in usage monitoring
- **Reliability**: Enterprise-grade infrastructure
- **Fallbacks**: Automatic model fallbacks on errors

---

## Appendix B: Firecrawl Integration

### What is Firecrawl?

Firecrawl is a web scraping API that converts websites to clean markdown.

**Features Used:**
- Main content extraction (removes nav, footer, ads)
- Markdown output (easy to parse)
- Metadata extraction (title, description)

### Free Tier Limits

- **500 credits/month**
- **1 credit per scrape**
- **Resets monthly**

**When Credits Exhausted:**
- Returns 402 status code
- We show amber warning (not error)
- User can skip website analysis
- Rest of brand voice feature works normally

### Alternative Solutions

If Firecrawl is unavailable:
1. Manual entry (all fields remain editable)
2. Simpler scraping (BeautifulSoup, Playwright)
3. Different service (Jina AI, ScrapeNinja)

---

## Appendix C: Future Enhancements

### Planned Features

1. **Multi-language Support**
   - Generate brand voice in different languages
   - Language-specific personality trait interpretations

2. **Brand Voice Templates**
   - Pre-built templates for common industries
   - "Copy From" feature to duplicate between accounts

3. **A/B Testing**
   - Multiple brand voices per account
   - Test which performs better in conversations
   - Analytics on user satisfaction

4. **Voice Consistency Score**
   - Analyze Savant responses
   - Score adherence to brand voice
   - Suggest improvements

5. **Import from Existing**
   - Upload brand guidelines PDF
   - AI extracts brand voice automatically
   - Parse tone-of-voice documents

6. **Brand Voice Playground**
   - Test brand voice with sample prompts
   - See how AI responds before saving
   - Compare different trait combinations

---

## Support & Troubleshooting

### Common Issues

**Issue:** "Failed to generate brand voice"
- **Cause:** OPENROUTER_API_KEY not set
- **Fix:** Add API key to backend environment variables

**Issue:** "Website analysis unavailable"
- **Cause:** Firecrawl credits exhausted or API key missing
- **Fix:** Optional feature - proceed without it or wait for monthly reset

**Issue:** Generated prompt doesn't match expectations
- **Cause:** Trait selection doesn't align with desired output
- **Fix:** Try different trait combinations or add custom notes for guidance

**Issue:** Brand voice not applying to Savants
- **Cause:** Brand voice marked as inactive
- **Fix:** Check toggle switch on brand voice page

### Getting Help

- **Documentation**: `/docs/BRAND_VOICE_FEATURE.md` (this file)
- **API Logs**: Check backend logs for detailed error messages
- **Database**: Query `account_prompts` table to verify data storage
- **Support**: Contact Heady team with account ID and error details

---

**End of Documentation**
