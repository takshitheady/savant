# Security Audit: Imported Savant Infrastructure

**Date:** 2026-01-25
**Scope:** Verify that imported savants properly hide base prompts and admin documents while still using them in chat/RAG

---

## Executive Summary

### ✅ What Works Correctly

1. **Backend Agent Creation** - Base + user prompts are properly combined
2. **RAG Search** - Both admin and user documents are searched
3. **Document Upload** - Users can add their own documents
4. **Document UI Filtering** - Admin documents are hidden from document list
5. **Database Structure** - Clone function properly copies and marks admin content

### ❌ CRITICAL SECURITY FLAW FOUND

**The base_system_prompt is accessible to users via frontend queries!**

While admin documents are properly filtered, the base system prompt that should be hidden is being fetched by the frontend and sent to the browser. Users can view it via browser DevTools.

---

## Detailed Findings

### 1. Database Schema ✅ CORRECT

**Savants Table:**
- `base_system_prompt` (TEXT) - Hidden admin instructions
- `user_system_prompt` (TEXT) - User's custom instructions
- `is_template` (BOOLEAN) - Identifies templates
- `cloned_from_id` (UUID) - Links instance to template
- `template_version` (INTEGER) - Tracks version

**Documents Table:**
- `is_admin_document` (BOOLEAN, default: false) - Marks admin docs
- `is_visible_to_user` (BOOLEAN, default: true) - Controls UI visibility
- `template_document_id` (UUID) - Links to template document

**Document Chunks Table:**
- No special filtering - all chunks for a savant_id are searched in RAG

---

### 2. Clone Function ✅ CORRECT

**Function:** `clone_template_savant(p_template_id, p_target_account_id, p_custom_name)`

**What it does:**
1. Copies `base_system_prompt` from template to instance ✅
2. Sets `user_system_prompt` to NULL (user starts with no custom prompt) ✅
3. Copies documents with:
   - `is_admin_document = true` ✅
   - `is_visible_to_user = false` ✅
   - `template_document_id` linking to original ✅
4. Copies document_chunks with embeddings ✅
5. Links instance via `cloned_from_id` ✅

**Test Result:** Instance `9a6d9574-5ecc-4916-954f-d9a4e737ab3f` has:
- base_system_prompt: 6049 characters ✅
- user_system_prompt: NULL ✅
- 14 admin documents (all marked `is_admin_document = true`) ✅
- 10 document chunks with embeddings ✅

---

### 3. Backend Agent Creation ✅ CORRECT

**File:** `backend/app/agents/savant_agent_factory.py`

**Lines 71-76:** Fetches savant using `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS) ✅

**Lines 84-95:** Combines prompts correctly:
```python
base_prompt = savant_data.get('base_system_prompt')
user_prompt = savant_data.get('user_system_prompt')

savant_prompt_parts = []
if base_prompt:
    savant_prompt_parts.append(base_prompt)
if user_prompt:
    savant_prompt_parts.append("--- User Customizations ---")
    savant_prompt_parts.append(user_prompt)

savant_prompt = "\n\n".join(savant_prompt_parts)
```

**Result:** At runtime, the agent receives `base_prompt + user_prompt` ✅

---

### 4. RAG Search ✅ CORRECT

**File:** `backend/app/tools/rag_tool.py`

**Lines 62-67:** Calls `match_chunks` RPC:
```python
result = supabase.rpc('match_chunks', {
    'query_embedding': query_embedding,
    'p_savant_id': savant_id,
    'match_threshold': 0.78,
    'match_count': top_k
}).execute()
```

**Database Function:** `match_chunks(query_embedding, p_savant_id, ...)`
- Uses `SECURITY DEFINER` (bypasses RLS) ✅
- Filters by `savant_id` only (searches ALL documents for that savant) ✅
- Returns chunks from BOTH admin and user documents ✅

**Test Result:** RAG query on instance `9a6d9574...` returns:
```
document_name: "Inbound Public Relations Guide-V3.pdf"
is_admin_document: true
is_visible_to_user: false
```

**This is CORRECT behavior!** We want RAG to search admin documents even though they're hidden from UI.

---

### 5. Document UI Filtering ✅ CORRECT

**File:** `frontend/src/app/(dashboard)/savants/[id]/page.tsx`

**Lines 56-68:** Fetches savant and documents:
```typescript
const { data: savant } = await adminSupabase
  .from('savants')
  .select(`
    *,
    documents:documents(id, name, file_size, created_at, is_visible_to_user)
  `)

// Filter out admin documents in code
if (savant?.documents) {
  savant.documents = savant.documents.filter((doc: any) =>
    doc.is_visible_to_user === true
  )
}
```

**Result:** Admin documents are removed before passing to client component ✅

---

### 6. ❌ CRITICAL FLAW: Base Prompt Exposure

**File:** `frontend/src/components/savants/savant-prompts.tsx`

**Lines 41-50:**
```typescript
const { data: savantData } = await supabase
  .from('savants')
  .select('user_system_prompt, base_system_prompt, model_config, cloned_from_id, is_template')
  .eq('id', savantId)
  .single()

// Only show user_system_prompt (base_system_prompt is hidden)
if (savantData?.user_system_prompt) {
  setCurrentPrompt(savantData.user_system_prompt)
  setNewPrompt(savantData.user_system_prompt)
}
```

**PROBLEM:**
1. Line 43 fetches `base_system_prompt` from database ❌
2. RLS policy allows members to SELECT all columns from their account's savants ❌
3. `base_system_prompt` is sent to browser in API response ❌
4. While not displayed in UI, it's visible in:
   - Browser DevTools → Network tab → Supabase API response
   - React DevTools → Component props
   - Console logging

**Attack Scenario:**
1. User imports a template savant
2. Opens savant edit page
3. Opens DevTools → Network tab
4. Refreshes page
5. Finds Supabase API call to `savants?select=user_system_prompt,base_system_prompt,...`
6. Reads base_system_prompt in JSON response
7. **SECRET ADMIN INSTRUCTIONS ARE EXPOSED!**

---

### 7. RLS Policies Analysis

**Savants Table:**
```sql
policyname: "Members can view savants"
cmd: SELECT
qual: account_id IN ( SELECT get_user_account_ids() )
```

**Problem:** This policy allows SELECT on ALL columns, including `base_system_prompt`.

**Documents Table:**
```sql
policyname: "Users see only visible documents"
cmd: SELECT
qual: (is_visible_to_user = true) AND (account_id matches user)
```

**Good:** This policy correctly filters admin documents ✅

**Why documents work but prompts don't:**
- Documents have `is_visible_to_user` column that RLS can filter on ✅
- Savants table has no equivalent column for filtering `base_system_prompt` ❌

---

## Root Cause Summary

### Why It Happens

1. **Frontend fetches base_system_prompt** unnecessarily (line 43 of savant-prompts.tsx)
2. **RLS policy is column-agnostic** - allows SELECT on all columns
3. **PostgreSQL doesn't support column-level RLS** natively
4. **No database view or function** to hide base_system_prompt from users

### Why It's Critical

- **Trade Secret Protection:** Admin base prompts contain curated instructions that are the intellectual property of the platform
- **Competitive Advantage:** Users could copy the base prompts and use them elsewhere
- **Trust Violation:** Users expect "hidden" to mean truly hidden, not just "not displayed in UI"

---

## Recommended Fixes (Ordered by Priority)

### Fix #1: Create Secure Database View (RECOMMENDED) ⭐

**Create a view that excludes base_system_prompt for instances:**

```sql
CREATE OR REPLACE VIEW savants_user_view AS
SELECT
  id,
  account_id,
  name,
  slug,
  description,
  avatar_url,
  -- Only show base_system_prompt if user is platform admin
  CASE
    WHEN is_template = true THEN base_system_prompt
    ELSE NULL
  END as base_system_prompt,
  user_system_prompt,
  model_config,
  rag_config,
  is_public,
  is_active,
  is_template,
  template_version,
  version,
  changelog,
  last_version_update,
  cloned_from_id,
  original_creator_account_id,
  created_at,
  updated_at
FROM savants;

-- Grant access
GRANT SELECT ON savants_user_view TO authenticated;

-- Update RLS policy to use view
CREATE POLICY "Members can view savants via secure view"
  ON savants_user_view FOR SELECT
  TO authenticated
  USING (account_id IN (SELECT get_user_account_ids()));
```

**Then update frontend to query view instead of table.**

---

### Fix #2: Remove base_system_prompt from Frontend Query (QUICK FIX) ⚡

**File:** `frontend/src/components/savants/savant-prompts.tsx`

**Change line 43 from:**
```typescript
.select('user_system_prompt, base_system_prompt, model_config, cloned_from_id, is_template')
```

**To:**
```typescript
.select('user_system_prompt, model_config, cloned_from_id, is_template')
```

**Remove lines 54-55:**
```typescript
setIsTemplateInstance(!!(savantData?.cloned_from_id && !savantData?.is_template))
setHasBasePrompt(!!savantData?.base_system_prompt)  // ← Remove this
```

**Update line 163 in UI to check differently:**
Instead of checking `hasBasePrompt`, just check `isTemplateInstance`:
```typescript
{isTemplateInstance && (
  <Alert>
    <Info className="h-4 w-4" />
    <AlertDescription>
      This savant is based on an admin template...
    </AlertDescription>
  </Alert>
)}
```

**Pros:** Quick fix, no database changes
**Cons:** Doesn't prevent malicious users from querying base_system_prompt directly via Supabase client

---

### Fix #3: Add Admin Check to RLS Policy (DEFENSE IN DEPTH)

**Update the RLS policy to hide base_system_prompt from non-admins:**

```sql
-- Create helper function
CREATE OR REPLACE FUNCTION can_view_base_prompt(savant_row savants)
RETURNS BOOLEAN AS $$
BEGIN
  -- Platform admins can always see base prompts
  IF EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Template creators can see their own base prompts
  IF savant_row.is_template = true AND savant_row.account_id IN (
    SELECT account_id FROM account_members WHERE user_id = auth.uid()
  ) THEN
    RETURN TRUE;
  END IF;

  -- Everyone else cannot see base prompts
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Note:** PostgreSQL RLS doesn't support column-level filtering directly, so we'd still need to use a view or modify the select query. This function can be used in the view definition.

---

### Fix #4: Server Action for Fetching Savant Data (ALTERNATIVE)

**Create a server action that returns only safe fields:**

```typescript
// frontend/src/actions/savants.ts
'use server'

export async function getSavantForEditing(savantId: string, accountId: string) {
  const supabase = await createClient()

  const { data: savant } = await supabase
    .from('savants')
    .select('id, name, description, user_system_prompt, model_config, cloned_from_id, is_template')
    .eq('id', savantId)
    .eq('account_id', accountId)
    .single()

  // base_system_prompt is never sent to client
  return savant
}
```

**Update savant-prompts.tsx to use this action instead of direct query.**

---

## Verification Tests

### Test 1: Verify Admin Documents Are Hidden ✅ PASSED

```sql
-- Logged in as regular user
SELECT * FROM documents WHERE savant_id = '9a6d9574...';
```

**Expected:** Only user documents (`is_visible_to_user = true`)
**Result:** ✅ Admin documents filtered by RLS policy

---

### Test 2: Verify Admin Documents Are Used in RAG ✅ PASSED

```sql
-- Simulate RAG search
SELECT * FROM match_chunks(..., '9a6d9574...', ...);
```

**Expected:** Returns chunks from admin documents
**Result:** ✅ Admin document chunks returned (using SECURITY DEFINER)

---

### Test 3: Verify Base Prompt Is Used in Chat ✅ PASSED

**Backend:**
```python
savant_data = supabase.table('savants').select('*').eq('id', savant_id).single()
base_prompt = savant_data['base_system_prompt']  # ← Available to backend
```

**Expected:** Backend can access base_system_prompt
**Result:** ✅ Backend uses service role key, bypasses RLS

---

### Test 4: Verify Base Prompt Is Hidden from Users ❌ FAILED

**Frontend:**
```typescript
const { data } = await supabase
  .from('savants')
  .select('base_system_prompt')
  .eq('id', savantId)
```

**Expected:** Should return NULL or error
**Result:** ❌ Returns full base_system_prompt (6049 characters)

**Reason:** RLS policy allows SELECT on all columns for account members

---

## Impact Assessment

### If Not Fixed

- **High Risk:** Base prompts are intellectual property that could be stolen
- **Medium Risk:** Users could reverse-engineer admin templates
- **Low Risk:** No data corruption or system instability

### After Fix

- **Security:** Base prompts truly hidden from frontend
- **Functionality:** No impact - RAG and chat continue to work
- **UX:** No visible changes to users

---

## Recommended Implementation Plan

1. **Immediate (5 min):** Apply Fix #2 (remove from frontend query)
2. **Short-term (30 min):** Apply Fix #4 (server action for safe data)
3. **Long-term (2 hours):** Apply Fix #1 (database view with proper RLS)

---

## Conclusion

The imported savant infrastructure works correctly at the **functional level**:
- ✅ Base prompts and admin documents are used in chat/RAG
- ✅ Users can add their own prompts and documents
- ✅ User content is also searched in RAG

However, there is a **critical security flaw**:
- ❌ Base prompts are accessible via frontend queries
- ❌ RLS policy does not filter column-level data

**Action Required:** Implement at minimum Fix #2 immediately, then Fix #1 for long-term security.
