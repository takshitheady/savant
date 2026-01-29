-- ============================================================================
-- Migration: 013_org_invitations_rls.sql
-- Description: RLS policies for org_invitations table
-- ============================================================================

-- Enable RLS
ALTER TABLE public.org_invitations ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view all invitations for their orgs
CREATE POLICY "Org admins can view invitations"
ON public.org_invitations FOR SELECT
TO authenticated
USING (
    account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Users can view invitations sent to their email (for acceptance flow)
CREATE POLICY "Users can view own email invitations"
ON public.org_invitations FOR SELECT
TO authenticated
USING (
    LOWER(email) = LOWER((SELECT email FROM auth.users WHERE id = auth.uid()))
);

-- Note: INSERT, UPDATE, DELETE are handled via SECURITY DEFINER functions
-- No direct policies needed since all mutations go through functions

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION public.invite_user_to_org TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_org_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_org_member TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_role TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_org_invitation TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token TO authenticated;
-- Also allow anon to check invitation validity (before login)
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token TO anon;
