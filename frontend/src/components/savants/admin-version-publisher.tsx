'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Rocket, Loader2, CheckCircle, AlertCircle, History } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { publishTemplateVersion } from '@/actions/store'
import { VersionBadge } from '@/components/ui/version-badge'

interface AdminVersionPublisherProps {
  savantId: string
  currentVersion: number
  isTemplate: boolean
}

export function AdminVersionPublisher({
  savantId,
  currentVersion,
  isTemplate,
}: AdminVersionPublisherProps) {
  const [changelog, setChangelog] = useState('')
  const [isPublishing, setIsPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  if (!isTemplate) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Not a Template</AlertTitle>
        <AlertDescription>
          This savant is not published as a template. Only published templates can have versions.
        </AlertDescription>
      </Alert>
    )
  }

  const handlePublish = async () => {
    if (!changelog.trim()) {
      setError('Please provide a changelog describing the changes in this version')
      return
    }

    if (!confirm(
      `Publish version ${currentVersion + 1}?\n\n` +
      `This will:\n` +
      `• Create a new version (v${currentVersion + 1})\n` +
      `• Notify users who have imported this template\n` +
      `• Allow users to upgrade their instances\n\n` +
      `Current template state (prompts, documents, settings) will be saved as v${currentVersion + 1}.`
    )) {
      return
    }

    setIsPublishing(true)
    setError(null)

    try {
      const result = await publishTemplateVersion(savantId, changelog.trim())

      if (result.success) {
        setSuccess(true)
        setChangelog('')
        setTimeout(() => {
          router.refresh()
          setSuccess(false)
        }, 3000)
      } else {
        setError(result.error || 'Failed to publish new version')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsPublishing(false)
    }
  }

  if (success) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-900 dark:text-green-100">
          Version Published!
        </AlertTitle>
        <AlertDescription className="text-green-800 dark:text-green-200">
          Version {currentVersion + 1} has been published successfully. Users will be notified of the update.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle>Publish New Version</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current:</span>
            <VersionBadge version={currentVersion} />
            <span className="text-muted-foreground">→</span>
            <VersionBadge version={currentVersion + 1} variant="update-available" />
          </div>
        </div>
        <CardDescription>
          Create a new version of this template with your latest changes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <History className="h-4 w-4" />
          <AlertTitle>What happens when you publish?</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Current template state (prompts, documents, settings) becomes v{currentVersion + 1}</li>
              <li>Version history is saved in the database</li>
              <li>Users who imported this template will see an "Update Available" notification</li>
              <li>Users can upgrade while keeping their custom instructions and documents</li>
            </ul>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="changelog">
            Changelog for v{currentVersion + 1} *
          </Label>
          <Textarea
            id="changelog"
            value={changelog}
            onChange={(e) => setChangelog(e.target.value)}
            placeholder={`What's new in this version?\n\nExample:\n- Added new feature X\n- Improved response quality for Y\n- Updated knowledge base with latest data\n- Fixed issue with Z`}
            className="min-h-[150px] font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Describe what's new, improved, or fixed in this version. Users will see this changelog when upgrading.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handlePublish}
          disabled={isPublishing || !changelog.trim()}
          className="w-full"
          size="lg"
        >
          {isPublishing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing Version {currentVersion + 1}...
            </>
          ) : (
            <>
              <Rocket className="mr-2 h-4 w-4" />
              Publish Version {currentVersion + 1}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
