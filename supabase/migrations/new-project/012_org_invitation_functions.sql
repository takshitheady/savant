-- ============================================================================
-- Migration: 012_org_invitation_functions.sql
-- Description: Functions for organization invitation management
-- ============================================================================

-- ============================================================================
-- FUNCTION: invite_user_to_org
-- Description: Creates an invitation for a user to join an organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.invite_user_to_org(
    p_account_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_invite_id UUID;
    v_token TEXT;
    v_caller_role TEXT;
    v_org_name TEXT;
BEGIN
    -- Validate role
    IF p_role NOT IN ('admin', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role. Must be admin, member, or viewer.';
    END IF;

    -- Get caller's role in this account
    SELECT role INTO v_caller_role
    FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid();

    -- Permission check: only owners and admins can invite
    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this organization';
    END IF;

    IF v_caller_role NOT IN ('owner', 'admin') THEN
        -- Check if members can invite (org setting)
        IF NOT (SELECT COALESCE(allow_member_invites, false) FROM accounts WHERE id = p_account_id) THEN
            RAISE EXCEPTION 'You do not have permission to invite users';
        END IF;
    END IF;

    -- Check if user already exists and is a member
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE LOWER(u.email) = LOWER(p_email);

    IF v_user_id IS NOT NULL THEN
        -- Check if already a member
        IF EXISTS (
            SELECT 1 FROM account_members
            WHERE account_id = p_account_id AND user_id = v_user_id
        ) THEN
            RAISE EXCEPTION 'User is already a member of this organization';
        END IF;
    END IF;

    -- Check for existing pending invite
    IF EXISTS (
        SELECT 1 FROM org_invitations
        WHERE account_id = p_account_id
            AND LOWER(email) = LOWER(p_email)
            AND accepted_at IS NULL
            AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'An invitation is already pending for this email';
    END IF;

    -- Generate secure token (64 character hex string)
    v_token := encode(extensions.gen_random_bytes(32), 'hex');

    -- Get org name for response
    SELECT COALESCE(display_name, name) INTO v_org_name
    FROM accounts WHERE id = p_account_id;

    -- Create invitation
    INSERT INTO org_invitations (account_id, email, role, invited_by, token)
    VALUES (p_account_id, LOWER(p_email), p_role, auth.uid(), v_token)
    RETURNING id INTO v_invite_id;

    RETURN jsonb_build_object(
        'success', true,
        'invite_id', v_invite_id,
        'token', v_token,
        'email', LOWER(p_email),
        'role', p_role,
        'org_name', v_org_name
    );
END;
$$;

-- ============================================================================
-- FUNCTION: accept_org_invitation
-- Description: Accepts an organization invitation using the token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.accept_org_invitation(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite org_invitations%ROWTYPE;
    v_membership_id UUID;
    v_user_email TEXT;
    v_org_name TEXT;
BEGIN
    -- Get caller's email
    SELECT email INTO v_user_email
    FROM auth.users WHERE id = auth.uid();

    IF v_user_email IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;

    -- Get and validate invitation
    SELECT * INTO v_invite
    FROM org_invitations
    WHERE token = p_token
        AND accepted_at IS NULL
        AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Verify caller's email matches invitation (case-insensitive)
    IF LOWER(v_user_email) != LOWER(v_invite.email) THEN
        RAISE EXCEPTION 'This invitation was sent to a different email address (%). Please log in with that email.', v_invite.email;
    END IF;

    -- Get org name
    SELECT COALESCE(display_name, name) INTO v_org_name
    FROM accounts WHERE id = v_invite.account_id;

    -- Check if already a member (edge case: joined via another invite)
    IF EXISTS (
        SELECT 1 FROM account_members
        WHERE account_id = v_invite.account_id AND user_id = auth.uid()
    ) THEN
        -- Mark invite as accepted anyway
        UPDATE org_invitations
        SET accepted_at = NOW(), accepted_by = auth.uid()
        WHERE id = v_invite.id;

        RETURN jsonb_build_object(
            'success', true,
            'message', 'You are already a member of this organization',
            'account_id', v_invite.account_id,
            'org_name', v_org_name,
            'already_member', true
        );
    END IF;

    -- Add user to organization
    INSERT INTO account_members (account_id, user_id, role)
    VALUES (v_invite.account_id, auth.uid(), v_invite.role)
    RETURNING id INTO v_membership_id;

    -- Mark invitation as accepted
    UPDATE org_invitations
    SET accepted_at = NOW(), accepted_by = auth.uid()
    WHERE id = v_invite.id;

    -- Update member count
    UPDATE accounts
    SET member_count = COALESCE(member_count, 0) + 1
    WHERE id = v_invite.account_id;

    RETURN jsonb_build_object(
        'success', true,
        'account_id', v_invite.account_id,
        'org_name', v_org_name,
        'role', v_invite.role,
        'membership_id', v_membership_id,
        'already_member', false
    );
END;
$$;

-- ============================================================================
-- FUNCTION: remove_org_member
-- Description: Removes a member from an organization (or self-leave)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.remove_org_member(
    p_account_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    -- Get caller's role
    SELECT role INTO v_caller_role
    FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid();

    -- Get target's role
    SELECT role INTO v_target_role
    FROM account_members
    WHERE account_id = p_account_id AND user_id = p_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;

    -- Permission checks
    IF v_caller_role IS NULL THEN
        RAISE EXCEPTION 'You are not a member of this organization';
    END IF;

    -- Self-removal (leaving the org)
    IF p_user_id = auth.uid() THEN
        IF v_target_role = 'owner' THEN
            -- Check if there are other owners
            IF NOT EXISTS (
                SELECT 1 FROM account_members
                WHERE account_id = p_account_id
                    AND role = 'owner'
                    AND user_id != p_user_id
            ) THEN
                RAISE EXCEPTION 'Cannot leave: you are the only owner. Transfer ownership first.';
            END IF;
        END IF;
    ELSE
        -- Removing someone else requires owner/admin
        IF v_caller_role NOT IN ('owner', 'admin') THEN
            RAISE EXCEPTION 'Only owners and admins can remove members';
        END IF;

        -- Admins cannot remove owners
        IF v_caller_role = 'admin' AND v_target_role = 'owner' THEN
            RAISE EXCEPTION 'Admins cannot remove owners';
        END IF;
    END IF;

    -- Remove the member
    DELETE FROM account_members
    WHERE account_id = p_account_id AND user_id = p_user_id;

    -- Update member count
    UPDATE accounts
    SET member_count = GREATEST(COALESCE(member_count, 1) - 1, 0)
    WHERE id = p_account_id;

    RETURN jsonb_build_object(
        'success', true,
        'removed_user_id', p_user_id,
        'was_self_removal', p_user_id = auth.uid()
    );
END;
$$;

-- ============================================================================
-- FUNCTION: update_member_role
-- Description: Changes a member's role in the organization
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_member_role(
    p_account_id UUID,
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    -- Validate role
    IF p_new_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %. Must be owner, admin, member, or viewer.', p_new_role;
    END IF;

    -- Get caller's role
    SELECT role INTO v_caller_role
    FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid();

    -- Get target's current role
    SELECT role INTO v_target_role
    FROM account_members
    WHERE account_id = p_account_id AND user_id = p_user_id;

    IF v_target_role IS NULL THEN
        RAISE EXCEPTION 'User is not a member of this organization';
    END IF;

    -- Permission checks: only owners can change roles
    IF v_caller_role != 'owner' THEN
        RAISE EXCEPTION 'Only owners can change member roles';
    END IF;

    -- Cannot change your own role if you're the only owner
    IF p_user_id = auth.uid() AND v_target_role = 'owner' AND p_new_role != 'owner' THEN
        IF NOT EXISTS (
            SELECT 1 FROM account_members
            WHERE account_id = p_account_id
                AND role = 'owner'
                AND user_id != p_user_id
        ) THEN
            RAISE EXCEPTION 'Cannot demote: organization must have at least one owner';
        END IF;
    END IF;

    -- Demoting from owner (not self)
    IF v_target_role = 'owner' AND p_new_role != 'owner' AND p_user_id != auth.uid() THEN
        -- Check if there will be at least one owner left
        IF NOT EXISTS (
            SELECT 1 FROM account_members
            WHERE account_id = p_account_id
                AND role = 'owner'
                AND user_id != p_user_id
        ) THEN
            RAISE EXCEPTION 'Cannot demote: organization must have at least one owner';
        END IF;
    END IF;

    -- Update the role
    UPDATE account_members
    SET role = p_new_role
    WHERE account_id = p_account_id AND user_id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'old_role', v_target_role,
        'new_role', p_new_role
    );
END;
$$;

-- ============================================================================
-- FUNCTION: revoke_org_invitation
-- Description: Revokes a pending invitation
-- ============================================================================
CREATE OR REPLACE FUNCTION public.revoke_org_invitation(
    p_invite_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite org_invitations%ROWTYPE;
    v_caller_role TEXT;
BEGIN
    -- Get invitation
    SELECT * INTO v_invite
    FROM org_invitations
    WHERE id = p_invite_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invitation not found';
    END IF;

    IF v_invite.accepted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Invitation has already been accepted';
    END IF;

    -- Get caller's role
    SELECT role INTO v_caller_role
    FROM account_members
    WHERE account_id = v_invite.account_id AND user_id = auth.uid();

    -- Permission check: only owners and admins can revoke
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        RAISE EXCEPTION 'Only owners and admins can revoke invitations';
    END IF;

    -- Delete the invitation
    DELETE FROM org_invitations WHERE id = p_invite_id;

    RETURN jsonb_build_object(
        'success', true,
        'revoked_invite_id', p_invite_id,
        'email', v_invite.email
    );
END;
$$;

-- ============================================================================
-- FUNCTION: get_invitation_by_token
-- Description: Gets invitation details by token (for display before accepting)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(
    p_token TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_invite org_invitations%ROWTYPE;
    v_org_name TEXT;
    v_org_logo TEXT;
    v_inviter_email TEXT;
BEGIN
    -- Get invitation
    SELECT * INTO v_invite
    FROM org_invitations
    WHERE token = p_token;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invitation not found'
        );
    END IF;

    IF v_invite.accepted_at IS NOT NULL THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invitation has already been accepted'
        );
    END IF;

    IF v_invite.expires_at < NOW() THEN
        RETURN jsonb_build_object(
            'valid', false,
            'error', 'Invitation has expired'
        );
    END IF;

    -- Get org details
    SELECT COALESCE(display_name, name), logo_url
    INTO v_org_name, v_org_logo
    FROM accounts WHERE id = v_invite.account_id;

    -- Get inviter email
    SELECT email INTO v_inviter_email
    FROM auth.users WHERE id = v_invite.invited_by;

    RETURN jsonb_build_object(
        'valid', true,
        'invite_id', v_invite.id,
        'email', v_invite.email,
        'role', v_invite.role,
        'org_name', v_org_name,
        'org_logo', v_org_logo,
        'inviter_email', v_inviter_email,
        'expires_at', v_invite.expires_at,
        'account_id', v_invite.account_id
    );
END;
$$;
