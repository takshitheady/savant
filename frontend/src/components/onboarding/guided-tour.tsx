'use client'

import { useEffect, useState } from 'react'
import { useOnboarding } from './onboarding-provider'
import { TourSpotlight } from './tour-spotlight'
import { TourTooltip } from './tour-tooltip'
import { TOUR_STEPS } from './tour-steps'

export function GuidedTour() {
  const {
    showGuidedTour,
    currentTourStep,
    totalTourSteps,
    nextTourStep,
    prevTourStep,
    skipTour,
  } = useOnboarding()

  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  // Don't render on server
  if (!mounted || !showGuidedTour) {
    return null
  }

  const currentStep = TOUR_STEPS[currentTourStep]

  if (!currentStep) {
    return null
  }

  // Check if target element exists
  const targetElement = document.querySelector(currentStep.target)
  if (!targetElement) {
    // Target not found, skip to next step
    console.warn(`Tour target not found: ${currentStep.target}`)
    // Auto-advance after a short delay
    setTimeout(() => {
      nextTourStep()
    }, 100)
    return null
  }

  return (
    <TourSpotlight
      target={currentStep.target}
      padding={currentStep.spotlightPadding || 8}
    >
      <TourTooltip
        step={currentStep}
        currentStep={currentTourStep}
        totalSteps={totalTourSteps}
        onNext={nextTourStep}
        onPrev={prevTourStep}
        onSkip={skipTour}
      />
    </TourSpotlight>
  )
}
