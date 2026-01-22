-- ============================================================================
-- Migration: 006_storage_setup.sql
-- Description: Configure storage buckets and policies
-- ============================================================================

-- ============================================================================
-- CREATE STORAGE BUCKET
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,  -- Private bucket
  NULL,   -- No size limit
  NULL    -- All MIME types allowed
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES FOR DOCUMENTS BUCKET
-- ============================================================================

-- Policy: Authenticated users can upload to documents bucket
CREATE POLICY "Authenticated users can upload to documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Policy: Authenticated users can read from documents bucket
CREATE POLICY "Authenticated users can read from documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- Policy: Authenticated users can delete from documents bucket
CREATE POLICY "Authenticated users can delete from documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents');

-- ============================================================================
-- OPTIONAL: More restrictive policies (commented out)
-- ============================================================================
-- If you want more restrictive policies based on account membership,
-- uncomment and modify these policies:

/*
-- Only allow users to access files in their account folders
CREATE POLICY "Users can upload to their account folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT account_id::text FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can read from their account folder"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT account_id::text FROM account_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from their account folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents'
    AND (storage.foldername(name))[1] IN (
      SELECT account_id::text FROM account_members WHERE user_id = auth.uid()
    )
  );
*/

-- ============================================================================
-- Verification: Check bucket and policies were created
-- ============================================================================
-- Run these queries to verify:
-- SELECT * FROM storage.buckets WHERE id = 'documents';
--
-- SELECT policyname, cmd FROM pg_policies
-- WHERE schemaname = 'storage' AND tablename = 'objects'
-- ORDER BY policyname;
