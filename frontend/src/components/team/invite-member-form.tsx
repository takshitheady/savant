'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy, Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { inviteUserToOrg, type InviteRole, type MemberRole } from '@/actions/team'

// Personal email domains that shouldn't be used for team invites
const PERSONAL_EMAIL_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'hotmail.com',
  'hotmail.co.uk',
  'outlook.com',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'mail.com',
  'zoho.com',
  'yandex.com',
  'gmx.com',
  'gmx.net',
  'fastmail.com',
  'tutanota.com',
  'rediffmail.com',
]

function isPersonalEmail(email: string): boolean {
  const domain = email.toLowerCase().split('@')[1]
  return PERSONAL_EMAIL_DOMAINS.includes(domain)
}

interface InviteMemberFormProps {
  accountId: string
  userRole: MemberRole
}

export function InviteMemberForm({ accountId, userRole }: InviteMemberFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<InviteRole>('member')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  const isOwner = userRole === 'owner'

  useEffect(() => {
    setMounted(true)
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setInviteLink(null)
    setEmailSent(false)
    setCopied(false)

    // Validate email domain
    if (isPersonalEmail(email)) {
      setError('Please use a work email address. Personal email addresses (Gmail, Yahoo, etc.) are not allowed for team invitations.')
      return
    }

    setIsLoading(true)

    try {
      const result = await inviteUserToOrg(accountId, email, role)

      if (result.success && result.token) {
        const link = `${window.location.origin}/invite/${result.token}`
        setInviteLink(link)
        setEmailSent(result.emailSent || false)
        setEmail('')
        setRole('member')
        router.refresh()
      } else {
        setError(result.error || 'Failed to send invitation')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea')
      textarea.value = inviteLink
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>
        <div className="w-full sm:w-40 space-y-2">
          <Label htmlFor="invite-role">Role</Label>
          {mounted ? (
            <Select
              value={role}
              onValueChange={(value) => setRole(value as InviteRole)}
              disabled={isLoading}
            >
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                {isOwner && <SelectItem value="viewer">Viewer</SelectItem>}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 w-full items-center rounded-md border border-input bg-white px-3 py-2 text-sm shadow-sm">
              Member
            </div>
          )}
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={isLoading || !email}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Invite
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">
          {error}
        </div>
      )}

      {inviteLink && (
        <div className="space-y-2">
          <div className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">
            {emailSent
              ? 'Invitation email sent! You can also share this link directly:'
              : 'Invitation created! Share this link with the invited user:'}
          </div>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={inviteLink}
              className="text-xs font-mono bg-muted"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        The invitation will expire in 7 days. Share the invite link with the
        user — they will get access after signing up or logging in with the
        invited email address.
      </p>
    </form>
  )
}
