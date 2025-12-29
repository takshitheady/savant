-- Enable pgmq extension for background job processing
CREATE EXTENSION IF NOT EXISTS pgmq;

-- Create queue for document processing
SELECT pgmq.create('document_processing');

-- Update documents table with processing metadata
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS processing_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0;

-- Update document_chunks table to add helpful metadata
ALTER TABLE public.document_chunks
ADD COLUMN IF NOT EXISTS chunk_index INTEGER,
ADD COLUMN IF NOT EXISTS token_count INTEGER,
ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE;

-- Create index on document_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);

-- Function to send document to processing queue (called from client)
CREATE OR REPLACE FUNCTION public.queue_document_for_processing(
  p_document_id UUID,
  p_account_id UUID,
  p_savant_id UUID,
  p_storage_path TEXT,
  p_mime_type TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq
AS $$
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
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.queue_document_for_processing TO authenticated;
