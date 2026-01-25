'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpCircle, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { upgradeSavantInstance } from '@/actions/store'
import { VersionBadge } from '@/components/ui/version-badge'

interface UpgradeNotificationProps {
  instanceId: string
  templateId: string
  currentVersion: number
  latestVersion: number
  templateName: string
  changelog?: string
}

export function UpgradeNotification({
  instanceId,
  templateId,
  currentVersion,
  latestVersion,
  templateName,
  changelog,
}: UpgradeNotificationProps) {
  const [isUpgrading, setIsUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleUpgrade = async () => {
    if (!confirm(
      `Upgrade to version ${latestVersion}?\n\n` +
      `This will update the base instructions and knowledge base from the template.\n\n` +
      `Your custom instructions and documents will be preserved.`
    )) {
      return
    }

    setIsUpgrading(true)
    setError(null)

    try {
      const result = await upgradeSavantInstance(instanceId)

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setError(result.error || 'Failed to upgrade savant')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsUpgrading(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Upgrade Complete!
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          Your savant has been upgraded to version {latestVersion}. The page will refresh shortly.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900 dark:text-orange-100">
              Update Available
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <VersionBadge version={currentVersion} variant="default" />
            <span className="text-muted-foreground">→</span>
            <VersionBadge version={latestVersion} variant="update-available" />
          </div>
        </div>
        <CardDescription className="text-orange-800 dark:text-orange-200">
          A new version of "{templateName}" is available
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {changelog && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-orange-900 dark:text-orange-100">
              What's new in v{latestVersion}:
            </h4>
            <div className="rounded-lg bg-white dark:bg-gray-900 p-3 text-sm text-gray-700 dark:text-gray-300">
              <p className="whitespace-pre-wrap">{changelog}</p>
            </div>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex items-start gap-2 rounded-lg bg-white dark:bg-gray-900 p-3 text-sm">
          <div className="text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Upgrade includes:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Updated base instructions from template</li>
              <li>Latest template knowledge base</li>
              <li>New features and improvements</li>
            </ul>
            <p className="font-medium text-foreground mt-3 mb-1">Your customizations will be preserved:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Your custom instructions</li>
              <li>Your uploaded documents</li>
              <li>All settings and preferences</li>
            </ul>
          </div>
        </div>

        <Button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          {isUpgrading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Upgrading...
            </>
          ) : (
            <>
              <ArrowUpCircle className="mr-2 h-4 w-4" />
              Upgrade to v{latestVersion}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
