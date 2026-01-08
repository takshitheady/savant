// Onboarding Types

export interface OnboardingMilestones {
  firstSavantCreated: boolean
  firstDocumentUploaded: boolean
  firstMessageSent: boolean
  storeExplored: boolean
  brandVoiceConfigured: boolean
}

export interface OnboardingState {
  welcomeModalCompleted: boolean
  guidedTourCompleted: boolean
  guidedTourStep: number | null
  milestones: OnboardingMilestones
  startedAt: string
  completedAt: string | null
}

export interface TourStep {
  id: string
  target: string // data-tour attribute selector, e.g., '[data-tour="sidebar-savants"]'
  title: string
  content: string
  placement: 'top' | 'bottom' | 'left' | 'right'
  spotlightPadding?: number
}

export const DEFAULT_ONBOARDING_STATE: OnboardingState = {
  welcomeModalCompleted: false,
  guidedTourCompleted: false,
  guidedTourStep: null,
  milestones: {
    firstSavantCreated: false,
    firstDocumentUploaded: false,
    firstMessageSent: false,
    storeExplored: false,
    brandVoiceConfigured: false,
  },
  startedAt: new Date().toISOString(),
  completedAt: null,
}

export type MilestoneKey = keyof OnboardingMilestones
