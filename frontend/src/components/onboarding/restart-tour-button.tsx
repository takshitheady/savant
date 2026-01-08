'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { resetOnboarding } from '@/actions/onboarding'
import { Loader2, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function RestartTourButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  async function handleRestart() {
    setIsLoading(true)
    try {
      await resetOnboarding()
      // Navigate to dashboard and refresh to trigger the tour
      router.push('/dashboard')
      router.refresh()
    } catch (error) {
      console.error('Failed to restart tour:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRestart}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RotateCcw className="mr-2 h-4 w-4" />
      )}
      Restart Tour
    </Button>
  )
}
