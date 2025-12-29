# Savant - Implementation Guide

## Document Info
- **Version**: 1.0
- **Last Updated**: December 2024

---

## 1. Project Setup

### 1.1 Repository Structure

```bash
savant/
├── frontend/                 # Next.js 15 app
├── backend/                  # Agno AgentOS
├── supabase/                 # Database migrations
├── docs/                     # Documentation
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── IMPLEMENTATION_GUIDE.md
└── README.md
```

### 1.2 Prerequisites

- Node.js 20+
- Python 3.11+
- Docker (for local PostgreSQL)
- Supabase CLI
- pnpm (recommended) or npm

---

## 2. Phase 1: Foundation

### 2.1 Initialize Next.js Frontend

```bash
# Create Next.js project
cd savant
pnpm create next-app@latest frontend --typescript --tailwind --eslint --app --src-dir

# Install dependencies
cd frontend
pnpm add @supabase/supabase-js @supabase/ssr zustand zod react-hook-form
pnpm add -D @types/node

# Install shadcn/ui
pnpm dlx shadcn@latest init
pnpm dlx shadcn@latest add button input card dialog dropdown-menu avatar
```

### 2.2 Initialize Agno Backend

```bash
# Create backend directory
cd ../backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install Agno and dependencies
pip install agno fastapi uvicorn supabase python-dotenv

# Create requirements.txt
pip freeze > requirements.txt
```

**backend/app/main.py**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.os import AgentOS
from agno.db.postgres import PostgresDb
from agno.trace import setup_tracing
import os
from dotenv import load_dotenv

load_dotenv()

# Create base FastAPI app
app = FastAPI(title="Savant API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database for sessions and tracing
db = PostgresDb(
    db_url=os.getenv("SUPABASE_DB_URL"),
    table_name="agno_sessions"
)

# Setup tracing
setup_tracing(db=db)

# Create base Savant agent (will be customized per-request)
base_agent = Agent(
    id="savant-base",
    name="Savant",
    model=OpenAIChat(id=os.getenv("DEFAULT_MODEL", "gpt-4o-mini")),
    description="A customizable AI assistant with knowledge base",
    instructions=["Be helpful and accurate"],
    db=db,
    markdown=True,
)

# Create AgentOS
agent_os = AgentOS(
    agents=[base_agent],
    base_app=app,
    name="Savant OS",
    description="Savant Platform Agent Runtime"
)

# Health check
@app.get("/health")
async def health():
    return {"status": "healthy", "service": "savant-agentos"}

# Get the combined app
app = agent_os.get_app()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

### 2.3 Setup Supabase

```bash
# Install Supabase CLI
brew install supabase/tap/supabase  # macOS
# or npm install -g supabase

# Initialize Supabase
cd ../supabase
supabase init

# Start local Supabase (Docker required)
supabase start
```

Create the initial migration:

**supabase/migrations/001_initial_schema.sql**
```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Accounts (multi-tenant root)
CREATE TABLE public.accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_system_prompt TEXT,
  settings JSONB DEFAULT '{}',
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  stripe_customer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account members
CREATE TABLE public.account_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

-- Savants (AI bots)
CREATE TABLE public.savants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  system_prompt TEXT,
  model_config JSONB DEFAULT '{
    "provider": "openai",
    "model": "gpt-4o-mini",
    "temperature": 0.7,
    "max_tokens": 4096
  }',
  rag_config JSONB DEFAULT '{
    "enabled": true,
    "match_threshold": 0.7,
    "match_count": 5,
    "chunk_size": 1000,
    "chunk_overlap": 200
  }',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(account_id, slug)
);

-- Documents
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  savant_id UUID NOT NULL REFERENCES public.savants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  chunk_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks with vectors
CREATE TABLE public.document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  savant_id UUID NOT NULL REFERENCES public.savants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  chunk_index INT NOT NULL,
  embedding extensions.vector(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- HNSW index for vector search
CREATE INDEX ON public.document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- B-tree index for savant filtering
CREATE INDEX idx_chunks_savant ON public.document_chunks(savant_id);

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  savant_id UUID NOT NULL REFERENCES public.savants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  savant_id UUID NOT NULL REFERENCES public.savants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  context_chunks JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Account prompts
CREATE TABLE public.account_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  priority INT DEFAULT 0,
  applies_to_all BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_prompts ENABLE ROW LEVEL SECURITY;

-- Helper function
CREATE OR REPLACE FUNCTION public.get_user_account_ids()
RETURNS SETOF UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT account_id FROM public.account_members
  WHERE user_id = auth.uid()
$$;

-- RLS Policies
CREATE POLICY "Users can view their accounts"
  ON public.accounts FOR SELECT
  USING (id IN (SELECT public.get_user_account_ids()));

CREATE POLICY "Members can view savants"
  ON public.savants FOR SELECT
  USING (account_id IN (SELECT public.get_user_account_ids()));

CREATE POLICY "Members can manage savants"
  ON public.savants FOR ALL
  USING (account_id IN (SELECT public.get_user_account_ids()));

CREATE POLICY "Members can view documents"
  ON public.documents FOR SELECT
  USING (account_id IN (SELECT public.get_user_account_ids()));

CREATE POLICY "Members can manage documents"
  ON public.documents FOR ALL
  USING (account_id IN (SELECT public.get_user_account_ids()));

CREATE POLICY "Members can view chunks"
  ON public.document_chunks FOR SELECT
  USING (account_id IN (SELECT public.get_user_account_ids()));

-- Vector similarity search function
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding extensions.vector(1536),
  p_savant_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  document_id UUID,
  similarity FLOAT,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.content,
    dc.document_id,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    dc.metadata
  FROM public.document_chunks dc
  WHERE dc.savant_id = p_savant_id
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER savants_updated_at
  BEFORE UPDATE ON public.savants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

Run the migration:
```bash
supabase db push
```

---

## 3. Phase 2: Authentication

### 3.1 Supabase Client Setup

**frontend/src/lib/supabase/client.ts**
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**frontend/src/lib/supabase/server.ts**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component
          }
        },
      },
    }
  )
}
```

### 3.2 Auth Middleware

**frontend/src/middleware.ts**
```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Redirect logged-in users from auth pages
  if ((request.nextUrl.pathname === '/login' ||
       request.nextUrl.pathname === '/signup') && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/signup'],
}
```

---

## 4. Phase 3: Savant Management

### 4.1 Savant Types

**frontend/src/types/database.ts**
```typescript
export interface Savant {
  id: string
  account_id: string
  name: string
  slug: string
  description: string | null
  avatar_url: string | null
  system_prompt: string | null
  model_config: {
    provider: 'openai' | 'anthropic'
    model: string
    temperature: number
    max_tokens: number
  }
  rag_config: {
    enabled: boolean
    match_threshold: number
    match_count: number
    chunk_size: number
    chunk_overlap: number
  }
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  savant_id: string
  account_id: string
  name: string
  file_path: string
  file_type: string
  file_size: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  error_message: string | null
  chunk_count: number
  created_at: string
  updated_at: string
}
```

### 4.2 Savant API Route

**frontend/src/app/api/savants/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('savants')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const body = await request.json()

  // Get user's account
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: account } = await supabase
    .from('account_members')
    .select('account_id')
    .eq('user_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'No account found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('savants')
    .insert({
      account_id: account.account_id,
      name: body.name,
      slug: body.name.toLowerCase().replace(/\s+/g, '-'),
      description: body.description,
      system_prompt: body.system_prompt,
      model_config: body.model_config,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

---

## 5. Phase 4: Document Processing

### 5.1 Upload Handler

**frontend/src/app/api/savants/[savantId]/documents/route.ts**
```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: { savantId: string } }
) {
  const supabase = await createClient()
  const formData = await request.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Get savant to verify access and get account_id
  const { data: savant, error: savantError } = await supabase
    .from('savants')
    .select('id, account_id')
    .eq('id', params.savantId)
    .single()

  if (savantError || !savant) {
    return NextResponse.json({ error: 'Savant not found' }, { status: 404 })
  }

  // Upload to Supabase Storage
  const filePath = `${savant.account_id}/${savant.id}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file)

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  // Create document record
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      savant_id: savant.id,
      account_id: savant.account_id,
      name: file.name,
      file_path: filePath,
      file_type: file.type,
      file_size: file.size,
      status: 'pending',
    })
    .select()
    .single()

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 })
  }

  // Trigger processing (could be Edge Function, queue, etc.)
  await fetch(`${process.env.AGNO_API_URL}/documents/process`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ document_id: document.id }),
  })

  return NextResponse.json(document)
}
```

### 5.2 Document Processor (Agno Backend)

**backend/app/services/documents.py**
```python
import os
from supabase import create_client
from openai import OpenAI
from typing import List

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
openai = OpenAI()

def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    """Split text into overlapping chunks."""
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunk = text[start:end]
        chunks.append(chunk)
        start = end - overlap
    return chunks

def generate_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate embeddings for a list of texts."""
    response = openai.embeddings.create(
        model="text-embedding-ada-002",
        input=texts
    )
    return [item.embedding for item in response.data]

async def process_document(document_id: str):
    """Process a document: download, chunk, embed, store."""
    # Get document
    doc = supabase.table("documents").select("*").eq("id", document_id).single().execute()
    if not doc.data:
        raise ValueError("Document not found")

    document = doc.data

    # Update status
    supabase.table("documents").update({"status": "processing"}).eq("id", document_id).execute()

    try:
        # Download file
        file_data = supabase.storage.from_("documents").download(document["file_path"])

        # Parse based on file type (simplified - use proper parsers)
        text = file_data.decode("utf-8", errors="ignore")

        # Chunk
        chunks = chunk_text(text)

        # Generate embeddings in batches
        batch_size = 100
        all_chunk_records = []

        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            embeddings = generate_embeddings(batch)

            for idx, (chunk, embedding) in enumerate(zip(batch, embeddings)):
                all_chunk_records.append({
                    "document_id": document_id,
                    "savant_id": document["savant_id"],
                    "account_id": document["account_id"],
                    "content": chunk,
                    "chunk_index": i + idx,
                    "embedding": embedding,
                    "metadata": {
                        "source": document["name"],
                        "chunk_index": i + idx,
                    }
                })

        # Insert chunks
        supabase.table("document_chunks").insert(all_chunk_records).execute()

        # Update status
        supabase.table("documents").update({
            "status": "completed",
            "chunk_count": len(chunks)
        }).eq("id", document_id).execute()

    except Exception as e:
        supabase.table("documents").update({
            "status": "failed",
            "error_message": str(e)
        }).eq("id", document_id).execute()
        raise
```

---

## 6. Phase 5: Chat Interface

### 6.1 RAG Tool for Agno

**backend/app/agents/tools/rag_tool.py**
```python
from agno.tools import tool
import os
from openai import OpenAI
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)
openai = OpenAI()

@tool
def search_knowledge_base(
    query: str,
    savant_id: str,
    match_threshold: float = 0.7,
    match_count: int = 5
) -> str:
    """
    Search the Savant's knowledge base for relevant information.

    Args:
        query: The search query
        savant_id: The ID of the Savant
        match_threshold: Minimum similarity score (0-1)
        match_count: Maximum number of results

    Returns:
        Relevant context from the knowledge base
    """
    # Generate query embedding
    response = openai.embeddings.create(
        model="text-embedding-ada-002",
        input=query
    )
    query_embedding = response.data[0].embedding

    # Search vectors
    result = supabase.rpc(
        "match_chunks",
        {
            "query_embedding": query_embedding,
            "p_savant_id": savant_id,
            "match_threshold": match_threshold,
            "match_count": match_count
        }
    ).execute()

    if not result.data:
        return "No relevant information found in the knowledge base."

    # Format results
    context_parts = []
    for chunk in result.data:
        context_parts.append(f"[Source: {chunk.get('metadata', {}).get('source', 'Unknown')}]\n{chunk['content']}")

    return "\n\n---\n\n".join(context_parts)
```

### 6.2 Dynamic Savant Agent

**backend/app/agents/savant_agent.py**
```python
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.db.postgres import PostgresDb
from .tools.rag_tool import search_knowledge_base
import os
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_ROLE_KEY")
)

db = PostgresDb(db_url=os.getenv("SUPABASE_DB_URL"))

def create_savant_agent(savant_id: str) -> Agent:
    """Create an agent configured for a specific Savant."""

    # Get savant config from database
    result = supabase.table("savants").select("*").eq("id", savant_id).single().execute()
    savant = result.data

    if not savant:
        raise ValueError(f"Savant {savant_id} not found")

    model_config = savant.get("model_config", {})
    rag_config = savant.get("rag_config", {})

    # Build system prompt
    system_prompt = savant.get("system_prompt") or "You are a helpful AI assistant."

    # Add RAG instructions if enabled
    if rag_config.get("enabled", True):
        system_prompt += """

When answering questions, use the search_knowledge_base tool to find relevant information.
Always cite your sources when using information from the knowledge base.
If the knowledge base doesn't have relevant information, say so clearly."""

    # Create agent
    agent = Agent(
        id=f"savant-{savant_id}",
        name=savant.get("name", "Savant"),
        model=OpenAIChat(
            id=model_config.get("model", "gpt-4o-mini"),
            temperature=model_config.get("temperature", 0.7),
            max_tokens=model_config.get("max_tokens", 4096),
        ),
        description=savant.get("description") or "AI assistant",
        instructions=[system_prompt],
        tools=[search_knowledge_base] if rag_config.get("enabled", True) else [],
        db=db,
        markdown=True,
    )

    # Store savant_id in agent context for RAG tool
    agent._savant_id = savant_id

    return agent
```

### 6.3 Chat Endpoint

**backend/app/routes/chat.py**
```python
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from ..agents.savant_agent import create_savant_agent
import json

router = APIRouter()

@router.post("/savants/{savant_id}/chat")
async def chat(savant_id: str, request: Request):
    """Stream chat response from a Savant."""
    body = await request.json()
    messages = body.get("messages", [])
    session_id = body.get("session_id")

    # Create agent for this savant
    agent = create_savant_agent(savant_id)

    # Get last user message
    user_message = messages[-1]["content"] if messages else ""

    async def generate():
        # Stream response
        response = agent.run(
            user_message,
            stream=True,
            session_id=session_id
        )

        for chunk in response:
            if hasattr(chunk, 'content') and chunk.content:
                yield f"data: {json.dumps({'content': chunk.content})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )
```

---

## 7. Running the Application

### 7.1 Development

```bash
# Terminal 1: Start Supabase
cd supabase
supabase start

# Terminal 2: Start Agno backend
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 3: Start Next.js frontend
cd frontend
pnpm dev
```

### 7.2 Environment Variables

**frontend/.env.local**
```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
AGNO_API_URL=http://localhost:8000
```

**backend/.env**
```env
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://postgres:postgres@localhost:54322/postgres
OPENAI_API_KEY=sk-xxx
DEFAULT_MODEL=gpt-4o-mini
CORS_ORIGINS=http://localhost:3000
```

---

## 8. Next Steps

After completing the MVP:

1. **Add authentication to AgentOS** - Implement JWT validation middleware
2. **Add rate limiting** - Use AgentOS middleware pattern
3. **Implement billing** - Integrate Stripe + Autumn
4. **Add tracing dashboard** - Visualize AgentOS traces
5. **Deploy** - Vercel (frontend), Railway (backend), Supabase (prod)

---

## References

- [Agno Documentation](https://docs.agno.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com/)
