# Organization-Level Access & Team Collaboration

## Document Info
- **Created**: January 29, 2026
- **Status**: Implementation Phase 1-3 Complete
- **Complexity**: Medium-High - Multi-tenant team collaboration
- **Dependencies**: Existing `accounts` and `account_members` tables

### Implementation Progress
- [x] Phase 1: Database Setup - COMPLETE (migrations 010-013 applied via Supabase MCP)
- [x] Phase 2: Backend API - COMPLETE (server actions in `frontend/src/actions/team.ts`)
- [x] Phase 3: Frontend - Team Management - COMPLETE
- [ ] Phase 4: Frontend - Invitation Flow - COMPLETE (basic flow)
- [ ] Phase 5: Frontend - Org Switcher - NOT STARTED
- [ ] Phase 6: Testing & Polish - IN PROGRESS

---

## Executive Summary

**Goal**: Enable organization/brand-level collaboration where:
- Multiple users can share an "Org" account with shared resources
- Org owners can invite team members via email
- Team members share savants, brand voice, documents, and usage
- Role-based permissions control who can do what
- Billing is consolidated at the org level

**Current State Analysis**:
The database already has a solid foundation:
- `accounts` table = organization/workspace concept (already multi-tenant aware)
- `account_members` table = user-to-account membership with roles (`owner`, `admin`, `member`, `viewer`)
- All resources (savants, documents, prompts, etc.) are scoped to `account_id`
- RLS policies already use `get_user_account_ids()` function

**Gap Analysis**:
What's missing for full team collaboration:
1. **Invitation System** - No way to invite users by email
2. **Pending Invites Table** - Need to track invites before acceptance
3. **Onboarding Flow** - New users need to join existing org vs create new
4. **UI for Team Management** - No team settings page
5. **Role Permissions Enforcement** - Roles exist but aren't fully enforced
6. **Org Profile/Branding** - Limited org customization

---

## Current Database Analysis

### Existing Tables (Relevant)

```
┌─────────────────────┐       ┌─────────────────────┐
│      accounts       │       │    account_members  │
├─────────────────────┤       ├─────────────────────┤
│ id (PK)             │◄──────│ account_id (FK)     │
│ name                │       │ user_id (FK)────────┼──► auth.users
│ slug                │       │ role                │
│ owner_id ───────────┼──►    │   - owner           │
│ default_system_prompt│       │   - admin           │
│ settings (JSONB)    │       │   - member          │
│ plan                │       │   - viewer          │
│ stripe_customer_id  │       │ created_at          │
│ autumn_customer_id  │       └─────────────────────┘
│ created_at          │
│ updated_at          │
└─────────────────────┘
          │
          ▼ (account_id FK on all)
┌─────────────────────────────────────────────────────────┐
│  savants, documents, document_chunks, conversations,    │
│  messages, account_prompts, api_keys, usage_records     │
└─────────────────────────────────────────────────────────┘
```

### Current RLS Policies

```sql
-- accounts table
"Users can view their accounts" - uses get_user_account_ids()
"Account owners can update" - owner_id = auth.uid()
"Account owners can delete" - owner_id = auth.uid()
"Anyone can view accounts with public savants"

-- account_members table
"Users view their accounts members" - account_id IN get_user_account_ids()
"Users can manage own membership" - user_id = auth.uid()
```

### Current Roles (Already Defined)

| Role | Intent | Current Enforcement |
|------|--------|---------------------|
| `owner` | Full control, billing, delete org | Partial (via owner_id checks) |
| `admin` | Manage members, settings | NOT enforced |
| `member` | Use savants, upload docs | NOT enforced |
| `viewer` | Read-only access | NOT enforced |

---

## Proposed Architecture

### Option A: Minimal Changes (Recommended)

Leverage existing `accounts` as "Organizations" with minimal schema changes.

**Advantages**:
- No data migration needed
- Existing RLS policies already work
- Just add invitation system + UI

**New Tables**: 1 (`org_invitations`)
**Modified Tables**: 1 (`accounts` - add org settings)

### Option B: Separate Organizations Table

Create explicit `organizations` table separate from `accounts`.

**Disadvantages**:
- Major schema refactor
- Need to migrate all FKs
- Breaks existing RLS
- Redundant with current design

**NOT RECOMMENDED** - Current `accounts` design is already org-ready.

---

## Schema Changes (Option A - Recommended)

### 1. New Table: `org_invitations`

Tracks pending invitations before users accept.

```sql
CREATE TABLE public.org_invitations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    token TEXT NOT NULL UNIQUE, -- Secure random token for invite link
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_at TIMESTAMPTZ,
    accepted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Prevent duplicate pending invites to same email for same org
    UNIQUE(account_id, email) WHERE accepted_at IS NULL
);

CREATE INDEX idx_org_invitations_email ON org_invitations(email);
CREATE INDEX idx_org_invitations_token ON org_invitations(token);
CREATE INDEX idx_org_invitations_account ON org_invitations(account_id);
CREATE INDEX idx_org_invitations_expires ON org_invitations(expires_at)
WHERE accepted_at IS NULL;
```

### 2. Modify Table: `accounts`

Add organization-specific fields.

```sql
ALTER TABLE public.accounts
    -- Organization display
    ADD COLUMN display_name TEXT,        -- "Acme Corp" vs slug "acme-corp"
    ADD COLUMN logo_url TEXT,            -- Org logo for branding
    ADD COLUMN description TEXT,         -- About the organization

    -- Organization settings
    ADD COLUMN allow_member_invites BOOLEAN DEFAULT false,  -- Can members invite?
    ADD COLUMN default_member_role TEXT DEFAULT 'member',   -- Role for new members

    -- Metadata
    ADD COLUMN member_count INTEGER DEFAULT 1;  -- Denormalized for performance

-- Update existing accounts to have display_name from name
UPDATE accounts SET display_name = name WHERE display_name IS NULL;
```

### 3. New Function: `invite_user_to_org()`

```sql
CREATE OR REPLACE FUNCTION invite_user_to_org(
    p_account_id UUID,
    p_email TEXT,
    p_role TEXT DEFAULT 'member'
)
RETURNS UUID AS $$
DECLARE
    v_user_id UUID;
    v_invite_id UUID;
    v_token TEXT;
    v_caller_role TEXT;
BEGIN
    -- Get caller's role in this account
    SELECT role INTO v_caller_role
    FROM account_members
    WHERE account_id = p_account_id AND user_id = auth.uid();

    -- Permission check: only owners and admins can invite
    IF v_caller_role IS NULL OR v_caller_role NOT IN ('owner', 'admin') THEN
        -- Check if members can invite (org setting)
        IF NOT (
            SELECT allow_member_invites FROM accounts WHERE id = p_account_id
        ) THEN
            RAISE EXCEPTION 'You do not have permission to invite users';
        END IF;
    END IF;

    -- Cannot invite as owner (only transfer ownership)
    IF p_role = 'owner' THEN
        RAISE EXCEPTION 'Cannot invite users as owner. Use transfer ownership instead.';
    END IF;

    -- Check if user already exists and is a member
    SELECT u.id INTO v_user_id
    FROM auth.users u
    WHERE u.email = p_email;

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
            AND email = p_email
            AND accepted_at IS NULL
            AND expires_at > NOW()
    ) THEN
        RAISE EXCEPTION 'An invitation is already pending for this email';
    END IF;

    -- Generate secure token
    v_token := encode(extensions.gen_random_bytes(32), 'hex');

    -- Create invitation
    INSERT INTO org_invitations (account_id, email, role, invited_by, token)
    VALUES (p_account_id, p_email, p_role, auth.uid(), v_token)
    RETURNING id INTO v_invite_id;

    RETURN v_invite_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4. New Function: `accept_org_invitation()`

```sql
CREATE OR REPLACE FUNCTION accept_org_invitation(
    p_token TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_invite org_invitations%ROWTYPE;
    v_membership_id UUID;
BEGIN
    -- Get and validate invitation
    SELECT * INTO v_invite
    FROM org_invitations
    WHERE token = p_token
        AND accepted_at IS NULL
        AND expires_at > NOW();

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Verify caller's email matches invitation
    IF (SELECT email FROM auth.users WHERE id = auth.uid()) != v_invite.email THEN
        RAISE EXCEPTION 'This invitation was sent to a different email address';
    END IF;

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
            'account_id', v_invite.account_id
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
    SET member_count = member_count + 1
    WHERE id = v_invite.account_id;

    RETURN jsonb_build_object(
        'success', true,
        'account_id', v_invite.account_id,
        'role', v_invite.role,
        'membership_id', v_membership_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 5. New Function: `remove_org_member()`

```sql
CREATE OR REPLACE FUNCTION remove_org_member(
    p_account_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
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

    -- Self-removal is allowed (leaving the org)
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
    SET member_count = member_count - 1
    WHERE id = p_account_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6. New Function: `update_member_role()`

```sql
CREATE OR REPLACE FUNCTION update_member_role(
    p_account_id UUID,
    p_user_id UUID,
    p_new_role TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_caller_role TEXT;
    v_target_role TEXT;
BEGIN
    -- Validate role
    IF p_new_role NOT IN ('owner', 'admin', 'member', 'viewer') THEN
        RAISE EXCEPTION 'Invalid role: %', p_new_role;
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

    -- Permission checks
    IF v_caller_role != 'owner' THEN
        RAISE EXCEPTION 'Only owners can change member roles';
    END IF;

    -- Promoting to owner
    IF p_new_role = 'owner' AND v_target_role != 'owner' THEN
        -- This is allowed - adds another owner
        NULL;
    END IF;

    -- Demoting from owner
    IF v_target_role = 'owner' AND p_new_role != 'owner' THEN
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

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7. RLS Policies for `org_invitations`

```sql
-- Enable RLS
ALTER TABLE org_invitations ENABLE ROW LEVEL SECURITY;

-- Owners and admins can view all invitations for their orgs
CREATE POLICY "Org admins can view invitations"
ON org_invitations FOR SELECT
TO authenticated
USING (
    account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);

-- Users can view invitations sent to their email
CREATE POLICY "Users can view own invitations"
ON org_invitations FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Invitations are created via function (SECURITY DEFINER)
-- No direct INSERT policy needed

-- Owners and admins can delete/revoke pending invitations
CREATE POLICY "Org admins can revoke invitations"
ON org_invitations FOR DELETE
TO authenticated
USING (
    accepted_at IS NULL
    AND account_id IN (
        SELECT account_id FROM account_members
        WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
);
```

---

## Role Permissions Matrix

### Detailed Permissions by Role

| Resource | Action | Owner | Admin | Member | Viewer |
|----------|--------|:-----:|:-----:|:------:|:------:|
| **Organization** |
| Settings | View | ✅ | ✅ | ✅ | ✅ |
| Settings | Update | ✅ | ✅ | ❌ | ❌ |
| Billing | View | ✅ | ✅ | ❌ | ❌ |
| Billing | Update | ✅ | ❌ | ❌ | ❌ |
| Delete Org | - | ✅ | ❌ | ❌ | ❌ |
| **Members** |
| List | - | ✅ | ✅ | ✅ | ✅ |
| Invite | - | ✅ | ✅ | ⚙️¹ | ❌ |
| Remove | - | ✅ | ✅² | ❌ | ❌ |
| Change Role | - | ✅ | ❌ | ❌ | ❌ |
| Transfer Ownership | - | ✅ | ❌ | ❌ | ❌ |
| **Savants** |
| List | - | ✅ | ✅ | ✅ | ✅ |
| Create | - | ✅ | ✅ | ✅ | ❌ |
| Edit | - | ✅ | ✅ | ✅ | ❌ |
| Delete | - | ✅ | ✅ | ❌ | ❌ |
| Chat | - | ✅ | ✅ | ✅ | ✅ |
| **Documents** |
| List | - | ✅ | ✅ | ✅ | ✅ |
| Upload | - | ✅ | ✅ | ✅ | ❌ |
| Delete | - | ✅ | ✅ | ❌ | ❌ |
| **Brand Voice** |
| View | - | ✅ | ✅ | ✅ | ✅ |
| Edit | - | ✅ | ✅ | ❌ | ❌ |
| **API Keys** |
| View | - | ✅ | ✅ | ❌ | ❌ |
| Create | - | ✅ | ✅ | ❌ | ❌ |
| Revoke | - | ✅ | ✅ | ❌ | ❌ |

¹ Configurable via `allow_member_invites` org setting
² Admins cannot remove owners

---

## Frontend Implementation

### 1. Team Settings Page

**Route**: `/settings/team` or `/org/[slug]/team`

```typescript
// frontend/src/app/(dashboard)/settings/team/page.tsx

export default function TeamSettingsPage() {
  return (
    <div>
      <TeamHeader />          {/* Org name, logo, member count */}
      <InviteMemberForm />    {/* Email + role selector + invite button */}
      <PendingInvites />      {/* List of pending invites with revoke */}
      <MemberList />          {/* Current members with role badges */}
    </div>
  )
}
```

### 2. Invite Member Form

```typescript
// frontend/src/components/team/invite-member-form.tsx

interface InviteMemberFormProps {
  accountId: string
  userRole: 'owner' | 'admin' | 'member' | 'viewer'
}

export function InviteMemberForm({ accountId, userRole }: InviteMemberFormProps) {
  const canInvite = userRole === 'owner' || userRole === 'admin'

  async function handleInvite(email: string, role: string) {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('invite_user_to_org', {
      p_account_id: accountId,
      p_email: email,
      p_role: role
    })

    if (error) {
      toast.error(error.message)
    } else {
      // Send email via Edge Function or backend API
      await sendInviteEmail(email, data.token, accountId)
      toast.success(`Invitation sent to ${email}`)
    }
  }

  if (!canInvite) return null

  return (
    <form onSubmit={handleSubmit}>
      <Input type="email" placeholder="colleague@company.com" />
      <Select>
        <option value="member">Member</option>
        <option value="admin">Admin</option>
        {userRole === 'owner' && <option value="viewer">Viewer</option>}
      </Select>
      <Button type="submit">Send Invite</Button>
    </form>
  )
}
```

### 3. Accept Invitation Flow

**Route**: `/invite/[token]`

```typescript
// frontend/src/app/(auth)/invite/[token]/page.tsx

export default async function AcceptInvitePage({
  params
}: {
  params: { token: string }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch invitation details
  const { data: invite } = await supabase
    .from('org_invitations')
    .select('*, accounts(name, logo_url)')
    .eq('token', params.token)
    .single()

  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return <InvalidInvitePage />
  }

  // If not logged in, show sign up/login with email pre-filled
  if (!user) {
    return <AuthPage
      mode="signup"
      email={invite.email}
      redirectTo={`/invite/${params.token}`}
    />
  }

  // If logged in with different email
  if (user.email !== invite.email) {
    return <EmailMismatchPage
      inviteEmail={invite.email}
      currentEmail={user.email}
    />
  }

  // Show accept invitation UI
  return <AcceptInviteForm invite={invite} />
}
```

### 4. Member List Component

```typescript
// frontend/src/components/team/member-list.tsx

export function MemberList({ accountId, currentUserRole }: MemberListProps) {
  const [members, setMembers] = useState<Member[]>([])

  useEffect(() => {
    fetchMembers()
  }, [accountId])

  async function fetchMembers() {
    const supabase = createClient()
    const { data } = await supabase
      .from('account_members')
      .select(`
        id,
        role,
        created_at,
        user:auth.users(id, email, raw_user_meta_data)
      `)
      .eq('account_id', accountId)
      .order('created_at')

    setMembers(data || [])
  }

  return (
    <div className="space-y-2">
      {members.map(member => (
        <MemberRow
          key={member.id}
          member={member}
          currentUserRole={currentUserRole}
          onRoleChange={handleRoleChange}
          onRemove={handleRemove}
        />
      ))}
    </div>
  )
}
```

### 5. Org Switcher (Multi-Org Support)

```typescript
// frontend/src/components/layout/org-switcher.tsx

export function OrgSwitcher() {
  const { currentAccount, accounts, switchAccount } = useAccounts()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar src={currentAccount.logo_url} />
        <span>{currentAccount.display_name || currentAccount.name}</span>
        <ChevronDown />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {accounts.map(account => (
          <DropdownMenuItem
            key={account.id}
            onClick={() => switchAccount(account.id)}
          >
            <Avatar src={account.logo_url} size="sm" />
            <span>{account.display_name || account.name}</span>
            {account.id === currentAccount.id && <Check />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push('/org/new')}>
          <Plus /> Create Organization
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

---

## Email Templates

### 1. Invitation Email

```html
Subject: You've been invited to join {{org_name}} on Savant

Hi there,

{{inviter_name}} has invited you to join {{org_name}} as a {{role}} on Savant.

{{#if org_description}}
About {{org_name}}:
{{org_description}}
{{/if}}

Click the button below to accept the invitation:

[Accept Invitation]({{invite_url}})

This invitation will expire in 7 days.

If you weren't expecting this invitation, you can safely ignore this email.

---
Savant - AI-Powered Assistants for Your Business
```

### 2. Welcome to Org Email

```html
Subject: Welcome to {{org_name}}!

Hi {{user_name}},

You're now a {{role}} of {{org_name}} on Savant.

You now have access to:
- {{savant_count}} AI Savants
- {{document_count}} Knowledge Base Documents
- Shared Brand Voice

Get started: {{dashboard_url}}

---
Savant - AI-Powered Assistants for Your Business
```

---

## Backend Changes

### 1. Email Sending (Edge Function or Backend API)

```typescript
// backend/app/api/send_invite_email.py (or Supabase Edge Function)

async def send_invite_email(
    to_email: str,
    token: str,
    account_id: str,
    inviter_name: str
):
    # Get org details
    org = await supabase.from_('accounts').select('*').eq('id', account_id).single()

    invite_url = f"{settings.FRONTEND_URL}/invite/{token}"

    # Use Resend, SendGrid, or Supabase's built-in email
    await send_email(
        to=to_email,
        subject=f"You've been invited to join {org['name']} on Savant",
        template="invite",
        data={
            "org_name": org['name'],
            "inviter_name": inviter_name,
            "role": role,
            "invite_url": invite_url
        }
    )
```

### 2. Webhook for Auto-Accept (Optional)

When a new user signs up, check for pending invitations:

```sql
-- Trigger after user creation
CREATE OR REPLACE FUNCTION check_pending_invitations()
RETURNS TRIGGER AS $$
BEGIN
    -- Auto-accept any pending invitations for this email
    -- (Optional - could also show a notification instead)
    PERFORM accept_org_invitation(token)
    FROM org_invitations
    WHERE email = NEW.email
        AND accepted_at IS NULL
        AND expires_at > NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_created_check_invites
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION check_pending_invitations();
```

---

## Migration Plan

### Phase 1: Database Setup (1-2 days)
1. Create `org_invitations` table
2. Add columns to `accounts` table
3. Create database functions (invite, accept, remove, update role)
4. Add RLS policies
5. Create indexes

### Phase 2: Backend API (1-2 days)
1. Email sending endpoint/function
2. Invitation validation endpoint
3. Update user onboarding to check for invites

### Phase 3: Frontend - Team Management (2-3 days)
1. Team settings page (`/settings/team`)
2. Invite member form
3. Pending invites list
4. Member list with role management
5. Remove member confirmation

### Phase 4: Frontend - Invitation Flow (1-2 days)
1. Invitation acceptance page (`/invite/[token]`)
2. Email mismatch handling
3. Expired invitation handling
4. Post-acceptance redirect

### Phase 5: Frontend - Org Switcher (1 day)
1. Header org switcher dropdown
2. Create new org flow
3. Persist selected org in localStorage/cookie

### Phase 6: Testing & Polish (1-2 days)
1. Test all invitation scenarios
2. Test role permissions
3. Email deliverability testing
4. Mobile responsiveness
5. Error handling edge cases

**Total Estimated Effort**: 7-12 days

---

## Security Considerations

### 1. Invitation Token Security
- Use cryptographically secure random tokens (32 bytes hex)
- Expire invitations after 7 days
- Single-use tokens (marked as accepted after use)
- Rate limit invitation sending

### 2. Email Verification
- Only allow accepting invite if logged-in email matches invite email
- Prevent email enumeration (same response for valid/invalid tokens)

### 3. Role Escalation Prevention
- Admins cannot promote to owner
- Admins cannot demote owners
- Members cannot invite (unless org setting enabled)
- Cannot remove last owner

### 4. RLS Enforcement
- All functions use SECURITY DEFINER
- RLS policies on org_invitations
- Validate permissions in functions before actions

---

## Future Enhancements

### Phase 2 Features (Not in Initial Scope)
1. **SSO/SAML Integration** - Enterprise single sign-on
2. **Domain-Based Auto-Join** - Users with @company.com auto-join
3. **Activity Audit Log** - Track who did what
4. **Custom Roles** - Beyond the 4 predefined roles
5. **Org-Level API Keys** - Shared API keys for automation
6. **Sub-Teams/Groups** - Teams within organizations
7. **Usage Quotas per Member** - Limit individual usage
8. **Org Templates** - Pre-configured savant sets for new orgs

---

## Open Questions

1. **Onboarding Flow**: When a new user signs up, should they:
   - Auto-create a personal org?
   - Be prompted to join existing org or create new?
   - **Recommendation**: Auto-create personal org, can join others later

2. **Multiple Orgs**: Can a user belong to multiple organizations?
   - **Recommendation**: Yes, with org switcher in header

3. **Personal vs Org Accounts**: Should there be a distinction?
   - **Recommendation**: All accounts are "orgs", personal is just org of 1

4. **Billing**: How does billing work for orgs?
   - **Recommendation**: Billing is per-org, managed by owners only

5. **Data Isolation**: Can users move savants between orgs?
   - **Recommendation**: Not in v1, add export/import later

---

## Success Metrics

1. **Adoption**: 50%+ of active accounts have 2+ members within 3 months
2. **Invites**: 80%+ of invitations accepted within 7 days
3. **Retention**: Team accounts have 2x higher retention than solo accounts
4. **Support**: <5% of support tickets related to team management
5. **Performance**: Invitation flow completes in <3 seconds

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Confirm email provider** (Resend, SendGrid, Supabase built-in)
3. **Create feature branch**: `feat/org-team-access`
4. **Start Phase 1**: Database schema changes
5. **Iterate** based on feedback during implementation

---

**Plan End**
**Last Updated**: January 29, 2026
