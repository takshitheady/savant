-- ============================================================================
-- Migration: 004_triggers.sql
-- Description: Create all database triggers
-- ============================================================================

-- ============================================================================
-- TRIGGER: accounts_updated_at
-- Description: Auto-update updated_at on accounts table
-- ============================================================================
CREATE TRIGGER accounts_updated_at
  BEFORE UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: savants_updated_at
-- Description: Auto-update updated_at on savants table
-- ============================================================================
CREATE TRIGGER savants_updated_at
  BEFORE UPDATE ON public.savants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: documents_updated_at
-- Description: Auto-update updated_at on documents table
-- ============================================================================
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: conversations_updated_at
-- Description: Auto-update updated_at on conversations table
-- ============================================================================
CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: account_prompts_updated_at
-- Description: Auto-update updated_at on account_prompts table
-- ============================================================================
CREATE TRIGGER account_prompts_updated_at
  BEFORE UPDATE ON public.account_prompts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- TRIGGER: update_rating_stats_trigger
-- Description: Update listing and creator rating stats when reviews change
-- ============================================================================
CREATE TRIGGER update_rating_stats_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.store_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_listing_rating_stats();

-- ============================================================================
-- IMPORTANT: Auth Trigger Setup (Manual Step Required)
-- ============================================================================
-- The handle_new_user trigger CANNOT be created via SQL because it needs to
-- trigger on the auth.users table, which requires special permissions.
--
-- You MUST create this trigger manually via the Supabase Dashboard:
--
-- 1. Go to Database → Database Webhooks in the Supabase Dashboard
-- 2. Click "Create a new hook"
-- 3. Configure:
--    - Name: handle_new_user
--    - Table: auth.users
--    - Events: INSERT
--    - Type: Trigger
--    - Function: public.handle_new_user()
-- 4. Save
--
-- This trigger is CRITICAL for user signup to work properly!
-- Without it, new users will not have accounts created automatically.
-- ============================================================================

-- ============================================================================
-- Verification: Check all triggers were created
-- ============================================================================
-- Run this query to verify:
-- SELECT trigger_name, event_object_table, event_manipulation
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- ORDER BY event_object_table, trigger_name;
