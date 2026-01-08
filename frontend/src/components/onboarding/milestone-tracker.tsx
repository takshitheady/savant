'use client'

import { useEffect, useRef } from 'react'
import { completeMilestone } from '@/actions/onboarding'
import type { MilestoneKey } from '@/types/onboarding'

interface MilestoneTrackerProps {
  milestone: MilestoneKey
}

export function MilestoneTracker({ milestone }: MilestoneTrackerProps) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current) return
    tracked.current = true

    completeMilestone(milestone).catch((error) => {
      console.error(`Failed to track milestone ${milestone}:`, error)
    })
  }, [milestone])

  return null
}
