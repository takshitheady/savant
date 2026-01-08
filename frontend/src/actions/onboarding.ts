'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { OnboardingState, MilestoneKey, OnboardingMilestones } from '@/types/onboarding'
import { DEFAULT_ONBOARDING_STATE } from '@/types/onboarding'

// Get the account's onboarding state
export async function getOnboardingState(): Promise<{
  success: boolean
  data?: OnboardingState
  accountId?: string
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

    // Fetch account settings
    const { data: account, error } = await adminSupabase
      .from('accounts')
      .select('settings')
      .eq('id', accountMember.account_id)
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    // Extract onboarding state from settings, or use default
    const settings = account?.settings as Record<string, unknown> || {}
    const onboardingState = settings.onboarding as OnboardingState | undefined

    if (!onboardingState) {
      // First time user - initialize onboarding state
      const initialState: OnboardingState = {
        ...DEFAULT_ONBOARDING_STATE,
        startedAt: new Date().toISOString(),
      }

      // Save initial state
      const { error: updateError } = await adminSupabase
        .from('accounts')
        .update({
          settings: {
            ...settings,
            onboarding: initialState,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountMember.account_id)

      if (updateError) {
        console.error('Failed to initialize onboarding state:', updateError)
      }

      return { success: true, data: initialState, accountId: accountMember.account_id }
    }

    return { success: true, data: onboardingState, accountId: accountMember.account_id }
  } catch (error) {
    console.error('Error in getOnboardingState:', error)
    return { success: false, error: 'Failed to get onboarding state' }
  }
}

// Update onboarding state
export async function updateOnboardingState(
  updates: Partial<OnboardingState>
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

    // Fetch current settings
    const { data: account } = await adminSupabase
      .from('accounts')
      .select('settings')
      .eq('id', accountMember.account_id)
      .single()

    const settings = account?.settings as Record<string, unknown> || {}
    const currentOnboarding = settings.onboarding as OnboardingState || DEFAULT_ONBOARDING_STATE

    // Merge updates
    const newOnboarding: OnboardingState = {
      ...currentOnboarding,
      ...updates,
      milestones: {
        ...currentOnboarding.milestones,
        ...(updates.milestones || {}),
      },
    }

    // Update settings
    const { error } = await adminSupabase
      .from('accounts')
      .update({
        settings: {
          ...settings,
          onboarding: newOnboarding,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountMember.account_id)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateOnboardingState:', error)
    return { success: false, error: 'Failed to update onboarding state' }
  }
}

// Complete welcome modal
export async function completeWelcomeModal(): Promise<{ success: boolean; error?: string }> {
  return updateOnboardingState({
    welcomeModalCompleted: true,
  })
}

// Complete guided tour
export async function completeGuidedTour(): Promise<{ success: boolean; error?: string }> {
  return updateOnboardingState({
    guidedTourCompleted: true,
    guidedTourStep: null,
  })
}

// Update tour step
export async function updateTourStep(step: number): Promise<{ success: boolean; error?: string }> {
  return updateOnboardingState({
    guidedTourStep: step,
  })
}

// Complete a specific milestone
export async function completeMilestone(
  milestone: MilestoneKey
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

    // Fetch current settings
    const { data: account } = await adminSupabase
      .from('accounts')
      .select('settings')
      .eq('id', accountMember.account_id)
      .single()

    const settings = account?.settings as Record<string, unknown> || {}
    const currentOnboarding = settings.onboarding as OnboardingState || DEFAULT_ONBOARDING_STATE

    // Update milestone
    const newMilestones: OnboardingMilestones = {
      ...currentOnboarding.milestones,
      [milestone]: true,
    }

    // Check if all milestones are complete
    const allComplete = Object.values(newMilestones).every(Boolean)

    const newOnboarding: OnboardingState = {
      ...currentOnboarding,
      milestones: newMilestones,
      completedAt: allComplete ? new Date().toISOString() : currentOnboarding.completedAt,
    }

    // Update settings
    const { error } = await adminSupabase
      .from('accounts')
      .update({
        settings: {
          ...settings,
          onboarding: newOnboarding,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountMember.account_id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error in completeMilestone:', error)
    return { success: false, error: 'Failed to complete milestone' }
  }
}

// Reset onboarding (for testing or restart)
export async function resetOnboarding(): Promise<{ success: boolean; error?: string }> {
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

    // Fetch current settings
    const { data: account } = await adminSupabase
      .from('accounts')
      .select('settings')
      .eq('id', accountMember.account_id)
      .single()

    const settings = account?.settings as Record<string, unknown> || {}

    // Reset to initial state
    const resetState: OnboardingState = {
      ...DEFAULT_ONBOARDING_STATE,
      startedAt: new Date().toISOString(),
    }

    // Update settings
    const { error } = await adminSupabase
      .from('accounts')
      .update({
        settings: {
          ...settings,
          onboarding: resetState,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountMember.account_id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/dashboard')
    revalidatePath('/settings')
    return { success: true }
  } catch (error) {
    console.error('Error in resetOnboarding:', error)
    return { success: false, error: 'Failed to reset onboarding' }
  }
}
