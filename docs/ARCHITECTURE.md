# Savant - Technical Architecture Document

## Document Info
- **Version**: 1.1
- **Last Updated**: January 2025
- **Status**: Active Development

---

## 1. Architecture Overview

Savant uses a **monorepo** structure with two main services:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              SAVANT PLATFORM                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────┐         ┌─────────────────────┐               │
│  │   Next.js Frontend  │  HTTP   │    Agno AgentOS     │               │
│  │   (Vercel)          │ ──────► │    (Railway/Render) │               │
│  │                     │         │                     │               │
│  │  • React UI         │         │  • Agent Runtime    │               │
│  │  • Dashboard        │         │  • Chat API         │               │
│  │  • Auth Flow        │         │  • RAG Pipeline     │               │
│  │  • API Proxy        │         │  • Tracing          │               │
│  └─────────┬───────────┘         └──────────┬──────────┘               │
│            │                                │                           │
│            │           ┌────────────────────┴───────────┐               │
│            │           │                                │               │
│            ▼           ▼                                ▼               │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                         SUPABASE                                  │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │  │
│  │  │     Auth     │  │   Storage    │  │   PostgreSQL + pgvector │  │
│  │  │  (OAuth/JWT) │  │ (Documents)  │  │  (Data + Embeddings)   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

### Frontend (Next.js 15)
| Component | Technology |
|-----------|------------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Styling | Tailwind CSS |
| Components | shadcn/ui |
| State | Zustand |
| Forms | React Hook Form + Zod |
| HTTP Client | Native fetch |

### Backend (Agno AgentOS)
| Component | Technology |
|-----------|------------|
| Framework | Agno AgentOS (FastAPI) |
| Language | Python 3.11+ |
| Agents | Agno Agent/Team/Workflow |
| LLM | OpenAI (gpt-4o-mini), Anthropic |
| Embeddings | OpenAI text-embedding-ada-002 |
| Database | Supabase PostgreSQL |
| Vector Store | pgvector via Supabase |
| Tracing | Agno OpenTelemetry |

### Infrastructure
| Component | Provider |
|-----------|----------|
| Frontend Hosting | Vercel |
| Backend Hosting | Railway or Render |
| Database | Supabase |
| File Storage | Supabase Storage |
| CDN | Vercel Edge |
| Payments | Stripe + Autumn |

---

## 3. Key Design Decisions

### 3.1 Why Agno AgentOS?

Instead of building a custom FastAPI backend, we use **Agno AgentOS** because it provides:

| Feature | Benefit |
|---------|---------|
| **Built-in FastAPI app** | No boilerplate, production-ready |
| **RBAC Authentication** | JWT + scopes out of the box |
| **Session Management** | Automatic conversation persistence |
| **120+ Tools** | Pre-built integrations (MCP, APIs) |
| **Database Support** | Native Supabase/PostgreSQL support |
| **Tracing** | OpenTelemetry observability built-in |
| **Multi-agent** | Teams and workflows for future features |
| **Privacy-first** | All data stays in your infrastructure |

### 3.2 Why Supabase pgvector?

| Factor | pgvector | Pinecone |
|--------|----------|----------|
| **Cost** | 75% cheaper | Higher |
| **Integration** | Same DB as app data | Separate service |
| **Isolation** | RLS policies | Namespaces |
| **Latency** | ~10-100ms | ~1-10ms |
| **Ops** | Managed by Supabase | Fully managed |
| **Flexibility** | SQL joins with vectors | Vectors only |

**Decision**: pgvector wins for unified platform, cost, and RLS security.

### 3.3 Multi-Tenancy Strategy

```sql
-- Every table includes account_id for RLS
CREATE TABLE savants (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL,  -- Tenant isolation
  ...
);

-- RLS Policy ensures tenant isolation
CREATE POLICY "Users see own account data"
  ON savants FOR SELECT
  USING (account_id IN (SELECT get_user_account_ids()));
```

**Vector Isolation**: Each `document_chunk` has `savant_id` - the `match_chunks()` function filters by this BEFORE vector similarity search.

---

## 4. System Components

### 4.1 Next.js Frontend

```
src/
├── app/                      # App Router pages
│   ├── (auth)/               # Auth routes (public)
│   │   ├── login/            # Login page (with error handling)
│   │   ├── signup/           # Signup page
│   │   └── reset-password/   # Password reset page (NEW - Jan 2025)
│   ├── (dashboard)/          # Protected routes
│   │   ├── savants/          # Savant management
│   │   ├── prompts/          # Account prompts
│   │   └── settings/         # Account settings
│   └── api/                  # API routes (proxy to AgentOS)
│       ├── auth/
│       │   └── callback/     # Auth callback (UPDATED - handles 'next' param)
│       ├── savants/[id]/chat/  # Chat proxy
│       └── webhooks/         # Stripe, Autumn
│
├── components/               # React components
│   ├── ui/                   # shadcn/ui
│   ├── auth/                 # Auth components (NEW section)
│   │   ├── login-form.tsx    # Login form (UPDATED - error handling)
│   │   ├── signup-form.tsx   # Signup form
│   │   └── reset-password-form.tsx  # Password reset form (NEW)
│   ├── chat/                 # Chat interface
│   ├── documents/            # Upload, status
│   └── savants/              # CRUD components
│       └── savant-form.tsx   # Create/edit (UPDATED - .nullish() validation)
│
├── lib/                      # Utilities
│   ├── supabase/             # Client setup
│   └── api/                  # API helpers
│
└── hooks/                    # React hooks
```

### 4.2 Agno AgentOS Backend

```
backend/
├── app/
│   ├── main.py               # AgentOS entry point
│   │
│   ├── agents/
│   │   ├── savant_agent.py   # Main Savant agent with RAG
│   │   └── tools/
│   │       └── rag_tool.py   # Vector search tool
│   │
│   ├── routes/
│   │   └── brand_voice.py    # Brand voice API endpoints
│   │
│   ├── middleware/
│   │   ├── auth.py           # JWT validation (Supabase)
│   │   ├── rate_limit.py     # Rate limiting
│   │   └── logging.py        # Request logging
│   │
│   ├── services/
│   │   ├── supabase.py       # Supabase client
│   │   ├── embeddings.py     # OpenAI embeddings
│   │   └── documents.py      # Document processing
│   │
│   └── config.py             # Settings (Pydantic)
│
├── requirements.txt
├── Dockerfile
└── pyproject.toml
```

### 4.3 Brand Voice System

```
Frontend Structure:
src/components/brand-voice/
├── brand-voice-form.tsx          # Main form container
├── trait-selector.tsx            # Simple mode: personality traits
├── advanced-section.tsx          # Advanced mode expandable wrapper
├── business-info-form.tsx        # Business details + website analysis
├── brand-identity-form.tsx       # Brand pillars + voice description
└── voice-dimensions.tsx          # "This vs That" spectrum selectors

Backend Structure:
backend/app/routes/brand_voice.py
├── /api/generate-brand-voice     # AI prompt generation from traits
├── /api/analyze-website          # Firecrawl scraping + AI extraction
├── extract_business_info()       # AI extraction helper
└── build_advanced_prompt_context() # Context builder for advanced mode
```

**Brand Voice Data Flow:**

```
┌──────────────────────────────────────────────────────────────────┐
│                       BRAND VOICE SYSTEM                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User selects traits + fills advanced sections                  │
│                    ↓                                             │
│  Frontend (brand-voice-form.tsx)                                 │
│                    ↓                                             │
│  Server Action (generateBrandVoicePrompt)                        │
│                    ↓                                             │
│  Backend API (/api/generate-brand-voice)                         │
│                    ↓                                             │
│  OpenRouter → Claude Haiku 4.5                                   │
│                    ↓                                             │
│  Generated system prompt returned                                │
│                    ↓                                             │
│  Saved to account_prompts.brand_voice_traits (JSONB)            │
│                    ↓                                             │
│  Applied to all Savants in account                               │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Website Analysis Flow:**

```
User enters website URL → Click "Analyze"
           ↓
Backend /api/analyze-website
           ↓
Firecrawl API (scrapes to markdown)
           ↓
Claude Haiku extracts structured data:
  - Business name
  - Business description
  - Primary category
  - Target audience
  - Services
  - Tone hints
           ↓
Returns JSON → Frontend auto-fills form fields
```

---

## 5. Data Architecture

### 5.1 Database Schema

```
┌──────────────────────────────────────────────────────────────────┐
│                         SUPABASE POSTGRESQL                      │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  accounts ────────────┬───────────── account_members             │
│     │                 │                    │                     │
│     │                 │                    │                     │
│     ▼                 ▼                    ▼                     │
│  savants         account_prompts      api_keys                   │
│     │                 │                                          │
│     ├─────────────────┤                                          │
│     │                 │                                          │
│     ▼                 ▼                                          │
│  documents     savant_prompt_links                               │
│     │                                                            │
│     ▼                                                            │
│  document_chunks  ◄──── pgvector embeddings                      │
│     │                                                            │
│     │                                                            │
│  conversations ────────── messages                               │
│                              │                                   │
│                              ▼                                   │
│                        usage_records                             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 5.2 Key Tables

| Table | Purpose | Key Fields | Notes |
|-------|---------|------------|-------|
| `accounts` | Multi-tenant root | `id`, `owner_id`, `default_system_prompt` | |
| `account_prompts` | Account-level prompts & brand voice | `id`, `account_id`, `is_brand_voice`, `brand_voice_traits` (JSONB) | |
| `savants` | AI bots | `id`, `account_id`, `description` (TEXT), `system_prompt` (TEXT), `model_config`, `rag_config` | description & system_prompt: unlimited (TEXT type), frontend validates 3000 chars |
| `documents` | Uploaded files | `id`, `savant_id`, `file_path`, `status` | |
| `document_chunks` | Vector embeddings | `id`, `savant_id`, `content`, `embedding` | |
| `conversations` | Chat sessions | `id`, `savant_id`, `session_id` | |
| `messages` | Chat messages | `id`, `conversation_id`, `role`, `content` | |

**Brand Voice Storage:**

Brand voice is stored in `account_prompts` table with:
- `is_brand_voice: true` - Flag to identify the brand voice prompt
- `brand_voice_traits: JSONB` - All trait data in flexible JSON format:

```json
{
  "selectedTraits": ["cheerful", "empathetic"],
  "customNotes": "Always mention 24/7 support",
  "advanced": {
    "businessInfo": {
      "businessName": "Acme Inc",
      "businessDescription": "...",
      "primaryCategory": "Technology/SaaS",
      "locations": "Global",
      "idealCustomer": "Enterprise teams"
    },
    "brandIdentity": {
      "brandPillars": ["Innovation", "Speed"],
      "voiceDescription": "Professional but approachable",
      "differentiators": "...",
      "messagingRestrictions": "..."
    },
    "voiceDimensions": {
      "casualVsFormal": "b",
      "warmVsCool": "a",
      "dimensionNotes": {}
    },
    "websiteAnalysis": {
      "title": "...",
      "content": "...",
      "analyzedAt": "2026-01-15T10:30:00Z"
    }
  }
}
```

### 5.3 Vector Search Function

```sql
CREATE FUNCTION match_chunks(
  query_embedding vector(1536),
  p_savant_id uuid,
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  content text,
  similarity float
) AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE savant_id = p_savant_id
    AND 1 - (embedding <=> query_embedding) > match_threshold
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql;
```

---

## 6. API Design

### 6.1 Next.js API Routes (Proxy)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/savants` | List savants |
| POST | `/api/savants` | Create savant |
| PATCH | `/api/savants/[id]` | Update savant |
| DELETE | `/api/savants/[id]` | Delete savant |
| POST | `/api/savants/[id]/chat` | Proxy to AgentOS chat |
| POST | `/api/savants/[id]/documents` | Upload document |

### 6.2 AgentOS Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agents/{agent_id}/runs` | Run agent (chat) |
| POST | `/agents/{agent_id}/runs/{run_id}/cancel` | Cancel run |
| GET | `/health` | Health check |

### 6.3 Brand Voice Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate-brand-voice` | Generate system prompt from personality traits using Claude Haiku 4.5 |
| POST | `/api/analyze-website` | Scrape website with Firecrawl and extract business info with AI |

**Generate Brand Voice Request:**
```json
{
  "traits": ["cheerful", "empathetic"],
  "advanced_data": {
    "businessInfo": {...},
    "brandIdentity": {...},
    "voiceDimensions": {...}
  }
}
```

**Analyze Website Request:**
```json
{
  "url": "https://example.com"
}
```

**Analyze Website Response:**
```json
{
  "success": true,
  "title": "Company Name",
  "description": "Meta description",
  "extracted": {
    "businessName": "...",
    "businessDescription": "...",
    "primaryCategory": "Technology/SaaS",
    "targetAudience": "...",
    "services": "...",
    "toneHints": "..."
  }
}
```

### 6.4 Chat API Flow

```
1. Browser → POST /api/savants/{id}/chat
2. Next.js API Route:
   - Validate session (Supabase Auth)
   - Get Savant config from DB
   - Proxy to AgentOS with JWT
3. AgentOS:
   - Validate JWT (RBAC)
   - Create agent with savant config
   - Execute RAG tool (vector search)
   - Stream response via SSE
4. Browser ← SSE stream tokens
```

---

## 7. Authentication & Security

### 7.1 Auth Flow

```
┌────────┐      ┌─────────┐      ┌──────────────┐      ┌───────────┐
│ Browser │ ──► │ Next.js │ ──► │ Supabase Auth │ ──► │   Google  │
└────────┘      └─────────┘      └──────────────┘      │   OAuth   │
                    │                   │               └───────────┘
                    │                   │
                    │              JWT Token
                    │                   │
                    ▼                   ▼
              ┌─────────┐      ┌──────────────┐
              │ AgentOS │ ◄─── │    Session   │
              │ (RBAC)  │      │    Cookie    │
              └─────────┘      └──────────────┘
```

### 7.2 Password Reset Flow (Implemented Jan 2025)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PASSWORD RESET FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. User clicks "Forgot Password" on /login                     │
│                    ↓                                            │
│  2. Enter email → Supabase sends OTP email                      │
│                    ↓                                            │
│  3. User clicks link in email                                   │
│     URL: /api/auth/callback?code=xxx&next=/reset-password       │
│                    ↓                                            │
│  4. Auth Callback Route (/api/auth/callback/route.ts)           │
│     • Exchanges code for session                                │
│     • Validates 'next' parameter (prevents open redirect)       │
│     • Handles errors (expired OTP, invalid code)                │
│     • Redirects to next=/reset-password with session            │
│                    ↓                                            │
│  5. Reset Password Page (/app/(auth)/reset-password/page.tsx)   │
│     • Wrapped in Suspense (Next.js 16 requirement)              │
│     • Displays ResetPasswordForm component                      │
│                    ↓                                            │
│  6. User enters new password + confirmation                     │
│     • Min 8 characters validation                               │
│     • Password confirmation must match                          │
│                    ↓                                            │
│  7. Submit → supabase.auth.updateUser({ password })             │
│                    ↓                                            │
│  8. Success → Auto-redirect to /login after 2 seconds           │
│                    ↓                                            │
│  9. User logs in with new password                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Error Handling:**
- **Expired OTP**: Redirects to `/login?error=access_denied&error_code=otp_expired`
- **Invalid Code**: Redirects to `/login?error=auth_failed`
- **Server Error**: Redirects to `/login?error=server_error`
- Login form parses error params and displays user-friendly messages

**Security:**
- `next` parameter validated (must start with `/` to prevent open redirect attacks)
- Password min length: 8 characters
- Session must be valid to access reset password page

### 7.3 Security Layers

| Layer | Protection |
|-------|------------|
| **Supabase RLS** | Database-level tenant isolation |
| **AgentOS RBAC** | JWT scope-based API access |
| **Next.js Middleware** | Route protection, session validation |
| **API Rate Limiting** | Per-IP and per-user limits |
| **CORS** | Restrict origins |
| **Open Redirect Prevention** | Auth callback validates `next` param starts with `/` |
| **Password Validation** | Minimum 8 characters, confirmation matching |
| **OTP Expiration** | Email links expire after 24 hours (configurable) |

### 7.4 Form Validation & Input Handling

**Zod Schema Configuration:**

Forms use Zod for validation with specific handling for optional fields:

```typescript
// Savant creation form validation
const savantSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(3000).nullish(),  // Allows null/undefined/string
  model: z.string(),
  temperature: z.number().min(0).max(2),
  systemPrompt: z.string().max(3000).nullish(), // Increased from 5000
  useBrandVoice: z.boolean(),
})
```

**Key Changes (Jan 2025):**
- Changed from `.optional()` to `.nullish()` for better react-hook-form compatibility
- `.nullish()` accepts `null`, `undefined`, AND valid strings
- Prevents TypeScript errors with controlled inputs
- Character limits: description (3000), system_prompt (3000)

**React Hook Form Integration:**
```typescript
// Convert null/undefined to empty string for controlled inputs
<Textarea
  {...field}
  value={field.value ?? ''}  // Prevents null value errors
/>
```

**Default Values:**
```typescript
const defaultValues = {
  description: undefined,      // Not '' (empty string)
  systemPrompt: undefined,     // Not '' (empty string)
}
```

### 7.5 AgentOS JWT Scopes

```python
# Required scopes for Savant operations
SCOPES = {
    "agents:read": "List and view agents",
    "agents:run": "Execute agent runs",
    "sessions:read": "Read session history",
    "sessions:write": "Create/update sessions"
}
```

---

## 8. Data Flows

### 8.1 Document Processing

```
1. Upload → Supabase Storage
2. Create document record (status: pending)
3. Background job (Edge Function or queue):
   a. Download file from Storage
   b. Parse (PDF, DOCX, TXT)
   c. Chunk (1000 chars, 200 overlap)
   d. Generate embeddings (OpenAI)
   e. Insert into document_chunks
   f. Update status: completed
4. Frontend polls/subscribes for status
```

### 8.2 Chat with RAG

```
1. User sends a message
2. AgentOS receives request
3. RAG Tool executes:
   a. Generate query embedding
   b. Call match_chunks() with savant_id filter
   c. Return top-k relevant chunks
4. Build prompt: System + Context + History + User Message
5. LLM generates response
6. Stream tokens back to client
7. Save message to database
8. Track usage for billing
```

---

## 9. Scalability Considerations

### 9.1 Horizontal Scaling

| Component | Scaling Strategy |
|-----------|------------------|
| **Next.js** | Vercel auto-scales |
| **AgentOS** | Multiple container instances |
| **Supabase** | Managed scaling, read replicas |
| **Vector Search** | HNSW index in-memory |

### 9.2 Performance Optimizations

| Optimization | Implementation |
|--------------|----------------|
| **Connection Pooling** | Supabase built-in (pgbouncer) |
| **Embedding Batching** | Process 100 chunks at a time |
| **Streaming Responses** | SSE from AgentOS |
| **Edge Caching** | Vercel Edge for static content |
| **Lazy Loading** | React.lazy for dashboard components |

---

## 10. Observability

### 10.1 Tracing (AgentOS)

```python
from agno.trace import setup_tracing
from agno.db.postgres import PostgresDb

# All traces stored in your own database
db = PostgresDb(url=SUPABASE_URL)
setup_tracing(db=db)
```

**Captured automatically**:
- Agent runs with timing
- LLM calls with token usage
- Tool invocations
- Errors and exceptions

### 10.2 Monitoring

| Metric | Tool |
|--------|------|
| **Error tracking** | Sentry |
| **Uptime monitoring** | Better Uptime |
| **Usage analytics** | PostHog |
| **Billing metrics** | Autumn dashboard |

---

## 11. Future Architecture

### Phase 2: Multi-Agent

```python
# Connect Savants using AgentOS Teams
from agno.team import Team

support_agent = Agent(id="support", ...)
sales_agent = Agent(id="sales", ...)

team = Team(
    agents=[support_agent, sales_agent],
    mode="route"  # LLM decides which agent handles the request
)
```

### Phase 3: Tool Integrations

```python
# MCP Server integration
from agno.tools.mcp import McpToolset

composio_tools = McpToolset.from_server(
    command="npx",
    args=["-y", "@composio/mcp-server"]
)

agent = Agent(
    tools=[*composio_tools.tools],
    ...
)
```

---

## 12. Deployment Architecture

### Production Setup

```
┌─────────────────────────────────────────────────────────────────┐
│                          PRODUCTION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Vercel                          Railway/Render                 │
│  ┌───────────────────┐          ┌───────────────────┐          │
│  │    Next.js App    │          │    AgentOS        │          │
│  │   (Edge Runtime)  │          │   (Container)     │          │
│  │                   │  HTTPS   │                   │          │
│  │  • Dashboard      │ ◄──────► │  • Agent API      │          │
│  │  • Auth Flow      │          │  • Tracing        │          │
│  │  • API Proxy      │          │  • RAG Pipeline   │          │
│  └───────────────────┘          └───────────────────┘          │
│           │                              │                      │
│           │                              │                      │
│           └──────────────┬───────────────┘                      │
│                          │                                      │
│                          ▼                                      │
│  Supabase (Managed)                                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL + pgvector  │  Auth  │  Storage  │ Realtime  │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Environment Variables

**Next.js (.env.local)**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
AGNO_API_URL=https://savant-backend.railway.app
```

**AgentOS (.env)**
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=xxx
OPENAI_API_KEY=sk-xxx
OPENROUTER_API_KEY=sk-or-xxx
FIRECRAWL_API_KEY=fc-xxx
CORS_ORIGINS=https://savant.vercel.app
```

---

## Appendix

### A. Agno AgentOS Key Concepts

| Concept | Description |
|---------|-------------|
| **Agent** | AI entity with tools, model, and instructions |
| **Team** | Multiple agents working together |
| **Workflow** | Deterministic multi-step process |
| **Tool** | Function an agent can call |
| **Session** | Conversation context |
| **Trace** | Execution log for debugging |

### B. pgvector Configuration

```sql
-- HNSW index for similarity search
CREATE INDEX ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Composite index for filtered search
CREATE INDEX ON document_chunks (savant_id);
```

### C. References

- [Agno Documentation](https://docs.agno.com/)
- [Supabase pgvector Guide](https://supabase.com/docs/guides/ai)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Relevance AI](https://relevanceai.com/) (inspiration)
