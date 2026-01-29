'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { updateOrgSettings } from '@/actions/team'

interface OrgSettingsProps {
  account: {
    id: string
    name: string
    display_name: string | null
    description: string | null
    logo_url: string | null
    allow_member_invites: boolean | null
  }
}

export function OrgSettings({ account }: OrgSettingsProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [displayName, setDisplayName] = useState(account.display_name || account.name)
  const [description, setDescription] = useState(account.description || '')
  const [allowMemberInvites, setAllowMemberInvites] = useState(
    account.allow_member_invites || false
  )
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const hasChanges =
    displayName !== (account.display_name || account.name) ||
    description !== (account.description || '') ||
    allowMemberInvites !== (account.allow_member_invites || false)

  async function handleSave() {
    setError(null)
    setSuccess(false)
    setIsLoading(true)

    try {
      const result = await updateOrgSettings(account.id, {
        display_name: displayName,
        description: description || null,
        allow_member_invites: allowMemberInvites,
      })

      if (result.success) {
        setSuccess(true)
        router.refresh()
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError(result.error || 'Failed to update settings')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="displayName">Organization Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A brief description of your organization..."
          rows={2}
        />
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
        <div className="space-y-0.5">
          <Label htmlFor="allowMemberInvites">Allow Members to Invite</Label>
          <p className="text-sm text-muted-foreground">
            When enabled, members (not just admins) can invite new team members
          </p>
        </div>
        <Switch
          id="allowMemberInvites"
          checked={allowMemberInvites}
          onCheckedChange={setAllowMemberInvites}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {success && (
        <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
          Settings saved successfully
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isLoading || !hasChanges}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
