-- ============================================================================
-- Migration: 005_rls_policies.sql
-- Description: Enable RLS and create all row-level security policies
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savant_prompt_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ACCOUNTS POLICIES
-- ============================================================================
CREATE POLICY "Users can view their accounts"
  ON public.accounts FOR SELECT
  TO public
  USING (id IN (SELECT get_user_account_ids()));

CREATE POLICY "Users can create accounts"
  ON public.accounts FOR INSERT
  TO public
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Account owners can update"
  ON public.accounts FOR UPDATE
  TO public
  USING (owner_id = auth.uid());

CREATE POLICY "Account owners can delete"
  ON public.accounts FOR DELETE
  TO public
  USING (owner_id = auth.uid());

CREATE POLICY "Anyone can view accounts with public savants"
  ON public.accounts FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM savants s
      WHERE s.account_id = accounts.id
        AND s.is_public = true
        AND s.is_active = true
    )
  );

-- ============================================================================
-- ACCOUNT_MEMBERS POLICIES
-- ============================================================================
CREATE POLICY "Users view their accounts members"
  ON public.account_members FOR SELECT
  TO authenticated
  USING (account_id IN (SELECT get_user_account_ids()));

CREATE POLICY "Users can manage own membership"
  ON public.account_members FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SAVANTS POLICIES
-- ============================================================================
CREATE POLICY "Members can view savants"
  ON public.savants FOR SELECT
  TO public
  USING (account_id IN (SELECT get_user_account_ids()));

CREATE POLICY "Anyone can view public savants"
  ON public.savants FOR SELECT
  TO public
  USING (is_public = true AND is_active = true);

CREATE POLICY "Members can create savants"
  ON public.savants FOR INSERT
  TO public
  WITH CHECK (is_account_member(account_id));

CREATE POLICY "Members can update savants"
  ON public.savants FOR UPDATE
  TO public
  USING (is_account_member(account_id));

CREATE POLICY "Members can delete savants"
  ON public.savants FOR DELETE
  TO public
  USING (is_account_member(account_id));

-- ============================================================================
-- DOCUMENTS POLICIES
-- ============================================================================
CREATE POLICY "Members can view documents"
  ON public.documents FOR SELECT
  TO public
  USING (account_id IN (SELECT get_user_account_ids()));

CREATE POLICY "Members can create documents"
  ON public.documents FOR INSERT
  TO public
  WITH CHECK (is_account_member(account_id));

CREATE POLICY "Members can update documents"
  ON public.documents FOR UPDATE
  TO public
  USING (is_account_member(account_id));

CREATE POLICY "Members can delete documents"
  ON public.documents FOR DELETE
  TO public
  USING (is_account_member(account_id));

-- ============================================================================
-- DOCUMENT_CHUNKS POLICIES
-- ============================================================================
CREATE POLICY "Members can view chunks"
  ON public.document_chunks FOR SELECT
  TO public
  USING (account_id IN (SELECT get_user_account_ids()));

CREATE POLICY "System can insert chunks"
  ON public.document_chunks FOR INSERT
  TO public
  WITH CHECK (is_account_member(account_id));

CREATE POLICY "System can delete chunks"
  ON public.document_chunks FOR DELETE
  TO public
  USING (is_account_member(account_id));

-- ============================================================================
-- CONVERSATIONS POLICIES
-- ============================================================================
CREATE POLICY "Members can view conversations"
  ON public.conversations FOR SELECT
  TO public
  USING (account_id IN (SELECT get_user_account_ids()));

CREATE POLICY "Anyone can create conversations"
  ON public.conversations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Members can update conversations"
  ON public.conversations FOR UPDATE
  TO public
  USING (is_account_member(account_id));

-- ============================================================================
-- MESSAGES POLICIES
-- ============================================================================
CREATE POLICY "Members can view messages"
  ON public.messages FOR SELECT
  TO public
  USING (account_id IN (SELECT get_user_account_ids()));

CREATE POLICY "Anyone can insert messages"
  ON public.messages FOR INSERT
  TO public
  WITH CHECK (true);

-- ============================================================================
-- ACCOUNT_PROMPTS POLICIES
-- ============================================================================
CREATE POLICY "Members can view prompts"
  ON public.account_prompts FOR SELECT
  TO public
  USING (is_account_member(account_id));

CREATE POLICY "Members can manage prompts"
  ON public.account_prompts FOR ALL
  TO public
  USING (is_account_member(account_id));

-- ============================================================================
-- SAVANT_PROMPT_LINKS POLICIES
-- ============================================================================
CREATE POLICY "Members can view prompt links"
  ON public.savant_prompt_links FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM savants
      WHERE savants.id = savant_prompt_links.savant_id
        AND is_account_member(savants.account_id)
    )
  );

CREATE POLICY "Members can manage prompt links"
  ON public.savant_prompt_links FOR ALL
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM savants
      WHERE savants.id = savant_prompt_links.savant_id
        AND is_account_member(savants.account_id)
    )
  );

-- ============================================================================
-- API_KEYS POLICIES
-- ============================================================================
CREATE POLICY "Members can view api keys"
  ON public.api_keys FOR SELECT
  TO public
  USING (is_account_member(account_id));

CREATE POLICY "Members can manage api keys"
  ON public.api_keys FOR ALL
  TO public
  USING (is_account_member(account_id));

-- ============================================================================
-- USAGE_RECORDS POLICIES
-- ============================================================================
CREATE POLICY "Members can view usage"
  ON public.usage_records FOR SELECT
  TO public
  USING (is_account_member(account_id));

CREATE POLICY "System can insert usage"
  ON public.usage_records FOR INSERT
  TO public
  WITH CHECK (true);

-- ============================================================================
-- AGENT_SESSIONS POLICIES
-- ============================================================================
CREATE POLICY "Users can access own sessions"
  ON public.agent_sessions FOR ALL
  TO public
  USING (user_id = auth.uid()::text)
  WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "Service role full access"
  ON public.agent_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- STORE_CATEGORIES POLICIES
-- ============================================================================
CREATE POLICY "Anyone can read active categories"
  ON public.store_categories FOR SELECT
  TO public
  USING (is_active = true);

-- ============================================================================
-- STORE_LISTINGS POLICIES
-- ============================================================================
CREATE POLICY "Anyone can read public listings"
  ON public.store_listings FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM savants s
      WHERE s.id = store_listings.savant_id
        AND s.is_public = true
        AND s.is_active = true
    )
  );

CREATE POLICY "Owners can insert their listings"
  ON public.store_listings FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM savants s
      JOIN account_members am ON am.account_id = s.account_id
      WHERE s.id = store_listings.savant_id
        AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their listings"
  ON public.store_listings FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM savants s
      JOIN account_members am ON am.account_id = s.account_id
      WHERE s.id = store_listings.savant_id
        AND am.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete their listings"
  ON public.store_listings FOR DELETE
  TO public
  USING (
    EXISTS (
      SELECT 1
      FROM savants s
      JOIN account_members am ON am.account_id = s.account_id
      WHERE s.id = store_listings.savant_id
        AND am.user_id = auth.uid()
    )
  );

-- ============================================================================
-- STORE_REVIEWS POLICIES
-- ============================================================================
CREATE POLICY "Anyone can read visible reviews"
  ON public.store_reviews FOR SELECT
  TO public
  USING (is_visible = true);

CREATE POLICY "Authenticated users can create reviews"
  ON public.store_reviews FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON public.store_reviews FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON public.store_reviews FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- ============================================================================
-- STORE_IMPORTS POLICIES
-- ============================================================================
CREATE POLICY "Users can read own imports"
  ON public.store_imports FOR SELECT
  TO public
  USING (auth.uid() = imported_by_user_id);

CREATE POLICY "System can insert imports"
  ON public.store_imports FOR INSERT
  TO public
  WITH CHECK (true);

-- ============================================================================
-- CREATOR_PROFILES POLICIES
-- ============================================================================
CREATE POLICY "Anyone can read creator profiles"
  ON public.creator_profiles FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Account members can insert profile"
  ON public.creator_profiles FOR INSERT
  TO public
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM account_members
      WHERE account_members.account_id = creator_profiles.account_id
        AND account_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Account members can update profile"
  ON public.creator_profiles FOR UPDATE
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM account_members
      WHERE account_members.account_id = creator_profiles.account_id
        AND account_members.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Verification: Check all policies were created
-- ============================================================================
-- Run this query to verify:
-- SELECT schemaname, tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
