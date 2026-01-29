-- ============================================================================
-- Migration: 010_org_invitations_table.sql
-- Description: Add organization invitation system for team collaboration
-- ============================================================================

-- ============================================================================
-- TABLE: org_invitations
-- Description: Tracks pending invitations before users accept
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.org_invitations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.org_invitations(email);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.org_invitations(token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_account ON public.org_invitations(account_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_pending ON public.org_invitations(expires_at)
    WHERE accepted_at IS NULL;

-- Partial unique index: prevent duplicate pending invites to same email for same org
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_invitations_unique_pending
ON public.org_invitations(account_id, email)
WHERE accepted_at IS NULL;

-- Comments
COMMENT ON TABLE public.org_invitations IS 'Tracks pending organization invitations sent via email';
COMMENT ON COLUMN public.org_invitations.token IS 'Secure random token for invite link (32 bytes hex)';
COMMENT ON COLUMN public.org_invitations.expires_at IS 'Invitation expires after 7 days by default';
