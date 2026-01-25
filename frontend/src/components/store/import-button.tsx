'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { importSavant } from '@/actions/store'
import { useOnboarding } from '@/components/onboarding'

interface ImportButtonProps {
  savantId: string
  savantName: string
  className?: string
}

export function ImportButton({ savantId, savantName, className }: ImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const router = useRouter()
  const { completeMilestone } = useOnboarding()

  const handleImport = async () => {
    setIsLoading(true)
    setError('')

    const result = await importSavant(savantId, customName || undefined)

    if (result.success && result.savantId) {
      setSuccess(true)

      // Track milestone for first savant import
      await completeMilestone('firstSavantImported')

      setTimeout(() => {
        router.push(`/savants/${result.savantId}`)
      }, 1500)
    } else {
      setError(result.error || 'Failed to import savant')
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div className={cn('flex items-center gap-2 rounded-xl bg-green-500 px-6 py-3 text-white', className)}>
        <Check className="h-5 w-5" />
        <span>Imported! Redirecting...</span>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
          className
        )}
      >
        <Download className="h-5 w-5" />
        Import Savant
      </button>
    )
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card p-4 space-y-4', className)}>
      <div>
        <h4 className="font-semibold text-foreground">Import "{savantName}"</h4>
        <p className="mt-1 text-sm text-muted-foreground">
          This will create a copy in your account with all documents and settings.
        </p>
      </div>

      <div>
        <label className="text-sm font-medium text-foreground">
          Custom name (optional)
        </label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder={`${savantName} (Imported)`}
          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(false)}
          disabled={isLoading}
          className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleImport}
          disabled={isLoading}
          className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Import
            </>
          )}
        </button>
      </div>
    </div>
  )
}
