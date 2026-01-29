import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Users, Mail, Shield, Crown, Eye, UserMinus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { InviteMemberForm } from '@/components/team/invite-member-form'
import { PendingInvites } from '@/components/team/pending-invites'
import { MemberList } from '@/components/team/member-list'
import { OrgSettings } from '@/components/team/org-settings'

export const metadata = {
  title: 'Team Settings | Savant',
  description: 'Manage your organization team members and invitations',
}

async function getAccountData() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get user's account membership
  const { data: membership } = await supabase
    .from('account_members')
    .select('account_id, role')
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/dashboard')

  // Get account details
  const { data: account } = await supabase
    .from('accounts')
    .select(
      'id, name, display_name, slug, logo_url, description, allow_member_invites, default_member_role, member_count, plan'
    )
    .eq('id', membership.account_id)
    .single()

  if (!account) redirect('/dashboard')

  // Get members
  const { data: members } = await supabase
    .from('account_members')
    .select('id, user_id, role, created_at')
    .eq('account_id', account.id)
    .order('created_at', { ascending: true })

  // Get pending invitations (only for owners/admins)
  let invitations: any[] = []
  if (membership.role === 'owner' || membership.role === 'admin') {
    const { data: invites } = await supabase
      .from('org_invitations')
      .select('*')
      .eq('account_id', account.id)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    invitations = invites || []
  }

  return {
    user,
    account,
    membership,
    members: members || [],
    invitations,
  }
}

export default async function TeamSettingsPage() {
  const { user, account, membership, members, invitations } =
    await getAccountData()

  const isOwner = membership.role === 'owner'
  const isAdmin = membership.role === 'admin'
  const canManageTeam = isOwner || isAdmin

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your organization members and invitations
        </p>
      </div>

      {/* Organization Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {account.display_name || account.name}
          </CardTitle>
          <CardDescription>
            {account.member_count} member{account.member_count !== 1 ? 's' : ''}{' '}
            &middot; {account.plan} plan
          </CardDescription>
        </CardHeader>
        {isOwner && (
          <CardContent>
            <OrgSettings account={account} />
          </CardContent>
        )}
      </Card>

      {/* Invite Members - Only for owners/admins */}
      {canManageTeam && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite Team Members
            </CardTitle>
            <CardDescription>
              Send invitations to add new members to your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <InviteMemberForm
              accountId={account.id}
              userRole={membership.role}
            />
          </CardContent>
        </Card>
      )}

      {/* Pending Invitations */}
      {canManageTeam && invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
            <CardDescription>
              Invitations waiting to be accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PendingInvites invitations={invitations} />
          </CardContent>
        </Card>
      )}

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Members
          </CardTitle>
          <CardDescription>
            People with access to this organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading members...</div>}>
            <MemberList
              accountId={account.id}
              members={members}
              currentUserId={user.id}
              currentUserRole={membership.role}
            />
          </Suspense>
        </CardContent>
      </Card>

      {/* Role Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-start gap-3">
              <Crown className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Owner</p>
                <p className="text-sm text-muted-foreground">
                  Full control including billing, settings, and member
                  management
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Admin</p>
                <p className="text-sm text-muted-foreground">
                  Manage members and settings, but cannot change billing
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Member</p>
                <p className="text-sm text-muted-foreground">
                  Create and edit savants, upload documents, use chat
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Eye className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="font-medium">Viewer</p>
                <p className="text-sm text-muted-foreground">
                  View-only access to savants and chat history
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
