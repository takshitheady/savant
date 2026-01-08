'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import type { OnboardingState, MilestoneKey } from '@/types/onboarding'
import { DEFAULT_ONBOARDING_STATE } from '@/types/onboarding'
import {
  getOnboardingState,
  updateOnboardingState,
  completeWelcomeModal as serverCompleteWelcomeModal,
  completeGuidedTour as serverCompleteGuidedTour,
  updateTourStep as serverUpdateTourStep,
  completeMilestone as serverCompleteMilestone,
  resetOnboarding as serverResetOnboarding,
} from '@/actions/onboarding'
import { TOUR_STEPS } from './tour-steps'

interface OnboardingContextValue {
  // State
  state: OnboardingState
  isLoading: boolean
  showWelcomeModal: boolean
  showGuidedTour: boolean
  currentTourStep: number
  totalTourSteps: number

  // Actions
  completeWelcomeModal: () => Promise<void>
  startGuidedTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  skipTour: () => Promise<void>
  completeTour: () => Promise<void>
  completeMilestone: (milestone: MilestoneKey) => Promise<void>
  restartTour: () => Promise<void>
  dismissChecklist: () => void
  showChecklist: boolean
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null)

interface OnboardingProviderProps {
  children: React.ReactNode
  initialState?: OnboardingState
}

export function OnboardingProvider({ children, initialState }: OnboardingProviderProps) {
  const [state, setState] = useState<OnboardingState>(initialState || DEFAULT_ONBOARDING_STATE)
  const [isLoading, setIsLoading] = useState(!initialState)
  const [showWelcomeModal, setShowWelcomeModal] = useState(false)
  const [showGuidedTour, setShowGuidedTour] = useState(false)
  const [currentTourStep, setCurrentTourStep] = useState(0)
  const [showChecklist, setShowChecklist] = useState(true)

  // Initialize state from server if not provided
  useEffect(() => {
    if (!initialState) {
      getOnboardingState().then((result) => {
        if (result.success && result.data) {
          setState(result.data)
          // Show welcome modal if not completed
          if (!result.data.welcomeModalCompleted) {
            setShowWelcomeModal(true)
          }
          // Resume tour if in progress
          if (result.data.guidedTourStep !== null && !result.data.guidedTourCompleted) {
            setCurrentTourStep(result.data.guidedTourStep)
            setShowGuidedTour(true)
          }
        }
        setIsLoading(false)
      })
    } else {
      // Check if we should show welcome modal
      if (!initialState.welcomeModalCompleted) {
        setShowWelcomeModal(true)
      }
      // Resume tour if in progress
      if (initialState.guidedTourStep !== null && !initialState.guidedTourCompleted) {
        setCurrentTourStep(initialState.guidedTourStep)
        setShowGuidedTour(true)
      }
    }
  }, [initialState])

  const completeWelcomeModal = useCallback(async () => {
    setShowWelcomeModal(false)
    setState((prev) => ({ ...prev, welcomeModalCompleted: true }))
    await serverCompleteWelcomeModal()
    // Auto-start guided tour after welcome modal
    setShowGuidedTour(true)
    setCurrentTourStep(0)
  }, [])

  const startGuidedTour = useCallback(() => {
    setShowGuidedTour(true)
    setCurrentTourStep(0)
  }, [])

  const nextTourStep = useCallback(async () => {
    const nextStep = currentTourStep + 1
    if (nextStep >= TOUR_STEPS.length) {
      // Tour complete
      setShowGuidedTour(false)
      setState((prev) => ({ ...prev, guidedTourCompleted: true, guidedTourStep: null }))
      await serverCompleteGuidedTour()
    } else {
      setCurrentTourStep(nextStep)
      await serverUpdateTourStep(nextStep)
    }
  }, [currentTourStep])

  const prevTourStep = useCallback(() => {
    if (currentTourStep > 0) {
      setCurrentTourStep(currentTourStep - 1)
    }
  }, [currentTourStep])

  const skipTour = useCallback(async () => {
    setShowGuidedTour(false)
    setState((prev) => ({ ...prev, guidedTourCompleted: true, guidedTourStep: null }))
    await serverCompleteGuidedTour()
  }, [])

  const completeTour = useCallback(async () => {
    setShowGuidedTour(false)
    setState((prev) => ({ ...prev, guidedTourCompleted: true, guidedTourStep: null }))
    await serverCompleteGuidedTour()
  }, [])

  const completeMilestone = useCallback(async (milestone: MilestoneKey) => {
    // Optimistic update
    setState((prev) => ({
      ...prev,
      milestones: {
        ...prev.milestones,
        [milestone]: true,
      },
    }))
    await serverCompleteMilestone(milestone)
  }, [])

  const restartTour = useCallback(async () => {
    await serverResetOnboarding()
    setState(DEFAULT_ONBOARDING_STATE)
    setShowWelcomeModal(true)
    setCurrentTourStep(0)
    setShowGuidedTour(false)
  }, [])

  const dismissChecklist = useCallback(() => {
    setShowChecklist(false)
  }, [])

  const value = useMemo<OnboardingContextValue>(
    () => ({
      state,
      isLoading,
      showWelcomeModal,
      showGuidedTour,
      currentTourStep,
      totalTourSteps: TOUR_STEPS.length,
      completeWelcomeModal,
      startGuidedTour,
      nextTourStep,
      prevTourStep,
      skipTour,
      completeTour,
      completeMilestone,
      restartTour,
      dismissChecklist,
      showChecklist,
    }),
    [
      state,
      isLoading,
      showWelcomeModal,
      showGuidedTour,
      currentTourStep,
      showChecklist,
      completeWelcomeModal,
      startGuidedTour,
      nextTourStep,
      prevTourStep,
      skipTour,
      completeTour,
      completeMilestone,
      restartTour,
      dismissChecklist,
    ]
  )

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider')
  }
  return context
}
