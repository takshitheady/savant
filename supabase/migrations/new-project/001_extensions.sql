-- ============================================================================
-- Migration: 001_extensions.sql
-- Description: Enable all required PostgreSQL extensions
-- ============================================================================

-- Note: Supabase projects typically have 'extensions', 'vault', and 'graphql' schemas pre-created.
-- If you get schema errors, the extension will create its own schema automatically.

-- Core extensions for UUID and cryptography
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- Vector extension for embeddings and similarity search
CREATE EXTENSION IF NOT EXISTS "vector" WITH SCHEMA extensions;

-- PostgreSQL statistics extension
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA extensions;

-- Supabase Vault for secrets management
-- (Usually pre-installed in Supabase projects)
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA vault;

-- GraphQL support
-- (Usually pre-installed in Supabase projects)
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA graphql;

-- Message queue extension (PGMQ)
-- Let PGMQ create its own schema automatically
CREATE EXTENSION IF NOT EXISTS "pgmq";

-- ============================================================================
-- Verification: Check that all extensions are installed
-- ============================================================================
-- Run this query to verify:
-- SELECT extname, extversion, nspname FROM pg_extension
-- JOIN pg_namespace ON pg_extension.extnamespace = pg_namespace.oid
-- WHERE extname IN ('pgcrypto', 'uuid-ossp', 'vector', 'pg_stat_statements', 'supabase_vault', 'pg_graphql', 'pgmq');
