# Supabase Migration Guide: Complete Database Schema Transfer

This directory contains all SQL migration files needed to replicate your Supabase database schema to a new project. This is a **schema-only migration** - no user data, conversations, or documents will be transferred.

## 📋 What's Included

- ✅ 17 database tables with all columns, constraints, and indexes
- ✅ 12 custom functions (including vector search, auth, and queue functions)
- ✅ 6 triggers (auto-update timestamps and rating stats)
- ✅ 47+ RLS policies (comprehensive row-level security)
- ✅ Storage bucket configuration (documents bucket with policies)
- ✅ PGMQ queue setup (document_processing queue)
- ✅ Seed data (10 marketplace categories)
- ✅ 7 PostgreSQL extensions (vector, pgmq, pgcrypto, etc.)

## 📦 Migration Files (Execute in Order)

| File | Description | What It Does |
|------|-------------|--------------|
| `001_extensions.sql` | PostgreSQL extensions | Enables pgcrypto, uuid-ossp, vector, pgmq, pg_graphql, supabase_vault, pg_stat_statements |
| `002_tables_and_indexes.sql` | Database tables | Creates all 17 tables with indexes and foreign keys |
| `003_functions.sql` | Custom functions | Creates 12 functions for auth, vector search, queues, and store operations |
| `004_triggers.sql` | Database triggers | Creates 6 triggers for auto-updates and rating calculations |
| `005_rls_policies.sql` | Row-level security | Enables RLS and creates 47+ security policies |
| `006_storage_setup.sql` | Storage configuration | Creates documents bucket and storage access policies |
| `007_pgmq_setup.sql` | Message queues | Sets up document_processing queue |
| `008_seed_data.sql` | Seed data | Inserts 10 marketplace categories |

## 🚀 Step-by-Step Migration Instructions

### Prerequisites

1. **Create a new Supabase project** (if you haven't already)
2. **Note your project details:**
   - Project Reference ID (from Settings → General)
   - Project API URL (from Settings → API)
   - `anon` public key (from Settings → API)
   - `service_role` secret key (from Settings → API)

### Step 1: Access SQL Editor

1. Log into your new Supabase project dashboard at https://supabase.com
2. Navigate to **SQL Editor** in the left sidebar
3. You'll use this to run each migration file

### Step 2: Run Migrations in Order

**IMPORTANT:** Execute each file in the exact order listed below. Do not skip any files.

#### 2.1 Enable Extensions (001_extensions.sql)

```sql
-- Copy the contents of 001_extensions.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT extname, extversion FROM pg_extension
WHERE extname IN ('pgcrypto', 'uuid-ossp', 'vector', 'pg_stat_statements', 'supabase_vault', 'pg_graphql', 'pgmq');
```

You should see 7 extensions listed.

#### 2.2 Create Tables and Indexes (002_tables_and_indexes.sql)

```sql
-- Copy the contents of 002_tables_and_indexes.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
```

You should see 17 tables: accounts, account_members, savants, documents, document_chunks, conversations, messages, account_prompts, savant_prompt_links, api_keys, usage_records, agent_sessions, store_categories, store_listings, store_reviews, store_imports, creator_profiles.

#### 2.3 Create Functions (003_functions.sql)

```sql
-- Copy the contents of 003_functions.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT proname FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;
```

You should see 12 functions including `is_account_member`, `match_chunks`, `clone_savant_from_store`, etc.

#### 2.4 Create Triggers (004_triggers.sql)

```sql
-- Copy the contents of 004_triggers.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT trigger_name, event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

You should see 6 triggers.

**⚠️ CRITICAL: Set Up Auth Trigger**

The `handle_new_user` trigger MUST be created manually via the Supabase Dashboard:

1. Go to **Database → Database Webhooks**
2. Click **"Create a new hook"**
3. Configure:
   - **Name:** `handle_new_user`
   - **Table:** `auth.users`
   - **Events:** `INSERT`
   - **Type:** `Trigger`
   - **Function:** `public.handle_new_user()`
4. Click **Save**

This trigger is essential for new user signup to work properly!

#### 2.5 Apply RLS Policies (005_rls_policies.sql)

```sql
-- Copy the contents of 005_rls_policies.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

You should see 47+ policies across all tables.

#### 2.6 Configure Storage (006_storage_setup.sql)

```sql
-- Copy the contents of 006_storage_setup.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT * FROM storage.buckets WHERE id = 'documents';
```

You should see the documents bucket.

**Alternative:** If SQL insertion fails, create the bucket manually:
1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Name: `documents`
4. Privacy: **Private**
5. Click **Save**

Then run just the policy section of 006_storage_setup.sql.

#### 2.7 Set Up Message Queues (007_pgmq_setup.sql)

```sql
-- Copy the contents of 007_pgmq_setup.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT * FROM pgmq.list_queues();
```

You should see `document_processing` queue.

#### 2.8 Seed Categories (008_seed_data.sql)

```sql
-- Copy the contents of 008_seed_data.sql and run in SQL Editor
```

**Verification:**
```sql
SELECT name, slug, display_order FROM store_categories ORDER BY display_order;
```

You should see 10 categories: Writing, Coding, Research, Business, Education, Creative, Productivity, Customer Support, Marketing, Other.

### Step 3: Update Application Configuration

#### 3.1 Update `.mcp.json` (for MCP server access)

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server", "YOUR_NEW_PROJECT_REF_ID"]
    }
  }
}
```

Replace `YOUR_NEW_PROJECT_REF_ID` with your new project reference ID.

#### 3.2 Update Environment Variables

Update your `.env`, `.env.local`, or wherever you store environment variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_NEW_PROJECT_REF_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_new_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_new_service_role_key_here

# Database URL (if using direct connections)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.YOUR_NEW_PROJECT_REF_ID.supabase.co:5432/postgres
```

Get these values from: **Project Settings → API**

#### 3.3 Update Supabase Client Configuration

Find and update any files that initialize the Supabase client (typically `lib/supabase.ts` or similar):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

Make sure these are reading from the updated environment variables.

### Step 4: Test Everything

Run through these tests to verify the migration worked:

#### 4.1 Test User Signup
1. Start your application
2. Navigate to the signup page
3. Create a test user account
4. **Expected:** User is created, account is auto-created, user is added as account owner

**Verify:**
```sql
SELECT u.email, a.name as account_name, am.role
FROM auth.users u
JOIN accounts a ON a.owner_id = u.id
JOIN account_members am ON am.user_id = u.id AND am.account_id = a.id
ORDER BY u.created_at DESC
LIMIT 1;
```

#### 4.2 Test Savant Creation
1. Log in with your test user
2. Create a new savant
3. Add a system prompt
4. **Expected:** Savant is created successfully

**Verify:**
```sql
SELECT name, slug, is_active FROM savants ORDER BY created_at DESC LIMIT 1;
```

#### 4.3 Test Document Upload
1. Navigate to a savant
2. Upload a test document (PDF, TXT, etc.)
3. **Expected:** Document is uploaded to storage, metadata is saved

**Verify:**
```sql
SELECT name, file_type, status FROM documents ORDER BY created_at DESC LIMIT 1;
```

#### 4.4 Test Vector Search (if you have documents with embeddings)
```sql
-- Test vector similarity search
SELECT * FROM match_chunks(
  '[0.1, 0.2, 0.3, ...]'::vector(1536),  -- Replace with actual embedding
  'your-savant-id'::uuid,
  0.7,
  5
);
```

#### 4.5 Test Conversations
1. Start a chat with a savant
2. Send a message
3. **Expected:** Conversation and messages are created

**Verify:**
```sql
SELECT c.id, c.title, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON m.conversation_id = c.id
GROUP BY c.id, c.title
ORDER BY c.created_at DESC
LIMIT 1;
```

#### 4.6 Test Store Categories
1. Navigate to the marketplace/store
2. **Expected:** You should see 10 categories

**Verify:**
```sql
SELECT COUNT(*) FROM store_categories WHERE is_active = true;
```

## 🔍 Common Issues and Troubleshooting

### Issue: Extensions fail to enable

**Solution:** Some extensions require special permissions. Try enabling them via the Supabase UI:
1. Go to **Database → Extensions**
2. Search for the extension name
3. Click **Enable**

### Issue: Foreign key constraints fail

**Solution:** Make sure you ran the migrations in the exact order specified. If you need to start over:
1. Drop all tables in reverse order (or use cascade)
2. Re-run migrations from the beginning

### Issue: RLS policies fail with function errors

**Solution:** Ensure all functions (003_functions.sql) were created successfully before running 005_rls_policies.sql. RLS policies depend on `is_account_member()` and `get_user_account_ids()`.

### Issue: Storage bucket creation fails

**Solution:** Create the bucket manually via the Storage UI, then run only the policy section of 006_storage_setup.sql.

### Issue: PGMQ queue creation fails

**Solution:** Verify that the pgmq extension is installed and enabled. Check with:
```sql
SELECT * FROM pg_extension WHERE extname = 'pgmq';
```

### Issue: New user signup doesn't create account

**Solution:** Make sure you created the `handle_new_user` auth trigger via Database Webhooks (see Step 2.4).

## 📊 What's NOT Migrated

This is a schema-only migration. The following data is NOT transferred:

- ❌ User accounts and authentication data
- ❌ Existing savants and their configurations
- ❌ Conversations and chat history
- ❌ Documents and their vector embeddings
- ❌ Storage files (documents bucket will be empty)
- ❌ API keys
- ❌ Usage records
- ❌ Store listings and reviews
- ❌ Agent session data

You'll start with a completely fresh database that has the same structure as your old one.

## 🎯 Post-Migration Checklist

- [ ] All 8 migration files executed successfully
- [ ] Auth trigger (`handle_new_user`) created via Database Webhooks
- [ ] Environment variables updated in all applications
- [ ] `.mcp.json` updated with new project reference ID
- [ ] Test user signup creates account automatically
- [ ] Can create savants
- [ ] Can upload documents (even if processing isn't complete)
- [ ] Can create conversations and messages
- [ ] Store categories are visible
- [ ] No console errors in application

## 🆘 Need Help?

If you encounter issues during migration:

1. **Check the verification queries** after each migration step
2. **Review the Supabase logs** (Database → Logs)
3. **Check browser console** for frontend errors
4. **Verify environment variables** are correctly set
5. **Test database connectivity** from your application

## 🔒 Security Notes

Your new database includes comprehensive security:
- ✅ Row-level security (RLS) enabled on all tables
- ✅ Account-based access control
- ✅ Security definer functions for safe operations
- ✅ Private storage bucket with authenticated access only

**Optional Security Improvements:**

1. **Enable leaked password protection** in Auth settings
2. **Set search_path on functions** to prevent schema injection
3. **Review overly permissive policies** (policies with `WITH CHECK (true)`)

## 📝 Next Steps

After successful migration:

1. **Test thoroughly** - Run through all major user flows
2. **Deploy to production** - Update production environment variables
3. **Monitor for errors** - Watch logs for any RLS policy issues
4. **Populate initial data** - Create your first savants and test documents
5. **Set up marketplace** - If using the store, publish some savants

## 📄 File Reference

All migration files are in this directory:
```
supabase/migrations/new-project/
├── README.md (this file)
├── 001_extensions.sql
├── 002_tables_and_indexes.sql
├── 003_functions.sql
├── 004_triggers.sql
├── 005_rls_policies.sql
├── 006_storage_setup.sql
├── 007_pgmq_setup.sql
└── 008_seed_data.sql
```

---

**Migration completed successfully?** 🎉 Your new Supabase project is ready to use!
