import { createClient } from '@supabase/supabase-js'

/**
 * Admin Supabase client with SERVICE_ROLE_KEY
 *
 * This client bypasses Row Level Security (RLS) and should only be used
 * in server-side code where we manually verify authorization.
 *
 * IMPORTANT: Never expose this client or the SERVICE_ROLE_KEY to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
