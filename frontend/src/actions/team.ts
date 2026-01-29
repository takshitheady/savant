'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer'
export type InviteRole = 'admin' | 'member' | 'viewer'

export interface TeamMember {
  id: string
  user_id: string
  role: MemberRole
  created_at: string
  user: {
    id: string
    email: string
    raw_user_meta_data: {
      full_name?: string
      avatar_url?: string
    }
  }
}

export interface OrgInvitation {
  id: string
  account_id: string
  email: string
  role: InviteRole
  invited_by: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  inviter?: {
    email: string
    raw_user_meta_data: {
      full_name?: string
    }
  }
}

export interface InviteResult {
  success: boolean
  invite_id?: string
  token?: string
  email?: string
  role?: string
  org_name?: string
  error?: string
  emailSent?: boolean
}

export interface AcceptInviteResult {
  success: boolean
  account_id?: string
  org_name?: string
  role?: string
  membership_id?: string
  already_member?: boolean
  message?: string
  error?: string
}

/**
 * Invite a user to the organization by email.
 * Creates an org invitation record, then attempts to send an email
 * via Supabase Auth admin API (inviteUserByEmail for new users)
 * or returns the invite link for manual sharing.
 */
export async function inviteUserToOrg(
  accountId: string,
  email: string,
  role: InviteRole = 'member'
): Promise<InviteResult> {
  const supabase = await createClient()

  // 1. Create the org invitation record (token, role, etc.)
  const { data, error } = await supabase.rpc('invite_user_to_org', {
    p_account_id: accountId,
    p_email: email,
    p_role: role,
  })

  if (error) {
    console.error('[Team] Error inviting user:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  const result = data as InviteResult

  // 2. Attempt to send an email via Supabase Auth admin API
  let emailSent = false
  try {
    const headersList = await headers()
    const origin = headersList.get('origin') || headersList.get('referer')?.replace(/\/[^/]*$/, '') || ''
    const inviteUrl = `${origin}/invite/${result.token}`

    const adminSupabase = createAdminClient()

    // Check if user already exists in auth
    const { data: existingUsers } = await adminSupabase.auth.admin.listUsers()
    const userExists = existingUsers?.users?.some(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    )

    if (!userExists) {
      // New user: use inviteUserByEmail which sends an auth invite email
      const { error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: inviteUrl,
          data: {
            invited_to_org: true,
            org_name: result.org_name,
            org_role: role,
          },
        }
      )

      if (inviteError) {
        console.warn('[Team] Could not send invite email (user will need link):', inviteError.message)
      } else {
        emailSent = true
      }
    }
  } catch (err) {
    console.warn('[Team] Email sending failed, invite link still available:', err)
  }

  revalidatePath('/settings/team')
  return { ...result, emailSent }
}

/**
 * Accept an organization invitation using the token
 */
export async function acceptOrgInvitation(
  token: string
): Promise<AcceptInviteResult> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('accept_org_invitation', {
    p_token: token,
  })

  if (error) {
    console.error('[Team] Error accepting invitation:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath('/settings/team')
  revalidatePath('/dashboard')
  return data as AcceptInviteResult
}

/**
 * Get invitation details by token (for display before accepting)
 */
export async function getInvitationByToken(token: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('get_invitation_by_token', {
    p_token: token,
  })

  if (error) {
    console.error('[Team] Error getting invitation:', error)
    return {
      valid: false,
      error: error.message,
    }
  }

  return data
}

/**
 * Revoke a pending invitation
 */
export async function revokeOrgInvitation(inviteId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('revoke_org_invitation', {
    p_invite_id: inviteId,
  })

  if (error) {
    console.error('[Team] Error revoking invitation:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath('/settings/team')
  return data
}

/**
 * Remove a member from the organization
 */
export async function removeOrgMember(accountId: string, userId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('remove_org_member', {
    p_account_id: accountId,
    p_user_id: userId,
  })

  if (error) {
    console.error('[Team] Error removing member:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath('/settings/team')
  return data
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  accountId: string,
  userId: string,
  newRole: MemberRole
) {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('update_member_role', {
    p_account_id: accountId,
    p_user_id: userId,
    p_new_role: newRole,
  })

  if (error) {
    console.error('[Team] Error updating role:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath('/settings/team')
  return data
}

/**
 * Get all members of an organization
 */
export async function getOrgMembers(accountId: string): Promise<TeamMember[]> {
  const supabase = await createClient()

  // We need to query account_members and join with auth.users
  // Since we can't directly join auth.users, we'll use a workaround
  const { data: members, error } = await supabase
    .from('account_members')
    .select('id, user_id, role, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Team] Error fetching members:', error)
    return []
  }

  // For now, return members without user details
  // The frontend can fetch user details separately if needed
  return members.map((m) => ({
    ...m,
    user: {
      id: m.user_id,
      email: '', // Will be populated by the component
      raw_user_meta_data: {},
    },
  })) as TeamMember[]
}

/**
 * Get pending invitations for an organization
 */
export async function getOrgInvitations(
  accountId: string
): Promise<OrgInvitation[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('org_invitations')
    .select('*')
    .eq('account_id', accountId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Team] Error fetching invitations:', error)
    return []
  }

  return data as OrgInvitation[]
}

/**
 * Get the current user's role in an organization
 */
export async function getCurrentUserRole(
  accountId: string
): Promise<MemberRole | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('account_members')
    .select('role')
    .eq('account_id', accountId)
    .eq('user_id', user.id)
    .single()

  if (error) {
    console.error('[Team] Error fetching user role:', error)
    return null
  }

  return data?.role as MemberRole
}

/**
 * Get organization details including team settings
 */
export async function getOrgDetails(accountId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounts')
    .select(
      'id, name, display_name, slug, logo_url, description, allow_member_invites, default_member_role, member_count, plan'
    )
    .eq('id', accountId)
    .single()

  if (error) {
    console.error('[Team] Error fetching org details:', error)
    return null
  }

  return data
}

/**
 * Update organization settings
 */
export async function updateOrgSettings(
  accountId: string,
  settings: {
    display_name?: string
    description?: string
    logo_url?: string
    allow_member_invites?: boolean
    default_member_role?: InviteRole
  }
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('accounts')
    .update(settings)
    .eq('id', accountId)
    .select()
    .single()

  if (error) {
    console.error('[Team] Error updating org settings:', error)
    return {
      success: false,
      error: error.message,
    }
  }

  revalidatePath('/settings/team')
  return {
    success: true,
    data,
  }
}
