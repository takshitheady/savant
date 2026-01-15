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

## 6. Phase 6: Brand Voice System

### 6.1 Install Additional Dependencies

**Backend:**
```bash
cd backend
pip install httpx firecrawl-py openai
pip freeze > requirements.txt
```

**Frontend:**
```bash
cd frontend
# Already included (uses existing dependencies)
```

### 6.2 Setup API Keys

Add to **backend/.env**:
```env
OPENROUTER_API_KEY=sk-or-xxx    # Required for brand voice generation
FIRECRAWL_API_KEY=fc-xxx        # Optional for website analysis
```

Get API keys:
- **OpenRouter**: https://openrouter.ai/keys
- **Firecrawl**: https://firecrawl.dev (500 free credits/month)

### 6.3 Brand Voice Types

Create **frontend/src/types/brand-voice.ts**:

```typescript
export const PERSONALITY_TRAITS = [
  { id: 'cheerful', label: 'Cheerful', description: 'Upbeat and positive tone' },
  { id: 'agreeable', label: 'Agreeable', description: 'Accommodating and supportive' },
  { id: 'social', label: 'Social', description: 'Conversational and engaging' },
  { id: 'gen_z', label: 'Gen Z Style', description: 'Casual, trendy language' },
  { id: 'funny', label: 'Funny', description: 'Uses humor and wit' },
  { id: 'realistic', label: 'Realistic', description: 'Honest and practical' },
  { id: 'formal', label: 'Formal', description: 'Professional and polished' },
  { id: 'empathetic', label: 'Empathetic', description: 'Understanding and caring' },
  { id: 'concise', label: 'Concise', description: 'Brief and to-the-point' },
  { id: 'detailed', label: 'Detailed', description: 'Thorough explanations' },
] as const

export type PersonalityTraitId = typeof PERSONALITY_TRAITS[number]['id']

// Business categories
export const BUSINESS_CATEGORIES = [
  'Technology/SaaS',
  'E-commerce/Retail',
  'Healthcare',
  'Finance',
  'Food & Beverage',
  'Professional Services',
  'Education',
  'Entertainment',
  'Other',
] as const

// Advanced mode interfaces
export interface BusinessInfo {
  businessName?: string
  websiteUrl?: string
  businessDescription?: string
  primaryCategory?: BusinessCategory
  locations?: string
  idealCustomer?: string
}

export interface BrandIdentity {
  brandPillars?: string[]
  voiceDescription?: string
  differentiators?: string
  pastCampaigns?: string
  messagingRestrictions?: string
}

export interface VoiceDimensionValues {
  casualVsFormal?: 'a' | 'b' | 'neither'
  playfulVsSerious?: 'a' | 'b' | 'neither'
  polishedVsGritty?: 'a' | 'b' | 'neither'
  warmVsCool?: 'a' | 'b' | 'neither'
  classicVsTrendy?: 'a' | 'b' | 'neither'
  expertVsInsider?: 'a' | 'b' | 'neither'
  laidbackVsBold?: 'a' | 'b' | 'neither'
  dimensionNotes?: Record<string, string>
}

export interface WebsiteAnalysis {
  title?: string
  description?: string
  content?: string
  analyzedAt?: string
  error?: string
}

export interface BrandVoiceAdvanced {
  businessInfo?: BusinessInfo
  brandIdentity?: BrandIdentity
  voiceDimensions?: VoiceDimensionValues
  websiteAnalysis?: WebsiteAnalysis
}

export interface BrandVoiceTraits {
  selectedTraits: PersonalityTraitId[]
  customNotes?: string
  advanced?: BrandVoiceAdvanced
}

export interface BrandVoice {
  id: string
  account_id: string
  name: string
  prompt: string
  brand_voice_traits: BrandVoiceTraits | null
  is_brand_voice: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}
```

### 6.4 Brand Voice API Routes

Create **backend/app/routes/brand_voice.py**:

```python
"""
Brand Voice Generation API
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict
import os
import httpx
from openai import OpenAI

router = APIRouter()

TRAIT_DESCRIPTIONS = {
    'cheerful': 'maintains an upbeat, positive, and enthusiastic tone',
    'agreeable': 'is accommodating, supportive, and validates user perspectives',
    'social': 'is conversational, engaging, and builds rapport',
    'gen_z': 'uses casual, trendy language with modern expressions',
    'funny': 'incorporates appropriate humor and wit',
    'realistic': 'is honest, practical, and sets clear expectations',
    'formal': 'maintains professional, polished communication',
    'empathetic': 'shows understanding and emotional awareness',
    'concise': 'keeps responses brief and to-the-point',
    'detailed': 'provides thorough, comprehensive explanations',
}

class GenerateBrandVoiceRequest(BaseModel):
    traits: List[str]
    advanced_data: Optional[Dict] = None

class AnalyzeWebsiteRequest(BaseModel):
    url: str

@router.post("/generate-brand-voice")
async def generate_brand_voice(request: GenerateBrandVoiceRequest):
    """Generate a brand voice system prompt from traits"""

    # Build trait descriptions
    trait_texts = [TRAIT_DESCRIPTIONS[trait] for trait in request.traits
                   if trait in TRAIT_DESCRIPTIONS]

    if not trait_texts:
        return {"prompt": ""}

    # Get API key
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENROUTER_API_KEY not configured")

    # Call Claude via OpenRouter
    client = OpenAI(
        api_key=api_key,
        base_url="https://openrouter.ai/api/v1"
    )

    generation_prompt = f"""Create a concise system prompt instruction (2-3 paragraphs) that defines a brand voice with these characteristics:

{chr(10).join(f'- {text}' for text in trait_texts)}

The prompt should:
1. Be written as instructions for an AI assistant
2. Be natural and not sound like a list
3. Include specific guidance on tone, language style, and approach
4. Be practical and actionable

Output ONLY the system prompt text, no explanations or meta-commentary."""

    response = client.chat.completions.create(
        model="anthropic/claude-haiku-4.5",
        messages=[{"role": "user", "content": generation_prompt}],
        temperature=0.7,
        max_tokens=500
    )

    return {"prompt": response.choices[0].message.content.strip()}

@router.post("/analyze-website")
async def analyze_website(request: AnalyzeWebsiteRequest):
    """Analyze website content using Firecrawl API"""

    firecrawl_key = os.getenv("FIRECRAWL_API_KEY")
    if not firecrawl_key:
        raise HTTPException(status_code=500, detail="Website analysis not configured")

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.firecrawl.dev/v1/scrape",
                headers={
                    "Authorization": f"Bearer {firecrawl_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "url": request.url,
                    "formats": ["markdown"],
                    "onlyMainContent": True
                }
            )

            if response.status_code == 402:
                return {
                    "success": False,
                    "error": "credits_exhausted",
                    "message": "Firecrawl credits exhausted. Website analysis is optional - skip this step to continue."
                }

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": "api_error",
                    "message": f"Failed to analyze website"
                }

            data = response.json()
            metadata = data.get("data", {}).get("metadata", {})

            return {
                "success": True,
                "title": metadata.get("title", ""),
                "description": metadata.get("description", ""),
            }

    except httpx.TimeoutException:
        return {
            "success": False,
            "error": "timeout",
            "message": "Website took too long to respond"
        }
    except Exception as e:
        return {
            "success": False,
            "error": "unknown",
            "message": "Failed to analyze website"
        }
```

Register the router in **backend/app/main.py**:

```python
from app.routes import brand_voice

app.include_router(brand_voice.router, prefix="/api")
```

### 6.5 Server Actions

Create **frontend/src/actions/brand-voice.ts**:

```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { BrandVoiceTraits, PersonalityTraitId, BrandVoice, BrandVoiceAdvanced } from '@/types/brand-voice'

export async function getBrandVoice(): Promise<{
  success: boolean
  data?: BrandVoice | null
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminSupabase = createAdminClient()

    const { data: accountMember } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!accountMember) {
      return { success: false, error: 'No account found' }
    }

    const { data, error } = await adminSupabase
      .from('account_prompts')
      .select('*')
      .eq('account_id', accountMember.account_id)
      .eq('is_brand_voice', true)
      .single()

    if (error && error.code !== 'PGRST116') {
      return { success: false, error: error.message }
    }

    return { success: true, data: data as BrandVoice | null }
  } catch (error) {
    return { success: false, error: 'Failed to get brand voice' }
  }
}

export async function generateBrandVoicePrompt(
  traits: PersonalityTraitId[],
  advancedData?: BrandVoiceAdvanced
): Promise<{ success: boolean; prompt?: string; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const backendUrl = process.env.AGNO_API_URL || 'http://localhost:8000'
    const fullUrl = `${backendUrl}/api/generate-brand-voice`

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        traits,
        advanced_data: advancedData
      })
    })

    if (!response.ok) {
      return { success: false, error: `Backend error: ${response.status}` }
    }

    const data = await response.json()
    return { success: true, prompt: data.prompt }
  } catch (error) {
    return { success: false, error: 'Network error' }
  }
}

export async function analyzeWebsite(url: string): Promise<{
  success: boolean
  title?: string
  description?: string
  error?: string
}> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const backendUrl = process.env.AGNO_API_URL || 'http://localhost:8000'
    const fullUrl = `${backendUrl}/api/analyze-website`

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })

    if (!response.ok) {
      return { success: false, error: 'Failed to analyze website' }
    }

    const data = await response.json()
    return {
      success: data.success !== false,
      title: data.title,
      description: data.description,
      error: data.error
    }
  } catch (error) {
    return { success: false, error: 'Failed to analyze website' }
  }
}

export async function saveBrandVoice(
  traits: BrandVoiceTraits,
  prompt: string,
  isActive: boolean = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: 'Not authenticated' }
    }

    const adminSupabase = createAdminClient()

    const { data: accountMember } = await adminSupabase
      .from('account_members')
      .select('account_id')
      .eq('user_id', user.id)
      .single()

    if (!accountMember) {
      return { success: false, error: 'No account found' }
    }

    // Check if brand voice exists
    const { data: existing } = await adminSupabase
      .from('account_prompts')
      .select('id')
      .eq('account_id', accountMember.account_id)
      .eq('is_brand_voice', true)
      .single()

    if (existing) {
      // Update existing
      const { error } = await adminSupabase
        .from('account_prompts')
        .update({
          name: 'Brand Voice',
          prompt: prompt,
          brand_voice_traits: traits,
          is_active: isActive,
          applies_to_all: true,
          priority: 100,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)

      if (error) {
        return { success: false, error: error.message }
      }
    } else {
      // Insert new
      const { error } = await adminSupabase
        .from('account_prompts')
        .insert({
          account_id: accountMember.account_id,
          name: 'Brand Voice',
          prompt: prompt,
          brand_voice_traits: traits,
          is_brand_voice: true,
          is_active: isActive,
          applies_to_all: true,
          priority: 100,
        })

      if (error) {
        return { success: false, error: error.message }
      }
    }

    revalidatePath('/prompts')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to save brand voice' }
  }
}
```

### 6.6 UI Components

**Main Form:** `frontend/src/components/brand-voice/brand-voice-form.tsx`
- Trait selector with chips
- Advanced section (expandable)
- Generate button with loading state
- Generated prompt textarea
- Save functionality

**Advanced Section:** `frontend/src/components/brand-voice/advanced-section.tsx`
- Three expandable subsections:
  - Business Information (with website analysis)
  - Brand Identity
  - Voice Dimensions

**Website Analysis:** `frontend/src/components/brand-voice/business-info-form.tsx`
- URL input with "Analyze" button
- Auto-fill fields on successful analysis
- Error handling for Firecrawl failures

### 6.7 Database Migration

Add brand voice fields to `account_prompts` table:

```sql
-- Run this migration in Supabase SQL Editor or via migration file

ALTER TABLE public.account_prompts
ADD COLUMN IF NOT EXISTS is_brand_voice BOOLEAN DEFAULT FALSE;

ALTER TABLE public.account_prompts
ADD COLUMN IF NOT EXISTS brand_voice_traits JSONB;

-- Create index for brand voice lookups
CREATE INDEX IF NOT EXISTS idx_account_prompts_brand_voice
ON public.account_prompts (account_id, is_brand_voice);
```

### 6.8 Testing Brand Voice

**Manual Testing Flow:**

1. Navigate to `/prompts`
2. Select 2-3 personality traits (e.g., Cheerful, Empathetic)
3. (Optional) Click "Advanced Options"
4. (Optional) Enter website URL: `https://example.com`
5. (Optional) Click "Analyze" button
6. Verify fields auto-fill (business name, description, etc.)
7. Click "Generate Brand Voice"
8. Wait 3-5 seconds for AI generation
9. Verify prompt appears in textarea
10. Review generated prompt - should reflect selected traits
11. Click "Save Brand Voice"
12. Verify success message
13. Reload page - verify data persists
14. Create a new Savant
15. Start chat - verify brand voice is applied

**API Testing:**

Test backend endpoints directly:

```bash
# Test generation
curl -X POST http://localhost:8000/api/generate-brand-voice \
  -H "Content-Type: application/json" \
  -d '{"traits": ["cheerful", "empathetic"]}'

# Test website analysis
curl -X POST http://localhost:8000/api/analyze-website \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

## 7. Next Steps

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
