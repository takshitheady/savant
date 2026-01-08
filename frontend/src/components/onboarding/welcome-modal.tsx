'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useOnboarding } from './onboarding-provider'
import { IntroStep } from './welcome-steps/intro-step'
import { FeaturesStep } from './welcome-steps/features-step'
import { ReadyStep } from './welcome-steps/ready-step'
import { cn } from '@/lib/utils'
import { ChevronRight, X } from 'lucide-react'

const STEPS = [
  { component: IntroStep, title: 'Welcome' },
  { component: FeaturesStep, title: 'Features' },
  { component: ReadyStep, title: 'Ready' },
]

export function WelcomeModal() {
  const { showWelcomeModal, completeWelcomeModal } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(0)

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      // Complete and start tour
      completeWelcomeModal()
    }
  }

  const handleSkip = () => {
    completeWelcomeModal()
  }

  const CurrentStepComponent = STEPS[currentStep].component

  return (
    <Dialog open={showWelcomeModal} onOpenChange={() => {}}>
      <DialogContent
        className="sm:max-w-[540px] p-0 gap-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        {/* Visually hidden title for accessibility */}
        <DialogTitle className="sr-only">Welcome to Savant</DialogTitle>

        {/* Skip button */}
        <button
          onClick={handleSkip}
          className="absolute right-4 top-4 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Skip</span>
        </button>

        {/* Content */}
        <div className="px-8 pt-8 pb-6">
          <CurrentStepComponent />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t bg-muted/30 px-8 py-4">
          {/* Step indicators */}
          <div className="flex gap-1.5">
            {STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  'h-2 w-2 rounded-full transition-colors',
                  index === currentStep
                    ? 'bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted-foreground/30'
                )}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep < STEPS.length - 1 ? (
              <Button onClick={handleNext} className="gap-2">
                Continue
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={handleNext} className="gap-2">
                Start Tour
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
