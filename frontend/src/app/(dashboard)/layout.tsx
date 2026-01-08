import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import {
  OnboardingProvider,
  WelcomeModal,
  GuidedTour,
  ProgressChecklist,
} from '@/components/onboarding'
import type { OnboardingState } from '@/types/onboarding'
import { DEFAULT_ONBOARDING_STATE } from '@/types/onboarding'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const adminSupabase = createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch account settings for onboarding state
  const { data: accountMember } = await adminSupabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  let onboardingState: OnboardingState = DEFAULT_ONBOARDING_STATE

  if (accountMember) {
    const { data: account } = await adminSupabase
      .from('accounts')
      .select('settings')
      .eq('id', accountMember.account_id)
      .single()

    if (account?.settings) {
      const settings = account.settings as Record<string, unknown>
      if (settings.onboarding) {
        onboardingState = settings.onboarding as OnboardingState
      }
    }
  }

  return (
    <OnboardingProvider initialState={onboardingState}>
      <DashboardShell user={user}>{children}</DashboardShell>
      <WelcomeModal />
      <GuidedTour />
      <ProgressChecklist />
    </OnboardingProvider>
  )
}
