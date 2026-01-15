'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { BrandVoiceTraits, PersonalityTraitId, BrandVoice, BrandVoiceAdvanced } from '@/types/brand-voice'

// Get the account's brand voice
export async function getBrandVoice(): Promise<{
  success: boolean
  data?: BrandVoice | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminSupabase = createAdminClient()

    // Get user's account
    const { data: accountMember } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!accountMember) {
      return { success: false, error: 'No account found' }
    }

    // Fetch brand voice
    const { data, error } = await adminSupabase
      .from('account_prompts')
      .select('*')
      .eq('account_id', accountMember.account_id)
      .eq('is_brand_voice', true)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      return { success: false, error: error.message }
    }

    return { success: true, data: data as BrandVoice | null }
  } catch (error) {
    console.error('Error in getBrandVoice:', error)
    return { success: false, error: 'Failed to get brand voice' }
  }
}

// Analyze website content using Firecrawl
export async function analyzeWebsite(url: string): Promise<{
  success: boolean
  title?: string
  description?: string
  content?: string
  extracted?: {
    businessName?: string
    businessDescription?: string
    primaryCategory?: string
    targetAudience?: string
    services?: string
    toneHints?: string
  }
  error?: string
}> {
  console.log('[analyzeWebsite] Analyzing URL:', url)

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const backendUrl = process.env.AGNO_API_URL || 'http://localhost:8000'
    const fullUrl = `${backendUrl}/api/analyze-website`

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[analyzeWebsite] Backend error:', errorText)
      return { success: false, error: `Failed to analyze website` }
    }

    const data = await response.json()
    return {
      success: data.success !== false,
      title: data.title,
      description: data.description,
      content: data.content,
      extracted: data.extracted,
      error: data.error
    }
  } catch (error) {
    console.error('[analyzeWebsite] Error:', error)
    return { success: false, error: 'Failed to analyze website' }
  }
}

// Generate brand voice prompt from traits using AI
export async function generateBrandVoicePrompt(
  traits: PersonalityTraitId[],
  advancedData?: BrandVoiceAdvanced
): Promise<{ success: boolean; prompt?: string; error?: string }> {
  console.log('[generateBrandVoicePrompt] Starting with traits:', traits)
  console.log('[generateBrandVoicePrompt] Advanced data:', advancedData ? 'present' : 'none')

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    console.log('[generateBrandVoicePrompt] User:', user ? user.id : 'NOT AUTHENTICATED')

    if (!user) {
      console.log('[generateBrandVoicePrompt] ERROR: Not authenticated')
      return { success: false, error: 'Not authenticated' }
    }

    // Call backend API to generate the prompt
    const backendUrl = process.env.AGNO_API_URL || 'http://localhost:8000'
    const fullUrl = `${backendUrl}/api/generate-brand-voice`

    console.log('[generateBrandVoicePrompt] AGNO_API_URL env:', process.env.AGNO_API_URL)
    console.log('[generateBrandVoicePrompt] Using backend URL:', backendUrl)
    console.log('[generateBrandVoicePrompt] Full URL:', fullUrl)

    const requestBody = {
      traits,
      advanced_data: advancedData
    }
    console.log('[generateBrandVoicePrompt] Request body:', JSON.stringify(requestBody))

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    console.log('[generateBrandVoicePrompt] Response status:', response.status)
    console.log('[generateBrandVoicePrompt] Response ok:', response.ok)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[generateBrandVoicePrompt] Backend error response:', errorText)
      return { success: false, error: `Backend error: ${response.status} - ${errorText}` }
    }

    const data = await response.json()
    console.log('[generateBrandVoicePrompt] Success! Prompt length:', data.prompt?.length)
    return { success: true, prompt: data.prompt }
  } catch (error) {
    console.error('[generateBrandVoicePrompt] CATCH ERROR:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, error: `Network error: ${errorMessage}` }
  }
}

// Save brand voice
export async function saveBrandVoice(
  traits: BrandVoiceTraits,
  prompt: string,
  isActive: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminSupabase = createAdminClient()

    const { data: accountMember } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!accountMember) {
      return { success: false, error: 'No account found' }
    }

    // Check if brand voice already exists for this account
    const { data: existing } = await adminSupabase
      .from('account_prompts')
      .select('id')
      .eq('account_id', accountMember.account_id)
      .eq('is_brand_voice', true)
      .single()

    if (existing) {
      // Update existing brand voice
      const { error } = await adminSupabase
        .from('account_prompts')
        .update({
          name: 'Brand Voice',
          prompt: prompt,
          brand_voice_traits: traits,
          is_active: isActive,
          applies_to_all: true,
          priority: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        return { success: false, error: error.message }
      }
    } else {
      // Insert new brand voice
      const { error } = await adminSupabase
        .from('account_prompts')
        .insert({
          account_id: accountMember.account_id,
          name: 'Brand Voice',
          prompt: prompt,
          brand_voice_traits: traits,
          is_brand_voice: true,
          is_active: isActive,
          applies_to_all: true,
          priority: 100,
        })

      if (error) {
        return { success: false, error: error.message }
      }
    }

    revalidatePath('/prompts')
    return { success: true }
  } catch (error) {
    console.error('Error in saveBrandVoice:', error)
    return { success: false, error: 'Failed to save brand voice' }
  }
}

// Toggle brand voice active status
export async function toggleBrandVoice(
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminSupabase = createAdminClient()

    const { data: accountMember } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!accountMember) {
      return { success: false, error: 'No account found' }
    }

    const { error } = await adminSupabase
      .from('account_prompts')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountMember.account_id)
      .eq('is_brand_voice', true)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/prompts')
    return { success: true }
  } catch (error) {
    console.error('Error in toggleBrandVoice:', error)
    return { success: false, error: 'Failed to toggle brand voice' }
  }
}
