export const PERSONALITY_TRAITS = [
  { id: 'cheerful', label: 'Cheerful', description: 'Upbeat and positive tone' },
  { id: 'agreeable', label: 'Agreeable', description: 'Accommodating and supportive' },
  { id: 'social', label: 'Social', description: 'Conversational and engaging' },
  { id: 'gen_z', label: 'Gen Z Style', description: 'Casual, trendy language' },
  { id: 'funny', label: 'Funny', description: 'Uses humor and wit' },
  { id: 'realistic', label: 'Realistic', description: 'Honest and practical' },
  { id: 'formal', label: 'Formal', description: 'Professional and polished' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and caring' },
  { id: 'concise', label: 'Concise', description: 'Brief and to-the-point' },
  { id: 'detailed', label: 'Detailed', description: 'Thorough explanations' },
] as const

export type PersonalityTraitId = typeof PERSONALITY_TRAITS[number]['id']

// Voice Dimensions - "This vs That" spectrums
export type VoiceDimensionChoice = 'a' | 'b' | 'neither'

export interface VoiceDimension {
  id: string
  labelA: string
  labelB: string
  descriptionA: string
  descriptionB: string
}

export const VOICE_DIMENSIONS: VoiceDimension[] = [
  { id: 'casualVsFormal', labelA: 'Casual', labelB: 'Formal', descriptionA: 'Relaxed, conversational', descriptionB: 'Professional, polished' },
  { id: 'playfulVsSerious', labelA: 'Playful', labelB: 'Serious', descriptionA: 'Light-hearted, fun', descriptionB: 'Straightforward, earnest' },
  { id: 'polishedVsGritty', labelA: 'Polished', labelB: 'Gritty', descriptionA: 'Refined, elegant', descriptionB: 'Raw, authentic' },
  { id: 'warmVsCool', labelA: 'Warm', labelB: 'Cool', descriptionA: 'Friendly, approachable', descriptionB: 'Confident, composed' },
  { id: 'classicVsTrendy', labelA: 'Classic', labelB: 'Trendy', descriptionA: 'Timeless, traditional', descriptionB: 'Modern, current' },
  { id: 'expertVsInsider', labelA: 'Expert', labelB: 'Insider', descriptionA: 'Authoritative, knowledgeable', descriptionB: 'Relatable, peer-like' },
  { id: 'laidbackVsBold', labelA: 'Laid-back', labelB: 'Bold', descriptionA: 'Calm, understated', descriptionB: 'Assertive, confident' },
]

// Business categories
export const BUSINESS_CATEGORIES = [
  'Technology/SaaS',
  'E-commerce/Retail',
  'Healthcare',
  'Finance',
  'Food & Beverage',
  'Professional Services',
  'Education',
  'Entertainment',
  'Other',
] as const

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number]

// Quick-select presets
export const LOCATION_PRESETS = ['USA', 'Global', 'Europe', 'Asia-Pacific'] as const

export const CUSTOMER_TYPE_PRESETS = ['B2B', 'B2C', 'Enterprise', 'SMB', 'Startups'] as const

export const BRAND_PILLAR_PRESETS = [
  'Quality', 'Innovation', 'Trust', 'Speed', 'Simplicity',
  'Customer-First', 'Transparency', 'Excellence'
] as const

export const VOICE_STYLE_PRESETS = [
  { label: 'Professional', value: 'Professional but approachable' },
  { label: 'Friendly', value: 'Friendly and casual' },
  { label: 'Expert', value: 'Expert and authoritative' },
  { label: 'Warm', value: 'Warm and empathetic' },
  { label: 'Bold', value: 'Bold and confident' },
] as const

// Advanced mode interfaces
export interface BusinessInfo {
  businessName?: string
  websiteUrl?: string
  businessDescription?: string
  primaryCategory?: BusinessCategory
  locations?: string
  idealCustomer?: string
}

export interface BrandIdentity {
  brandPillars?: string[]
  voiceDescription?: string
  differentiators?: string
  pastCampaigns?: string
  messagingRestrictions?: string
}

export interface VoiceDimensionValues {
  casualVsFormal?: VoiceDimensionChoice
  playfulVsSerious?: VoiceDimensionChoice
  polishedVsGritty?: VoiceDimensionChoice
  warmVsCool?: VoiceDimensionChoice
  classicVsTrendy?: VoiceDimensionChoice
  expertVsInsider?: VoiceDimensionChoice
  laidbackVsBold?: VoiceDimensionChoice
  dimensionNotes?: Record<string, string>
}

export interface WebsiteAnalysis {
  title?: string
  description?: string
  content?: string
  analyzedAt?: string
  error?: string
}

export interface BrandVoiceAdvanced {
  businessInfo?: BusinessInfo
  brandIdentity?: BrandIdentity
  voiceDimensions?: VoiceDimensionValues
  websiteAnalysis?: WebsiteAnalysis
}

export interface BrandVoiceTraits {
  selectedTraits: PersonalityTraitId[]
  customNotes?: string
  advanced?: BrandVoiceAdvanced
}

export interface BrandVoice {
  id: string
  account_id: string
  name: string
  prompt: string
  brand_voice_traits: BrandVoiceTraits | null
  is_brand_voice: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
