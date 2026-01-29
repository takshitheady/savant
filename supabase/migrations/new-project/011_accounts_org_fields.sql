-- ============================================================================
-- Migration: 011_accounts_org_fields.sql
-- Description: Add organization-specific fields to accounts table
-- ============================================================================

-- Add organization display and settings fields
ALTER TABLE public.accounts
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT,
    ADD COLUMN IF NOT EXISTS allow_member_invites BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS default_member_role TEXT DEFAULT 'member',
    ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1;

-- Update existing accounts: set display_name from name if null
UPDATE public.accounts
SET display_name = name
WHERE display_name IS NULL;

-- Update member_count based on actual members
UPDATE public.accounts a
SET member_count = (
    SELECT COUNT(*)
    FROM public.account_members am
    WHERE am.account_id = a.id
);

-- Comments
COMMENT ON COLUMN public.accounts.display_name IS 'Organization display name (e.g., "Acme Corp")';
COMMENT ON COLUMN public.accounts.logo_url IS 'Organization logo URL for branding';
COMMENT ON COLUMN public.accounts.description IS 'About the organization';
COMMENT ON COLUMN public.accounts.allow_member_invites IS 'Whether members (not just admins) can invite others';
COMMENT ON COLUMN public.accounts.default_member_role IS 'Default role for new members';
COMMENT ON COLUMN public.accounts.member_count IS 'Denormalized count of members for performance';
