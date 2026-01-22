-- ============================================================================
-- Migration: 003_functions.sql
-- Description: Create all custom database functions
-- ============================================================================

-- ============================================================================
-- FUNCTION: is_account_member
-- Description: Check if current user is a member of the specified account
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_account_member(check_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_id = check_account_id
    AND user_id = auth.uid()
  )
$function$;

-- ============================================================================
-- FUNCTION: get_user_account_ids
-- Description: Get all account IDs that the current user is a member of
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_user_account_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
AS $function$
  SELECT account_id FROM public.account_members
  WHERE user_id = auth.uid()
$function$;

-- ============================================================================
-- FUNCTION: handle_new_user
-- Description: Trigger function to create account and membership for new users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_account_id UUID;
BEGIN
  -- Create account for new user
  INSERT INTO public.accounts (name, slug, owner_id, default_system_prompt)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    LOWER(REGEXP_REPLACE(
      COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
      '[^a-zA-Z0-9]+',
      '-',
      'g'
    )) || '-' || SUBSTRING(NEW.id::TEXT FROM 1 FOR 8),
    NEW.id,
    'You are a helpful AI assistant. Be concise and accurate.'
  )
  RETURNING id INTO new_account_id;

  -- Add user as owner of the account
  INSERT INTO public.account_members (account_id, user_id, role)
  VALUES (new_account_id, NEW.id, 'owner');

  RETURN NEW;
END;
$function$;

-- ============================================================================
-- FUNCTION: update_updated_at
-- Description: Trigger function to auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- FUNCTION: match_chunks
-- Description: Vector similarity search for RAG
-- ============================================================================
CREATE OR REPLACE FUNCTION public.match_chunks(
  query_embedding vector,
  p_savant_id uuid,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 5
)
RETURNS TABLE(
  id uuid,
  content text,
  document_id uuid,
  similarity double precision,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;

-- ============================================================================
-- FUNCTION: pgmq_send
-- Description: Wrapper function to send messages to PGMQ queue
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pgmq_send(queue_name text, message jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN pgmq.send(queue_name, message);
END;
$function$;

-- ============================================================================
-- FUNCTION: pgmq_read
-- Description: Wrapper function to read messages from PGMQ queue
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pgmq_read(queue_name text, vt integer, qty integer)
RETURNS SETOF pgmq.message_record
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY SELECT * FROM pgmq.read(queue_name, vt, qty);
END;
$function$;

-- ============================================================================
-- FUNCTION: pgmq_delete
-- Description: Wrapper function to delete messages from PGMQ queue
-- ============================================================================
CREATE OR REPLACE FUNCTION public.pgmq_delete(queue_name text, msg_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    RETURN pgmq.delete(queue_name, msg_id);
END;
$function$;

-- ============================================================================
-- FUNCTION: queue_document_for_processing
-- Description: Queue documents for background processing (with auth check)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.queue_document_for_processing(
  p_document_id uuid,
  p_account_id uuid,
  p_savant_id uuid,
  p_storage_path text,
  p_mime_type text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pgmq'
AS $function$
DECLARE
  msg_id BIGINT;
BEGIN
  -- Only allow queueing if user has access to this account
  IF NOT EXISTS (
    SELECT 1 FROM public.account_members
    WHERE account_id = p_account_id
    AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Send message to queue
  SELECT pgmq.send(
    'document_processing',
    jsonb_build_object(
      'document_id', p_document_id,
      'account_id', p_account_id,
      'savant_id', p_savant_id,
      'storage_path', p_storage_path,
      'mime_type', p_mime_type
    )
  ) INTO msg_id;

  RETURN msg_id;
END;
$function$;

-- ============================================================================
-- FUNCTION: queue_document_for_processing_admin
-- Description: Queue documents for processing without auth check (for server actions)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.queue_document_for_processing_admin(
  p_document_id uuid,
  p_account_id uuid,
  p_savant_id uuid,
  p_storage_path text,
  p_mime_type text
)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  msg_id BIGINT;
BEGIN
  -- No auth check - caller (server action) is responsible for authorization
  -- Server action verifies user is member of account before calling this

  SELECT pgmq.send(
    'document_processing',
    jsonb_build_object(
      'document_id', p_document_id,
      'account_id', p_account_id,
      'savant_id', p_savant_id,
      'storage_path', p_storage_path,
      'mime_type', p_mime_type
    )
  ) INTO msg_id;

  RETURN msg_id;
END;
$function$;

-- ============================================================================
-- FUNCTION: clone_savant_from_store
-- Description: Clone a public savant from the marketplace
-- ============================================================================
CREATE OR REPLACE FUNCTION public.clone_savant_from_store(
  p_source_savant_id uuid,
  p_target_account_id uuid,
  p_target_user_id uuid,
  p_new_name text DEFAULT NULL::text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_new_savant_id UUID;
  v_source_savant RECORD;
  v_doc RECORD;
  v_new_doc_id UUID;
  v_listing_id UUID;
BEGIN
  -- Get source savant
  SELECT * INTO v_source_savant FROM savants WHERE id = p_source_savant_id AND is_public = true;

  IF v_source_savant IS NULL THEN
    RAISE EXCEPTION 'Source savant not found or not public';
  END IF;

  -- Create new savant (clone)
  INSERT INTO savants (
    account_id,
    name,
    slug,
    description,
    system_prompt,
    model_config,
    rag_config,
    is_public,
    is_active,
    cloned_from_id,
    original_creator_account_id
  ) VALUES (
    p_target_account_id,
    COALESCE(p_new_name, v_source_savant.name || ' (Imported)'),
    v_source_savant.slug || '-' || substring(gen_random_uuid()::text, 1, 8),
    v_source_savant.description,
    v_source_savant.system_prompt,
    v_source_savant.model_config,
    v_source_savant.rag_config,
    false,  -- Cloned savants start as private
    true,   -- is_active
    p_source_savant_id,
    v_source_savant.account_id
  ) RETURNING id INTO v_new_savant_id;

  -- Clone all documents and their chunks
  FOR v_doc IN
    SELECT * FROM documents WHERE savant_id = p_source_savant_id
  LOOP
    -- Create new document
    INSERT INTO documents (
      savant_id,
      account_id,
      name,
      file_path,
      file_type,
      file_size,
      status,
      metadata,
      chunk_count
    ) VALUES (
      v_new_savant_id,
      p_target_account_id,
      v_doc.name,
      v_doc.file_path,  -- Share storage path (same file)
      v_doc.file_type,
      v_doc.file_size,
      v_doc.status,
      v_doc.metadata,
      v_doc.chunk_count
    ) RETURNING id INTO v_new_doc_id;

    -- Clone all chunks for this document
    INSERT INTO document_chunks (
      document_id,
      savant_id,
      account_id,
      chunk_index,
      content,
      embedding,
      metadata,
      token_count
    )
    SELECT
      v_new_doc_id,
      v_new_savant_id,
      p_target_account_id,
      chunk_index,
      content,
      embedding,
      metadata,
      token_count
    FROM document_chunks
    WHERE document_id = v_doc.id;
  END LOOP;

  -- Record the import
  SELECT id INTO v_listing_id FROM store_listings WHERE savant_id = p_source_savant_id;

  INSERT INTO store_imports (
    source_savant_id,
    source_listing_id,
    cloned_savant_id,
    imported_by_account_id,
    imported_by_user_id
  ) VALUES (
    p_source_savant_id,
    v_listing_id,
    v_new_savant_id,
    p_target_account_id,
    p_target_user_id
  );

  -- Update import count on listing
  UPDATE store_listings
  SET import_count = import_count + 1
  WHERE savant_id = p_source_savant_id;

  -- Update creator profile stats
  UPDATE creator_profiles
  SET total_imports = total_imports + 1
  WHERE account_id = v_source_savant.account_id;

  RETURN v_new_savant_id;
END;
$function$;

-- ============================================================================
-- FUNCTION: search_store_listings
-- Description: Search marketplace listings with filters
-- ============================================================================
CREATE OR REPLACE FUNCTION public.search_store_listings(
  p_search_query text DEFAULT NULL::text,
  p_category_slug text DEFAULT NULL::text,
  p_min_rating numeric DEFAULT 0,
  p_limit_count integer DEFAULT 20,
  p_offset_count integer DEFAULT 0
)
RETURNS TABLE(
  id uuid,
  savant_id uuid,
  savant_name text,
  savant_description text,
  tagline text,
  long_description text,
  tags text[],
  category_id uuid,
  category_name text,
  category_slug text,
  import_count integer,
  review_count integer,
  average_rating numeric,
  creator_account_id uuid,
  creator_display_name text,
  published_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    sl.id,
    sl.savant_id,
    s.name::TEXT as savant_name,
    s.description::TEXT as savant_description,
    sl.tagline,
    sl.long_description,
    sl.tags,
    sl.category_id,
    sc.name::TEXT as category_name,
    sc.slug::TEXT as category_slug,
    sl.import_count,
    sl.review_count,
    sl.average_rating,
    s.account_id as creator_account_id,
    COALESCE(cp.display_name, a.name)::TEXT as creator_display_name,
    sl.published_at
  FROM store_listings sl
  JOIN savants s ON sl.savant_id = s.id
  JOIN store_categories sc ON sl.category_id = sc.id
  JOIN accounts a ON s.account_id = a.id
  LEFT JOIN creator_profiles cp ON a.id = cp.account_id
  WHERE
    s.is_public = true
    AND (p_search_query IS NULL OR (
      s.name ILIKE '%' || p_search_query || '%' OR
      s.description ILIKE '%' || p_search_query || '%' OR
      sl.tagline ILIKE '%' || p_search_query || '%' OR
      sl.long_description ILIKE '%' || p_search_query || '%'
    ))
    AND (p_category_slug IS NULL OR sc.slug = p_category_slug)
    AND sl.average_rating >= p_min_rating
  ORDER BY
    sl.is_featured DESC,
    sl.import_count DESC,
    sl.average_rating DESC,
    sl.published_at DESC
  LIMIT p_limit_count
  OFFSET p_offset_count;
END;
$function$;

-- ============================================================================
-- FUNCTION: update_listing_rating_stats
-- Description: Trigger function to update listing and creator rating stats
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_listing_rating_stats()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_listing_id UUID;
  v_avg_rating DECIMAL;
  v_review_count INTEGER;
  v_creator_account_id UUID;
BEGIN
  -- Get the listing ID based on operation
  IF TG_OP = 'DELETE' THEN
    v_listing_id := OLD.listing_id;
  ELSE
    v_listing_id := NEW.listing_id;
  END IF;

  -- Calculate new stats
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*)
  INTO v_avg_rating, v_review_count
  FROM store_reviews
  WHERE listing_id = v_listing_id AND is_visible = true;

  -- Update listing
  UPDATE store_listings
  SET
    average_rating = ROUND(v_avg_rating, 1),
    review_count = v_review_count,
    updated_at = now()
  WHERE id = v_listing_id;

  -- Update creator profile average rating
  SELECT s.account_id INTO v_creator_account_id
  FROM store_listings sl
  JOIN savants s ON sl.savant_id = s.id
  WHERE sl.id = v_listing_id;

  UPDATE creator_profiles cp
  SET average_rating = (
    SELECT ROUND(COALESCE(AVG(sl.average_rating), 0), 1)
    FROM store_listings sl
    JOIN savants s ON sl.savant_id = s.id
    WHERE s.account_id = v_creator_account_id
  )
  WHERE cp.account_id = v_creator_account_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- ============================================================================
-- Verification: Check all functions were created
-- ============================================================================
-- Run this query to verify:
-- SELECT proname, prosrc FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace
-- ORDER BY proname;
