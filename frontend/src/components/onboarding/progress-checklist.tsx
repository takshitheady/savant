'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useOnboarding } from './onboarding-provider'
import { MILESTONES } from './tour-steps'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  ArrowRight,
} from 'lucide-react'

export function ProgressChecklist() {
  const { state, showChecklist, dismissChecklist, showGuidedTour, showWelcomeModal, isLoading } = useOnboarding()
  const [isExpanded, setIsExpanded] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't show during tour, welcome modal, or if loading
  if (!mounted || showGuidedTour || showWelcomeModal || isLoading || !showChecklist) {
    return null
  }

  // Don't show if all milestones are complete
  const completedCount = Object.values(state.milestones).filter(Boolean).length
  const totalCount = Object.keys(state.milestones).length
  const allComplete = completedCount === totalCount

  if (allComplete) {
    return null
  }

  const progressPercentage = (completedCount / totalCount) * 100

  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50 transition-all duration-300',
        isExpanded ? 'w-80' : 'w-auto'
      )}
    >
      {isExpanded ? (
        <div className="rounded-xl bg-white shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Getting Started</h3>
                <p className="text-xs text-muted-foreground">
                  {completedCount} of {totalCount} complete
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsExpanded(false)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
              <button
                onClick={dismissChecklist}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Milestones */}
          <div className="p-3 space-y-1">
            {MILESTONES.map((milestone) => {
              const isComplete = state.milestones[milestone.key]
              return (
                <Link
                  key={milestone.key}
                  href={milestone.href}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-lg transition-colors',
                    isComplete
                      ? 'bg-green-50 text-green-700'
                      : 'hover:bg-muted'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                      isComplete
                        ? 'bg-green-500 border-green-500'
                        : 'border-muted-foreground/30'
                    )}
                  >
                    {isComplete && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isComplete && 'line-through opacity-70'
                      )}
                    >
                      {milestone.title}
                    </p>
                    {!isComplete && (
                      <p className="text-xs text-muted-foreground truncate">
                        {milestone.description}
                      </p>
                    )}
                  </div>
                  {!isComplete && (
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                </Link>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="px-4 pb-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        // Collapsed state - just a button
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="relative">
            <Sparkles className="h-5 w-5 text-primary" />
            {completedCount < totalCount && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                {totalCount - completedCount}
              </span>
            )}
          </div>
          <span className="text-sm font-medium">Getting Started</span>
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
