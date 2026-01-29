'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import {
  Crown,
  Loader2,
  MoreHorizontal,
  Shield,
  UserMinus,
  Users,
  Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  removeOrgMember,
  updateMemberRole,
  type MemberRole,
} from '@/actions/team'
import { createClient } from '@/lib/supabase/client'

interface Member {
  id: string
  user_id: string
  role: MemberRole
  created_at: string
}

interface MemberWithUser extends Member {
  email?: string
  full_name?: string
  avatar_url?: string
}

interface MemberListProps {
  accountId: string
  members: Member[]
  currentUserId: string
  currentUserRole: MemberRole
}

const roleIcons: Record<MemberRole, typeof Crown> = {
  owner: Crown,
  admin: Shield,
  member: Users,
  viewer: Eye,
}

const roleColors: Record<MemberRole, string> = {
  owner: 'text-yellow-500',
  admin: 'text-blue-500',
  member: 'text-green-500',
  viewer: 'text-gray-500',
}

export function MemberList({
  accountId,
  members,
  currentUserId,
  currentUserRole,
}: MemberListProps) {
  const router = useRouter()
  const [membersWithUsers, setMembersWithUsers] = useState<MemberWithUser[]>(
    members.map((m) => ({ ...m }))
  )
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    type: 'remove' | 'role'
    member: MemberWithUser
    newRole?: MemberRole
  } | null>(null)

  const isOwner = currentUserRole === 'owner'
  const isAdmin = currentUserRole === 'admin'
  const canManage = isOwner || isAdmin

  // Fetch user details for each member
  useEffect(() => {
    async function fetchUserDetails() {
      const supabase = createClient()

      // For each member, try to get their user details from the current user's auth context
      // This is a workaround since we can't directly query auth.users
      const updatedMembers = await Promise.all(
        members.map(async (member) => {
          // If this is the current user, we can get their details
          if (member.user_id === currentUserId) {
            const {
              data: { user },
            } = await supabase.auth.getUser()
            return {
              ...member,
              email: user?.email || '',
              full_name: user?.user_metadata?.full_name || '',
              avatar_url: user?.user_metadata?.avatar_url || '',
            }
          }
          // For other users, we'll need a backend function or leave it empty for now
          return { ...member }
        })
      )

      setMembersWithUsers(updatedMembers)
    }

    fetchUserDetails()
  }, [members, currentUserId])

  async function handleRemoveMember(member: MemberWithUser) {
    setLoadingAction(member.id)
    try {
      const result = await removeOrgMember(accountId, member.user_id)
      if (result.success) {
        router.refresh()
      }
    } finally {
      setLoadingAction(null)
      setConfirmDialog(null)
    }
  }

  async function handleRoleChange(member: MemberWithUser, newRole: MemberRole) {
    setLoadingAction(member.id)
    try {
      const result = await updateMemberRole(accountId, member.user_id, newRole)
      if (result.success) {
        router.refresh()
      }
    } finally {
      setLoadingAction(null)
      setConfirmDialog(null)
    }
  }

  function getInitials(name: string, email?: string): string {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email.slice(0, 2).toUpperCase()
    }
    return '??'
  }

  function canModifyMember(member: MemberWithUser): boolean {
    // Can't modify yourself (except leave)
    if (member.user_id === currentUserId) return false
    // Admins can't modify owners
    if (isAdmin && member.role === 'owner') return false
    // Only owners can modify
    return isOwner
  }

  return (
    <>
      <div className="space-y-3">
        {membersWithUsers.map((member) => {
          const RoleIcon = roleIcons[member.role]
          const isCurrentUser = member.user_id === currentUserId
          const canModify = canModifyMember(member)
          const canLeave = isCurrentUser && member.role !== 'owner'

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 rounded-xl bg-card shadow-sm"
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {member.avatar_url && (
                    <AvatarImage src={member.avatar_url} />
                  )}
                  <AvatarFallback>
                    {getInitials(member.full_name || '', member.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">
                      {member.full_name || member.email || 'Team Member'}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RoleIcon className={`h-3 w-3 ${roleColors[member.role]}`} />
                    <span className="capitalize">{member.role}</span>
                    <span>&middot;</span>
                    <span>
                      Joined{' '}
                      {formatDistanceToNow(new Date(member.created_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {(canModify || canLeave) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingAction === member.id}
                    >
                      {loadingAction === member.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {canModify && (
                      <>
                        <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                        {member.role !== 'owner' && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                type: 'role',
                                member,
                                newRole: 'owner',
                              })
                            }
                          >
                            <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                            Make Owner
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'admin' && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                type: 'role',
                                member,
                                newRole: 'admin',
                              })
                            }
                          >
                            <Shield className="mr-2 h-4 w-4 text-blue-500" />
                            Make Admin
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'member' && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                type: 'role',
                                member,
                                newRole: 'member',
                              })
                            }
                          >
                            <Users className="mr-2 h-4 w-4 text-green-500" />
                            Make Member
                          </DropdownMenuItem>
                        )}
                        {member.role !== 'viewer' && (
                          <DropdownMenuItem
                            onClick={() =>
                              setConfirmDialog({
                                type: 'role',
                                member,
                                newRole: 'viewer',
                              })
                            }
                          >
                            <Eye className="mr-2 h-4 w-4 text-gray-500" />
                            Make Viewer
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                      </>
                    )}
                    {(canModify || canLeave) && (
                      <DropdownMenuItem
                        onClick={() =>
                          setConfirmDialog({ type: 'remove', member })
                        }
                        className="text-red-600 focus:text-red-600"
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        {isCurrentUser ? 'Leave Organization' : 'Remove Member'}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          )
        })}
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog
        open={confirmDialog !== null}
        onOpenChange={(open) => !open && setConfirmDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog?.type === 'remove'
                ? confirmDialog?.member.user_id === currentUserId
                  ? 'Leave Organization'
                  : 'Remove Member'
                : 'Change Role'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog?.type === 'remove' ? (
                confirmDialog?.member.user_id === currentUserId ? (
                  'Are you sure you want to leave this organization? You will lose access to all shared resources.'
                ) : (
                  <>
                    Are you sure you want to remove{' '}
                    <strong>
                      {confirmDialog?.member.full_name ||
                        confirmDialog?.member.email ||
                        'this member'}
                    </strong>{' '}
                    from the organization?
                  </>
                )
              ) : (
                <>
                  Change{' '}
                  <strong>
                    {confirmDialog?.member.full_name ||
                      confirmDialog?.member.email ||
                      'this member'}
                  </strong>
                  's role from <strong>{confirmDialog?.member.role}</strong> to{' '}
                  <strong>{confirmDialog?.newRole}</strong>?
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDialog?.type === 'remove') {
                  handleRemoveMember(confirmDialog.member)
                } else if (confirmDialog?.type === 'role' && confirmDialog.newRole) {
                  handleRoleChange(confirmDialog.member, confirmDialog.newRole)
                }
              }}
              className={
                confirmDialog?.type === 'remove'
                  ? 'bg-red-600 hover:bg-red-700'
                  : ''
              }
            >
              {confirmDialog?.type === 'remove'
                ? confirmDialog?.member.user_id === currentUserId
                  ? 'Leave'
                  : 'Remove'
                : 'Change Role'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
