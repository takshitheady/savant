# Admin-Only Store with Hidden Prompts & Knowledge Base

## Document Info
- **Created**: January 2025
- **Status**: Planning Phase - Schema Optimized
- **Complexity**: High - Major architectural redesign
- **Estimated Effort**: 15-20 development days
- **Last Updated**: Schema analysis completed, optimizations applied

---

## Executive Summary

**Goal**: Transform Savant from a peer-to-peer marketplace to an admin-curated platform where:
- Only platform admins can publish savants to the store
- Users import savants but cannot see the base instructions or knowledge base
- Users can customize with their own instructions and documents
- Admin updates propagate to all instances while preserving user customizations

**Business Value**:
- Protects proprietary savant designs as trade secrets
- Maintains performance quality across user base
- Allows centralized improvement of savant templates
- Enables versioning and update distribution

---

## Current vs. Proposed Architecture

### Current State

```
User Creates Savant
     ↓
Publishes to Store (is_public=true)
     ↓
Other Users Import (full clone)
     ↓
Clone has ALL data visible:
  - system_prompt (visible)
  - documents (visible)
  - embeddings (copied)
```

**Problems:**
- ❌ Anyone can publish (no quality control)
- ❌ All prompts visible (no IP protection)
- ❌ All documents visible (knowledge base exposed)
- ❌ No versioning or update mechanism
- ❌ No separation between "template" and "instance"

### Proposed State

```
Admin Creates Template Savant
     ↓
Template has:
  - base_system_prompt (HIDDEN)
  - admin_documents (HIDDEN)
  - version number
     ↓
User Imports Template → Creates Instance
     ↓
Instance has:
  - base_system_prompt (hidden from user)
  - user_system_prompt (visible, editable)
  - admin_documents (hidden list)
  - user_documents (visible list)
  - template_version (for updates)
     ↓
At Runtime (Chat):
  Final Prompt = base + user
  Final RAG = admin docs + user docs
     ↓
Admin Updates Template → v2
     ↓
User sees "Update Available"
     ↓
User upgrades → gets new base, keeps user customizations
```

**Benefits:**
- ✅ Admin-only publishing
- ✅ Base prompts and docs hidden (IP protection)
- ✅ Users can still customize
- ✅ Centralized quality control
- ✅ Update distribution system

---

## Database Schema Changes

### Schema Optimization Notes
After analyzing the current database schema, several optimizations have been identified:
- **Reuse `cloned_from_id`**: Instead of adding `template_id`, we'll reuse the existing `cloned_from_id` column which already tracks parent savants
- **Minimal new columns**: Only add what's absolutely necessary
- **Backward compatible**: Existing data migrations are straightforward

---

### 1. Platform Admin System

**New Table: `platform_admins`** ✅ Required (no existing alternative)
```sql
CREATE TABLE public.platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  can_publish_savants BOOLEAN DEFAULT true,
  can_manage_categories BOOLEAN DEFAULT true,
  can_moderate_reviews BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Initial admin user (heady)
INSERT INTO platform_admins (user_id, role, can_publish_savants, can_manage_categories, can_moderate_reviews)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'heady@example.com' LIMIT 1),
  'super_admin',
  true,
  true,
  true
);

-- Helper function
CREATE OR REPLACE FUNCTION is_platform_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE user_id = check_user_id
      AND can_publish_savants = true
  );
$$ LANGUAGE SQL SECURITY DEFINER;
```

**Note**: Cannot use existing `account_members.role` because it's account-scoped, not platform-scoped.

---

### 2. Template vs Instance Model

**Modify `savants` table:**
```sql
-- Existing columns to REUSE:
-- - cloned_from_id (acts as template_id for instances)
-- - original_creator_account_id (already tracks template creator)

ALTER TABLE public.savants
  -- Template/Instance distinction
  ADD COLUMN is_template BOOLEAN DEFAULT false,
  -- SKIP template_id - use existing cloned_from_id instead!
  ADD COLUMN template_version INTEGER DEFAULT 1,

  -- Split prompt system
  ADD COLUMN base_system_prompt TEXT, -- Hidden from users (admin-only)
  -- Rename existing system_prompt to user_system_prompt
  ADD COLUMN user_system_prompt TEXT,

  -- Versioning
  ADD COLUMN version INTEGER DEFAULT 1,
  ADD COLUMN changelog TEXT,
  ADD COLUMN last_version_update TIMESTAMPTZ;

-- Migrate existing data
UPDATE public.savants
SET user_system_prompt = system_prompt,
    is_template = (is_public AND cloned_from_id IS NULL), -- Only originals with no parent
    base_system_prompt = CASE
      WHEN is_public AND cloned_from_id IS NULL THEN system_prompt
      ELSE NULL
    END;

-- Drop old column after migration verification
ALTER TABLE public.savants DROP COLUMN system_prompt;
```

**Updated Constraints:**
```sql
-- Templates must be owned by platform admins
ALTER TABLE public.savants
  ADD CONSTRAINT templates_admin_only
  CHECK (
    is_template = false OR
    account_id IN (
      SELECT account_id FROM account_members
      WHERE user_id IN (SELECT user_id FROM platform_admins)
    )
  );

-- Instances must have a parent template (via cloned_from_id)
ALTER TABLE public.savants
  ADD CONSTRAINT instances_need_template
  CHECK (
    is_template = true OR
    cloned_from_id IS NOT NULL
  );
```

**Schema Notes**:
- **Template identification**: `is_template = true`
- **Instance parent link**: Use existing `cloned_from_id` (points to template)
- **Saves 1 column**: No need for separate `template_id`

### 3. Document Visibility System

**Modify `documents` table:** ✅ Required (no existing visibility flags)
```sql
-- Existing schema has: id, savant_id, account_id, name, file_path, file_type,
-- file_size, status, metadata, chunk_count, timestamps, processing fields

ALTER TABLE public.documents
  ADD COLUMN is_admin_document BOOLEAN DEFAULT false,
  ADD COLUMN template_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  ADD COLUMN is_visible_to_user BOOLEAN DEFAULT true;

-- All existing documents are user documents (visible)
UPDATE public.documents
SET is_admin_document = false,
    is_visible_to_user = true;
```

**Document Types:**
- **Admin Documents**: `is_admin_document=true`, attached to templates, hidden from users (`is_visible_to_user=false`)
- **User Documents**: `is_admin_document=false`, attached to instances, visible (`is_visible_to_user=true`)

**Note**: RAG will search both types (same `savant_id`), but UI filters by `is_visible_to_user`.

### 4. Versioning & Update Tracking

**New Table: `savant_versions`** ✅ Required (no existing version tracking)
```sql
CREATE TABLE public.savant_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES public.savants(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  base_system_prompt TEXT,
  model_config JSONB,
  rag_config JSONB,
  changelog TEXT,
  published_at TIMESTAMPTZ DEFAULT NOW(),
  published_by UUID REFERENCES auth.users(id),
  UNIQUE(template_id, version)
);

CREATE INDEX idx_savant_versions_template ON savant_versions(template_id, version DESC);
```

**Simplified Version Tracking** ⚠️ Simplified approach
```sql
-- Instead of separate savant_instance_versions table,
-- we can use a VIEW to calculate update availability:

CREATE VIEW savant_update_status AS
SELECT
  s.id as instance_id,
  s.cloned_from_id as template_id,
  s.template_version as current_version,
  t.version as latest_version,
  (t.version > s.template_version) as update_available,
  s.last_version_update
FROM savants s
LEFT JOIN savants t ON t.id = s.cloned_from_id
WHERE s.is_template = false  -- Only instances
  AND s.cloned_from_id IS NOT NULL;
```

**Why this works**:
- Instances track `template_version` (which version they're on)
- Templates track `version` (current version)
- View compares them to compute `update_available`
- **Saves 1 table**: No need for separate `savant_instance_versions`

### 5. Store Listings Changes

**Modify `store_listings` table:** ⚠️ Optional (can use JOIN to get version)
```sql
-- Existing schema has: id, savant_id, category_id, tagline, long_description,
-- tags, preview_messages, is_featured, featured_until, import_count,
-- review_count, average_rating, published_at, updated_at

-- Option A: Add version columns to store_listings (denormalized)
ALTER TABLE public.store_listings
  ADD COLUMN current_version INTEGER DEFAULT 1,
  ADD COLUMN version_history JSONB DEFAULT '[]'::jsonb;

-- Option B: Just use JOIN to get version from savants table
-- (Recommended - avoids duplication)

-- Constraint: Only templates can be listed
ALTER TABLE public.store_listings
  ADD CONSTRAINT listings_templates_only
  CHECK (
    savant_id IN (SELECT id FROM savants WHERE is_template = true)
  );
```

**Recommendation**: Skip version columns in `store_listings`, just JOIN with `savants.version` when needed. Keeps data normalized.

---

## Summary of Schema Changes

### New Tables Required (2)
1. ✅ **`platform_admins`** - Platform-level admin permissions (no existing alternative)
2. ✅ **`savant_versions`** - Version history for templates (needed for changelog + rollback)

### New Tables Eliminated (1)
❌ **`savant_instance_versions`** - Replaced with VIEW using existing columns

### Modified Tables (3)
1. ✅ **`savants`** - Add 6 columns:
   - `is_template` BOOLEAN
   - `template_version` INTEGER (tracks which version instance is on)
   - `base_system_prompt` TEXT (hidden)
   - `user_system_prompt` TEXT (visible, replaces `system_prompt`)
   - `version` INTEGER (template's current version)
   - `changelog` TEXT
   - `last_version_update` TIMESTAMPTZ
   - Drop: `system_prompt` (split into base + user)

2. ✅ **`documents`** - Add 3 columns:
   - `is_admin_document` BOOLEAN
   - `template_document_id` UUID
   - `is_visible_to_user` BOOLEAN

3. ⚠️ **`store_listings`** - Optional, can skip version columns (use JOIN instead)

### Columns Reused (2)
- ✅ **`savants.cloned_from_id`** - Acts as `template_id` for instances
- ✅ **`savants.original_creator_account_id`** - Already tracks template creator

### Total New Columns: 12
### Total New Tables: 2
### Total New Views: 1 (`savant_update_status`)

---

## API & Function Changes

### 1. Publishing (Admin Only)

**Updated Function: `publishSavantToStore()`**
```typescript
// frontend/src/actions/store.ts

export async function publishSavantToStore(
  savantId: string,
  categoryId: string,
  tagline: string,
  longDescription: string,
  tags: string[]
) {
  const supabase = createClient()

  // Check if user is platform admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: isAdmin } = await supabase.rpc('is_platform_admin', {
    check_user_id: user.id
  })

  if (!isAdmin) {
    throw new Error('Only platform admins can publish savants to the store')
  }

  // Convert to template
  await supabase
    .from('savants')
    .update({
      is_template: true,
      is_public: true,
      base_system_prompt: user_system_prompt, // Move user prompt to base
      user_system_prompt: null,
      version: 1
    })
    .eq('id', savantId)

  // Create store listing...
}
```

### 2. Import with Hidden Data

**New Function: `clone_template_savant()`**
```sql
CREATE OR REPLACE FUNCTION clone_template_savant(
  p_template_id UUID,
  p_target_account_id UUID,
  p_custom_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_template savants%ROWTYPE;
  v_new_savant_id UUID;
  v_new_slug TEXT;
  v_doc RECORD;
  v_chunk RECORD;
BEGIN
  -- Get template (must be template and public)
  SELECT * INTO v_template
  FROM savants
  WHERE id = p_template_id
    AND is_template = true
    AND is_public = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Template not found or not public';
  END IF;

  -- Generate unique slug
  v_new_slug := generate_unique_slug(
    COALESCE(p_custom_name, v_template.name),
    p_target_account_id
  );

  -- Create instance savant
  INSERT INTO savants (
    account_id,
    name,
    slug,
    description,
    base_system_prompt,      -- HIDDEN from user
    user_system_prompt,       -- Empty for user to fill
    model_config,
    rag_config,
    is_template,              -- false = instance
    template_version,         -- Current version (from template)
    is_public,
    cloned_from_id,           -- REUSED: Links to template (instead of template_id)
    original_creator_account_id
  ) VALUES (
    p_target_account_id,
    COALESCE(p_custom_name, v_template.name),
    v_new_slug,
    v_template.description,
    v_template.base_system_prompt,  -- Copy but hide
    NULL,                            -- User starts with no custom prompt
    v_template.model_config,
    v_template.rag_config,
    false,                           -- Instance
    v_template.version,              -- Current template version
    false,                           -- Not public
    p_template_id,                   -- Template link via cloned_from_id
    v_template.account_id
  ) RETURNING id INTO v_new_savant_id;

  -- Copy ADMIN documents (hidden)
  FOR v_doc IN
    SELECT * FROM documents
    WHERE savant_id = p_template_id
      AND (is_admin_document = true OR is_admin_document IS NULL)
  LOOP
    INSERT INTO documents (
      savant_id,
      account_id,
      name,
      file_path,              -- Share storage path
      file_type,
      file_size,
      status,
      metadata,
      chunk_count,
      is_admin_document,      -- TRUE = hidden
      template_document_id,   -- Link to template doc
      is_visible_to_user      -- FALSE = hidden
    ) VALUES (
      v_new_savant_id,
      p_target_account_id,
      v_doc.name,
      v_doc.file_path,
      v_doc.file_type,
      v_doc.file_size,
      v_doc.status,
      v_doc.metadata,
      v_doc.chunk_count,
      true,                   -- Admin document
      v_doc.id,               -- Template doc link
      false                   -- Hidden from user
    ) RETURNING id INTO v_new_doc_id;

    -- Copy document chunks (for RAG)
    FOR v_chunk IN
      SELECT * FROM document_chunks
      WHERE document_id = v_doc.id
    LOOP
      INSERT INTO document_chunks (
        document_id,
        savant_id,
        account_id,
        content,
        chunk_index,
        embedding,
        metadata,
        token_count
      ) VALUES (
        v_new_doc_id,
        v_new_savant_id,
        p_target_account_id,
        v_chunk.content,
        v_chunk.chunk_index,
        v_chunk.embedding,
        v_chunk.metadata,
        v_chunk.token_count
      );
    END LOOP;
  END LOOP;

  -- Version tracking is automatic via savants.template_version column
  -- No separate table needed!

  -- Track import
  INSERT INTO store_imports (
    source_savant_id,
    source_listing_id,
    cloned_savant_id,
    imported_by_account_id,
    imported_by_user_id
  ) VALUES (
    p_template_id,
    (SELECT id FROM store_listings WHERE savant_id = p_template_id),
    v_new_savant_id,
    p_target_account_id,
    auth.uid()
  );

  RETURN v_new_savant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Runtime Prompt Composition

**Backend: Agent Creation**
```python
# backend/app/agents/savant_agent.py

async def create_savant_agent(savant_id: str, account_id: str):
    """Create agent with combined base + user prompts"""

    # Get savant data
    savant = await supabase.from_('savants').select('*').eq('id', savant_id).single()

    # Compose final system prompt
    base_prompt = savant.get('base_system_prompt') or ''
    user_prompt = savant.get('user_system_prompt') or ''

    # Combine: base is foundational, user adds on top
    final_system_prompt = f"""{base_prompt}

--- User Customizations ---
{user_prompt}
""" if user_prompt else base_prompt

    # Create agent with combined prompt
    agent = Agent(
        id=savant_id,
        name=savant['name'],
        model=get_model_from_config(savant['model_config']),
        instructions=[final_system_prompt],
        tools=[rag_tool],  # RAG searches both admin + user docs
        # ...
    )

    return agent
```

### 4. RAG with Combined Documents

**Modified: `match_chunks()` function**
```sql
-- No changes needed! The function already searches by savant_id
-- Both admin documents and user documents are linked to same savant_id
-- User's RAG queries will search across both (admin docs are just hidden in UI)
```

### 5. Update/Upgrade Mechanism

**New Function: `upgrade_savant_instance()`**
```sql
CREATE OR REPLACE FUNCTION upgrade_savant_instance(
  p_instance_id UUID,
  p_target_version INTEGER DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_instance savants%ROWTYPE;
  v_template savants%ROWTYPE;
  v_new_version savant_versions%ROWTYPE;
  v_result JSONB;
BEGIN
  -- Get instance
  SELECT * INTO v_instance FROM savants WHERE id = p_instance_id AND is_template = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'Instance not found'; END IF;

  -- Get template (via cloned_from_id)
  SELECT * INTO v_template FROM savants WHERE id = v_instance.cloned_from_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found'; END IF;

  -- Get target version (default to latest)
  IF p_target_version IS NULL THEN
    p_target_version := v_template.version;
  END IF;

  -- Get version data
  SELECT * INTO v_new_version
  FROM savant_versions
  WHERE template_id = v_instance.cloned_from_id  -- Use cloned_from_id as template_id
    AND version = p_target_version;

  IF NOT FOUND THEN RAISE EXCEPTION 'Version not found'; END IF;

  -- Update instance with new base prompt + configs
  UPDATE savants
  SET base_system_prompt = v_new_version.base_system_prompt,
      model_config = v_new_version.model_config,
      rag_config = v_new_version.rag_config,
      template_version = p_target_version,
      last_version_update = NOW()
  WHERE id = p_instance_id;

  -- NOTE: user_system_prompt is PRESERVED (not overwritten)

  -- TODO: Handle document updates (complex - may need manual review)

  -- Version tracking is automatic via savants.template_version column
  -- No separate update needed!

  RETURN jsonb_build_object(
    'success', true,
    'previous_version', v_instance.template_version,
    'new_version', p_target_version,
    'changelog', v_new_version.changelog
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Frontend Changes

### 1. Hide Publishing UI from Non-Admins

**File: `frontend/src/components/savants/savant-header.tsx` (or wherever publish button is)**
```typescript
export function SavantHeader({ savant }: { savant: Savant }) {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkAdmin() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase.rpc('is_platform_admin', {
        check_user_id: user.id
      })
      setIsAdmin(!!data)
    }
    checkAdmin()
  }, [])

  return (
    <div>
      {/* ... */}
      {isAdmin && !savant.is_template && (
        <Button onClick={handlePublish}>
          Publish to Store
        </Button>
      )}
    </div>
  )
}
```

### 2. Hide Base Prompt & Admin Documents

**File: `frontend/src/components/savants/savant-prompts.tsx`**
```typescript
export function SavantPrompts({ savant }: { savant: Savant }) {
  // Only show user_system_prompt field
  // base_system_prompt is never fetched or displayed

  return (
    <div>
      {savant.template_id && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            This savant is based on an admin template.
            You can add your own instructions below to customize it.
          </AlertDescription>
        </Alert>
      )}

      <Textarea
        label="Your Custom Instructions (Optional)"
        value={savant.user_system_prompt || ''}
        onChange={handleChange}
        placeholder="Add your own instructions to customize this savant..."
      />

      {/* Do NOT show base_system_prompt */}
    </div>
  )
}
```

**File: `frontend/src/components/savants/savant-documents.tsx`**
```typescript
export function SavantDocuments({ savantId }: { savantId: string }) {
  const [documents, setDocuments] = useState<Document[]>([])

  useEffect(() => {
    async function fetchDocuments() {
      const supabase = createClient()

      // Only fetch user-visible documents
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('savant_id', savantId)
        .eq('is_visible_to_user', true)  // Filter out admin docs
        .order('created_at', { ascending: false })

      setDocuments(data || [])
    }
    fetchDocuments()
  }, [savantId])

  return (
    <div>
      {documents.length === 0 ? (
        <EmptyState>
          No documents yet. Upload documents to enhance this savant's knowledge.
        </EmptyState>
      ) : (
        <DocumentList documents={documents} />
      )}

      <UploadButton onUpload={handleUpload} />
    </div>
  )
}
```

### 3. Update Notification UI

**New Component: `frontend/src/components/savants/update-notification.tsx`**
```typescript
export function UpdateNotification({ savantId }: { savantId: string }) {
  const [updateInfo, setUpdateInfo] = useState<any>(null)

  useEffect(() => {
    async function checkForUpdates() {
      const supabase = createClient()

      // Use the savant_update_status view
      const { data } = await supabase
        .from('savant_update_status')
        .select('*')
        .eq('instance_id', savantId)
        .single()

      if (data?.update_available) {
        // Fetch latest version info
        const { data: versionData } = await supabase
          .from('savant_versions')
          .select('version, changelog')
          .eq('template_id', data.template_id)
          .order('version', { ascending: false })
          .limit(1)
          .single()

        setUpdateInfo({
          currentVersion: data.current_version,
          latestVersion: data.latest_version,
          changelog: versionData?.changelog
        })
      }
    }
    checkForUpdates()
  }, [savantId])

  if (!updateInfo) return null

  return (
    <Alert variant="info">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Update Available</AlertTitle>
      <AlertDescription>
        Version {updateInfo.latestVersion} is available
        (you're on v{updateInfo.currentVersion})

        {updateInfo.changelog && (
          <div className="mt-2 text-sm">
            <strong>What's new:</strong>
            <p>{updateInfo.changelog}</p>
          </div>
        )}

        <Button onClick={handleUpgrade} className="mt-2">
          Upgrade Now
        </Button>
      </AlertDescription>
    </Alert>
  )
}

async function handleUpgrade() {
  const supabase = createClient()
  const { data, error } = await supabase.rpc('upgrade_savant_instance', {
    p_instance_id: savantId
  })

  if (error) {
    toast.error('Upgrade failed')
  } else {
    toast.success(`Upgraded to v${data.new_version}`)
    router.refresh()
  }
}
```

### 4. Store UI Changes

**File: `frontend/src/app/(dashboard)/store/savant/[id]/page.tsx`**
```typescript
// Remove "What's Included" section that shows system prompt
// Only show: model, category, description, reviews

// Add version badge
<Badge>v{listing.current_version}</Badge>
```

---

## RLS Policy Changes

### 1. Protect Base Prompts

**Modify savants SELECT policy:**
```sql
-- Users can see their own savants, but base_system_prompt is filtered out
CREATE POLICY "Users see own savants without base prompt"
ON savants FOR SELECT
TO authenticated
USING (
  account_id IN (SELECT get_user_account_ids())
)
-- Use security definer function to filter columns
WITH CHECK (is_account_member(account_id));

-- Create view that hides base_system_prompt for non-admins
CREATE VIEW savants_user_view AS
SELECT
  id,
  account_id,
  name,
  slug,
  description,
  avatar_url,
  CASE
    WHEN is_template AND NOT is_platform_admin(auth.uid()) THEN NULL
    ELSE base_system_prompt
  END as base_system_prompt,
  user_system_prompt,
  model_config,
  rag_config,
  is_active,
  is_template,
  template_id,
  template_version,
  version,
  cloned_from_id,
  original_creator_account_id,
  created_at,
  updated_at
FROM savants;
```

### 2. Protect Admin Documents

**Modify documents SELECT policy:**
```sql
CREATE POLICY "Users see only visible documents"
ON documents FOR SELECT
TO authenticated
USING (
  account_id IN (SELECT get_user_account_ids())
  AND is_visible_to_user = true
);
```

### 3. Publishing Restrictions

**Modify savants UPDATE policy:**
```sql
CREATE POLICY "Only admins can publish"
ON savants FOR UPDATE
TO authenticated
USING (
  account_id IN (SELECT get_user_account_ids())
)
WITH CHECK (
  -- Can't set is_template=true unless platform admin
  (is_template = false OR is_platform_admin(auth.uid()))
  AND
  -- Can't set is_public=true unless platform admin
  (is_public = false OR is_platform_admin(auth.uid()))
);
```

---

## Migration Plan

### Phase 1: Schema Changes (2 days)
1. Create `platform_admins` table
2. Add admin check function
3. Modify `savants` table (add new columns)
4. Create `savant_versions` table
5. Create `savant_instance_versions` table
6. Modify `documents` table
7. Migrate existing data

### Phase 2: Database Functions (3 days)
1. Update `clone_savant_from_store()` → `clone_template_savant()`
2. Create `upgrade_savant_instance()`
3. Create `publish_template_version()`
4. Update RLS policies
5. Create views for filtered data

### Phase 3: Backend Changes (3 days)
1. Update agent creation to compose prompts
2. Modify RAG to work with hidden docs
3. Update publishing API
4. Add version management APIs
5. Add admin check middleware

### Phase 4: Frontend - Admin Features (3 days)
1. Admin dashboard for template management
2. Version publishing UI
3. Hide publish button from non-admins
4. Template editing interface

### Phase 5: Frontend - User Features (4 days)
1. Hide base prompts in UI
2. Filter admin documents from document list
3. Update notification component
4. Upgrade flow UI
5. Update store listing pages

### Phase 6: Testing & Rollout (2 days)
1. Test admin publishing
2. Test user imports
3. Test prompt composition
4. Test RAG with mixed documents
5. Test version upgrades
6. Production migration

---

## Risk Assessment

### High Risk
1. **Data Migration**: Moving `system_prompt` to `base_system_prompt`/`user_system_prompt`
   - Mitigation: Backup database, test migration on staging

2. **Breaking Changes**: Existing imports will need migration
   - Mitigation: Run migration script to convert existing clones to instances

### Medium Risk
1. **RLS Complexity**: Need to ensure base prompts truly hidden
   - Mitigation: Use views and security definer functions

2. **Performance**: Additional joins for version checking
   - Mitigation: Add indexes, use generated columns

### Low Risk
1. **UI Changes**: Mostly additive
2. **Backend**: Prompt composition is simple string concat

---

## Testing Checklist

### Admin Publishing
- [ ] Non-admin cannot publish
- [ ] Admin can publish savant as template
- [ ] Base prompt is set correctly
- [ ] Documents are marked as admin docs
- [ ] Version 1 is created

### User Import
- [ ] User can import template
- [ ] Instance is created (not template)
- [ ] Base prompt is hidden from queries
- [ ] User prompt is empty initially
- [ ] Admin documents are hidden in UI
- [ ] Admin documents ARE used in RAG

### Customization
- [ ] User can add custom prompt
- [ ] User can upload documents
- [ ] Chat uses both base + user prompts
- [ ] RAG searches both admin + user docs

### Updates
- [ ] Admin can publish new version
- [ ] Users see update notification
- [ ] Upgrade preserves user customizations
- [ ] Changelog is displayed

---

## Open Questions

1. **Document Updates**: How to handle when admin updates/removes documents?
   - Option A: Auto-sync (may break user's savant)
   - Option B: Notify user, manual review
   - **Recommendation**: Option B - show diff, let user approve

2. **Base Prompt Conflicts**: What if user prompt contradicts base?
   - Option A: User prompt wins (append last)
   - Option B: Base prompt wins (admin has priority)
   - **Recommendation**: Option A - user has final say

3. **Pricing**: Should admin templates have different pricing?
   - Could add `is_premium` flag to templates
   - Track usage separately for admin vs user docs

4. **Multiple Admins**: How to manage admin permissions?
   - Current: Simple boolean flag
   - Future: Role-based (publisher, moderator, super-admin)

---

## Success Metrics

1. **Security**: 0 leaks of base prompts or admin documents
2. **Adoption**: 80%+ of users import admin templates
3. **Updates**: 90%+ of users upgrade within 30 days
4. **Quality**: Avg rating of admin templates > 4.5
5. **Performance**: No degradation in RAG response times

---

## Next Steps

1. **Get Approval**: Review this plan with stakeholders
2. **Set Admin Email**: Identify "heady" user email for initial admin
3. **Create Migration Branch**: `feat/admin-only-store`
4. **Start Phase 1**: Begin schema changes and migrations
5. **Iterate**: Adjust based on feedback during implementation
