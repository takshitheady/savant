-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket

-- Allow authenticated users to upload documents to their own savant folders
CREATE POLICY "Users can upload documents to their savants"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid() IN (
    SELECT am.user_id
    FROM public.account_members am
    JOIN public.savants s ON s.account_id = am.account_id
    WHERE (storage.foldername(name))[1] = s.id::text
  )
);

-- Allow authenticated users to read documents from their savants
CREATE POLICY "Users can read documents from their savants"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid() IN (
    SELECT am.user_id
    FROM public.account_members am
    JOIN public.savants s ON s.account_id = am.account_id
    WHERE (storage.foldername(name))[1] = s.id::text
  )
);

-- Allow authenticated users to delete documents from their savants
CREATE POLICY "Users can delete documents from their savants"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid() IN (
    SELECT am.user_id
    FROM public.account_members am
    JOIN public.savants s ON s.account_id = am.account_id
    WHERE (storage.foldername(name))[1] = s.id::text
  )
);
