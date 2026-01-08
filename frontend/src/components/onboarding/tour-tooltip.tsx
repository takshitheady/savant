'use client'

import { useEffect, useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { TourStep } from '@/types/onboarding'

interface TourTooltipProps {
  step: TourStep
  currentStep: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
}

interface Position {
  top: number
  left: number
}

export function TourTooltip({
  step,
  currentStep,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipProps) {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
  const [arrowPosition, setArrowPosition] = useState<'top' | 'bottom' | 'left' | 'right'>('top')

  const tooltipWidth = 320
  const tooltipHeight = 180 // Approximate
  const arrowSize = 10
  const gap = 16

  useEffect(() => {
    const calculatePosition = () => {
      const element = document.querySelector(step.target)
      if (!element) return

      const rect = element.getBoundingClientRect()
      const padding = step.spotlightPadding || 8
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let top = 0
      let left = 0
      let arrow: 'top' | 'bottom' | 'left' | 'right' = 'top'

      switch (step.placement) {
        case 'bottom':
          top = rect.bottom + padding + gap + arrowSize
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          arrow = 'top'
          break
        case 'top':
          top = rect.top - padding - gap - tooltipHeight - arrowSize
          left = rect.left + rect.width / 2 - tooltipWidth / 2
          arrow = 'bottom'
          break
        case 'right':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.right + padding + gap + arrowSize
          arrow = 'left'
          break
        case 'left':
          top = rect.top + rect.height / 2 - tooltipHeight / 2
          left = rect.left - padding - gap - tooltipWidth - arrowSize
          arrow = 'right'
          break
      }

      // Ensure tooltip stays within viewport
      if (left < 16) left = 16
      if (left + tooltipWidth > viewportWidth - 16) left = viewportWidth - tooltipWidth - 16
      if (top < 16) top = 16
      if (top + tooltipHeight > viewportHeight - 16) top = viewportHeight - tooltipHeight - 16

      setPosition({ top, left })
      setArrowPosition(arrow)
    }

    calculatePosition()
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)

    return () => {
      window.removeEventListener('scroll', calculatePosition, true)
      window.removeEventListener('resize', calculatePosition)
    }
  }, [step])

  const arrowStyles = useMemo(() => {
    const base = 'absolute w-0 h-0 border-solid'
    switch (arrowPosition) {
      case 'top':
        return {
          className: `${base} border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[10px] border-b-white`,
          style: { top: -10, left: '50%', transform: 'translateX(-50%)' },
        }
      case 'bottom':
        return {
          className: `${base} border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[10px] border-t-white`,
          style: { bottom: -10, left: '50%', transform: 'translateX(-50%)' },
        }
      case 'left':
        return {
          className: `${base} border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-r-[10px] border-r-white`,
          style: { left: -10, top: '50%', transform: 'translateY(-50%)' },
        }
      case 'right':
        return {
          className: `${base} border-t-[10px] border-t-transparent border-b-[10px] border-b-transparent border-l-[10px] border-l-white`,
          style: { right: -10, top: '50%', transform: 'translateY(-50%)' },
        }
    }
  }, [arrowPosition])

  const isLastStep = currentStep === totalSteps - 1

  return (
    <div
      className="fixed z-[9999] w-80 rounded-xl bg-white p-5 shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
      style={{
        top: position.top,
        left: position.left,
        pointerEvents: 'auto',
      }}
    >
      {/* Arrow */}
      <div className={arrowStyles.className} style={arrowStyles.style} />

      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="pr-6">
        <h3 className="font-semibold text-base mb-2">{step.title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t">
        {/* Step counter */}
        <span className="text-xs text-muted-foreground">
          {currentStep + 1} of {totalSteps}
        </span>

        {/* Navigation */}
        <div className="flex gap-2">
          {currentStep > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPrev}
              className="h-8 px-3"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <Button size="sm" onClick={onNext} className="h-8 px-4">
            {isLastStep ? 'Finish' : 'Next'}
            {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        </div>
      </div>
    </div>
  )
}
