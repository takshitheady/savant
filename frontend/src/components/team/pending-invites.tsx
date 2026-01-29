'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { Clock, Loader2, Mail, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { revokeOrgInvitation, type OrgInvitation } from '@/actions/team'

interface PendingInvitesProps {
  invitations: OrgInvitation[]
}

export function PendingInvites({ invitations }: PendingInvitesProps) {
  const router = useRouter()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  async function handleRevoke(inviteId: string) {
    setRevokingId(inviteId)
    try {
      const result = await revokeOrgInvitation(inviteId)
      if (result.success) {
        router.refresh()
      }
    } finally {
      setRevokingId(null)
    }
  }

  if (invitations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No pending invitations</p>
    )
  }

  return (
    <div className="space-y-3">
      {invitations.map((invite) => (
        <div
          key={invite.id}
          className="flex items-center justify-between p-3 rounded-xl bg-muted/30"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
              <Mail className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-sm">{invite.email}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline" className="text-xs">
                  {invite.role}
                </Badge>
                <span>&middot;</span>
                <Clock className="h-3 w-3" />
                <span>
                  Expires{' '}
                  {formatDistanceToNow(new Date(invite.expires_at), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={revokingId === invite.id}
              >
                {revokingId === invite.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke Invitation</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to revoke the invitation for{' '}
                  <strong>{invite.email}</strong>? They will no longer be able
                  to join using this invitation link.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleRevoke(invite.id)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Revoke Invitation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}
    </div>
  )
}
