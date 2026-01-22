-- ============================================================================
-- Migration: 002_tables_and_indexes.sql
-- Description: Create all database tables with indexes and constraints
-- ============================================================================

-- ============================================================================
-- TABLE: accounts
-- Description: Multi-tenant account management
-- ============================================================================
CREATE TABLE public.accounts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES auth.users(id),
    default_system_prompt TEXT,
    settings JSONB DEFAULT '{}'::jsonb,
    plan TEXT DEFAULT 'free'::text CHECK (plan = ANY (ARRAY['free'::text, 'pro'::text, 'enterprise'::text])),
    stripe_customer_id TEXT,
    autumn_customer_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: account_members
-- Description: User-account relationships with roles
-- ============================================================================
CREATE TABLE public.account_members (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role TEXT NOT NULL DEFAULT 'member'::text CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'member'::text, 'viewer'::text])),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(account_id, user_id)
);

-- ============================================================================
-- TABLE: savants
-- Description: AI agent configurations
-- ============================================================================
CREATE TABLE public.savants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    avatar_url TEXT,
    system_prompt TEXT,
    model_config JSONB DEFAULT '{"model": "gpt-4o-mini", "provider": "openai", "max_tokens": 4096, "temperature": 0.7}'::jsonb,
    rag_config JSONB DEFAULT '{"enabled": true, "chunk_size": 1000, "match_count": 5, "chunk_overlap": 200, "match_threshold": 0.7}'::jsonb,
    is_active BOOLEAN DEFAULT true,
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    cloned_from_id UUID REFERENCES public.savants(id),
    original_creator_account_id UUID REFERENCES public.accounts(id),
    UNIQUE(account_id, slug)
);

COMMENT ON COLUMN public.savants.cloned_from_id IS 'Reference to original savant if imported from store';
COMMENT ON COLUMN public.savants.original_creator_account_id IS 'Original creator account for attribution';

-- ============================================================================
-- TABLE: documents
-- Description: Document storage metadata
-- ============================================================================
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    savant_id UUID NOT NULL REFERENCES public.savants(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    status TEXT DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'processing'::text, 'completed'::text, 'failed'::text])),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    chunk_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    processing_started_at TIMESTAMPTZ,
    processing_completed_at TIMESTAMPTZ,
    processing_error TEXT
);

-- ============================================================================
-- TABLE: document_chunks
-- Description: RAG vector embeddings
-- ============================================================================
CREATE TABLE public.document_chunks (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES public.documents(id),
    savant_id UUID NOT NULL REFERENCES public.savants(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    content TEXT NOT NULL,
    chunk_index INTEGER NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    token_count INTEGER
);

-- ============================================================================
-- TABLE: conversations
-- Description: Chat history
-- ============================================================================
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    savant_id UUID NOT NULL REFERENCES public.savants(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    user_id UUID REFERENCES auth.users(id),
    session_id TEXT,
    title TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: messages
-- Description: Individual chat messages
-- ============================================================================
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id),
    savant_id UUID NOT NULL REFERENCES public.savants(id),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    role TEXT NOT NULL CHECK (role = ANY (ARRAY['user'::text, 'assistant'::text, 'system'::text])),
    content TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0,
    context_chunks JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: account_prompts
-- Description: Custom prompts with brand voice support
-- ============================================================================
CREATE TABLE public.account_prompts (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    name TEXT NOT NULL,
    prompt TEXT NOT NULL,
    priority INTEGER DEFAULT 0,
    applies_to_all BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    brand_voice_traits JSONB,
    is_brand_voice BOOLEAN DEFAULT false
);

-- ============================================================================
-- TABLE: savant_prompt_links
-- Description: Links savants to prompts
-- ============================================================================
CREATE TABLE public.savant_prompt_links (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    savant_id UUID NOT NULL REFERENCES public.savants(id),
    prompt_id UUID NOT NULL REFERENCES public.account_prompts(id),
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(savant_id, prompt_id)
);

-- ============================================================================
-- TABLE: api_keys
-- Description: API key management
-- ============================================================================
CREATE TABLE public.api_keys (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL UNIQUE,
    key_prefix TEXT NOT NULL,
    scopes TEXT[] DEFAULT ARRAY['chat'::text],
    rate_limit INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: usage_records
-- Description: Usage tracking
-- ============================================================================
CREATE TABLE public.usage_records (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id),
    savant_id UUID REFERENCES public.savants(id),
    usage_type TEXT NOT NULL CHECK (usage_type = ANY (ARRAY['chat'::text, 'embedding'::text, 'storage'::text])),
    tokens_input INTEGER DEFAULT 0,
    tokens_output INTEGER DEFAULT 0,
    storage_bytes BIGINT DEFAULT 0,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: agent_sessions
-- Description: Agno agent session storage
-- ============================================================================
CREATE TABLE public.agent_sessions (
    session_id TEXT PRIMARY KEY,
    agent_id TEXT,
    user_id TEXT,
    memory JSONB DEFAULT '{}'::jsonb,
    agent_data JSONB DEFAULT '{}'::jsonb,
    user_data JSONB DEFAULT '{}'::jsonb,
    session_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE public.agent_sessions IS 'Stores Agno agent session data for conversation memory and user personalization';

-- ============================================================================
-- TABLE: store_categories
-- Description: Marketplace categories
-- ============================================================================
CREATE TABLE public.store_categories (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    icon TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: store_listings
-- Description: Public savant marketplace
-- ============================================================================
CREATE TABLE public.store_listings (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    savant_id UUID NOT NULL UNIQUE REFERENCES public.savants(id),
    category_id UUID NOT NULL REFERENCES public.store_categories(id),
    tagline TEXT,
    long_description TEXT,
    tags TEXT[] DEFAULT '{}'::text[],
    preview_messages JSONB DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT false,
    featured_until TIMESTAMPTZ,
    import_count INTEGER DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 0,
    published_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- TABLE: store_reviews
-- Description: User reviews
-- ============================================================================
CREATE TABLE public.store_reviews (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    listing_id UUID NOT NULL REFERENCES public.store_listings(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    content TEXT,
    is_verified_import BOOLEAN DEFAULT false,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(listing_id, user_id)
);

-- ============================================================================
-- TABLE: store_imports
-- Description: Import tracking
-- ============================================================================
CREATE TABLE public.store_imports (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    source_savant_id UUID NOT NULL REFERENCES public.savants(id),
    source_listing_id UUID REFERENCES public.store_listings(id),
    cloned_savant_id UUID NOT NULL REFERENCES public.savants(id),
    imported_by_account_id UUID NOT NULL REFERENCES public.accounts(id),
    imported_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    import_timestamp TIMESTAMPTZ DEFAULT now(),
    UNIQUE(source_savant_id, cloned_savant_id)
);

-- ============================================================================
-- TABLE: creator_profiles
-- Description: Creator profiles
-- ============================================================================
CREATE TABLE public.creator_profiles (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    account_id UUID NOT NULL UNIQUE REFERENCES public.accounts(id),
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    website_url TEXT,
    twitter_handle TEXT,
    total_savants_published INTEGER DEFAULT 0,
    total_imports INTEGER DEFAULT 0,
    average_rating NUMERIC DEFAULT 0,
    notifications_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- account_prompts indexes
CREATE UNIQUE INDEX account_prompts_one_brand_voice_per_account
ON public.account_prompts (account_id)
WHERE (is_brand_voice = true);

-- agent_sessions indexes
CREATE INDEX idx_agent_sessions_agent ON public.agent_sessions (agent_id);
CREATE INDEX idx_agent_sessions_user ON public.agent_sessions (user_id);
CREATE INDEX idx_agent_sessions_created ON public.agent_sessions (created_at DESC);

-- document_chunks indexes
CREATE INDEX document_chunks_embedding_idx
ON public.document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_chunks_savant ON public.document_chunks (savant_id);
CREATE INDEX idx_document_chunks_document_id ON public.document_chunks (document_id);

-- creator_profiles indexes
CREATE INDEX idx_creator_profiles_imports ON public.creator_profiles (total_imports DESC);

-- store_listings indexes
CREATE INDEX idx_store_listings_category ON public.store_listings (category_id);
CREATE INDEX idx_store_listings_featured ON public.store_listings (is_featured) WHERE (is_featured = true);
CREATE INDEX idx_store_listings_imports ON public.store_listings (import_count DESC);
CREATE INDEX idx_store_listings_published ON public.store_listings (published_at DESC);
CREATE INDEX idx_store_listings_rating ON public.store_listings (average_rating DESC);
CREATE INDEX idx_store_listings_tags ON public.store_listings USING gin (tags);

-- store_reviews indexes
CREATE INDEX idx_store_reviews_listing ON public.store_reviews (listing_id);
CREATE INDEX idx_store_reviews_rating ON public.store_reviews (rating);
CREATE INDEX idx_store_reviews_user ON public.store_reviews (user_id);

-- store_imports indexes
CREATE INDEX idx_store_imports_account ON public.store_imports (imported_by_account_id);
CREATE INDEX idx_store_imports_source ON public.store_imports (source_savant_id);
CREATE INDEX idx_store_imports_timestamp ON public.store_imports (import_timestamp DESC);

-- ============================================================================
-- Verification: Check all tables were created
-- ============================================================================
-- Run this query to verify:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
