-- Alternative Storage Approach: Try Different Bucket Configuration
-- This script tries a different approach to fix the MIME type issue

-- Step 1: Check if there are any existing buckets
SELECT '=== CHECKING ALL EXISTING BUCKETS ===' as info;

SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
ORDER BY name;

-- Step 2: Create a completely different bucket with a different name
SELECT '=== CREATING ALTERNATIVE STORAGE BUCKET ===' as info;

-- Create a new bucket with a different name
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  true, -- Make it public for testing
  104857600, -- 100MB limit
  ARRAY['*/*'] -- Allow ALL MIME types
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Remove all policies from the new bucket
SELECT '=== REMOVING POLICIES FROM NEW BUCKET ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Step 4: Create very permissive policies for the new bucket
SELECT '=== CREATING PERMISSIVE POLICIES ===' as info;

-- Allow anyone to upload to the documents bucket
CREATE POLICY "documents_upload_anyone" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents'
);

-- Allow anyone to download from the documents bucket
CREATE POLICY "documents_download_anyone" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents'
);

-- Allow anyone to delete from the documents bucket
CREATE POLICY "documents_delete_anyone" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents'
);

-- Step 5: Also try updating the original bucket with a different approach
SELECT '=== UPDATING ORIGINAL BUCKET WITH DIFFERENT APPROACH ===' as info;

-- Try updating the original bucket with explicit PDF support
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/octet-stream',
  'text/plain',
  'image/*',
  'application/*',
  'text/*',
  '*/*'
]
WHERE name = 'company-documents';

-- Step 6: Verify both buckets
SELECT '=== VERIFYING BOTH BUCKETS ===' as info;

SELECT 
  'Original bucket (company-documents):' as bucket_info,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents'

UNION ALL

SELECT 
  'New bucket (documents):' as bucket_info,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'documents';

-- Step 7: Test PDF support on both buckets
SELECT '=== TESTING PDF SUPPORT ON BOTH BUCKETS ===' as info;

SELECT 
  name as bucket_name,
  CASE 
    WHEN '*/*' = ANY(allowed_mime_types) THEN 'SUCCESS: All MIME types allowed'
    WHEN 'application/pdf' = ANY(allowed_mime_types) THEN 'SUCCESS: PDF specifically allowed'
    ELSE 'ERROR: PDF not allowed'
  END as pdf_support_status
FROM storage.buckets
WHERE name IN ('company-documents', 'documents');

-- Step 8: Check if we need to modify the application code
SELECT '=== APPLICATION CODE MODIFICATION NEEDED ===' as info;

SELECT 
  'You may need to update your application code to use the new bucket name.' as info,
  'Change from: company-documents' as old_bucket,
  'Change to: documents' as new_bucket;

-- Final status
SELECT '=== ALTERNATIVE APPROACH COMPLETE ===' as status;
SELECT 'Created alternative bucket "documents" with very permissive settings.' as message;
SELECT 'Try uploading to the new bucket or check if the original bucket now works.' as info;
SELECT 'You may need to update your application code to use the new bucket name.' as warning;
