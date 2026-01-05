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

export interface BrandVoiceTraits {
  selectedTraits: PersonalityTraitId[]
  customNotes?: string
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
