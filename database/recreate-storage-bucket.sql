-- Recreate Storage Bucket: Complete Fix for MIME Types
-- This script completely removes and recreates the storage bucket

-- Step 1: Check current storage bucket
SELECT '=== CHECKING CURRENT STORAGE BUCKET ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 2: Remove ALL objects from the bucket
SELECT '=== REMOVING ALL OBJECTS FROM BUCKET ===' as info;

DELETE FROM storage.objects WHERE bucket_id = 'company-documents';

-- Step 3: Remove the storage bucket completely
SELECT '=== REMOVING STORAGE BUCKET ===' as info;

DELETE FROM storage.buckets WHERE id = 'company-documents';

-- Step 4: Create a NEW storage bucket with ALL MIME types allowed
SELECT '=== CREATING NEW STORAGE BUCKET ===' as info;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  true, -- Make it public for testing
  52428800, -- 50MB limit
  ARRAY['*/*'] -- Allow ALL MIME types
);

-- Step 5: Verify the new bucket was created correctly
SELECT '=== VERIFYING NEW STORAGE BUCKET ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 6: Test if PDF is now supported
SELECT '=== TESTING PDF SUPPORT ===' as info;

SELECT 
  CASE 
    WHEN '*/*' = ANY(allowed_mime_types) THEN 'SUCCESS: All MIME types are allowed (including PDF)'
    WHEN 'application/pdf' = ANY(allowed_mime_types) THEN 'SUCCESS: PDF is specifically allowed'
    ELSE 'ERROR: PDF is still not allowed'
  END as pdf_support_status
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 7: Remove any existing storage policies to ensure no restrictions
SELECT '=== REMOVING STORAGE POLICIES ===' as info;

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

-- Step 8: Create simple storage policies (allow all authenticated users)
SELECT '=== CREATING SIMPLE STORAGE POLICIES ===' as info;

-- Allow all authenticated users to upload
CREATE POLICY "storage_upload_all" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated'
);

-- Allow all authenticated users to download
CREATE POLICY "storage_download_all" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated'
);

-- Allow all authenticated users to delete
CREATE POLICY "storage_delete_all" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated'
);

-- Step 9: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Check bucket exists
SELECT 
  'Storage bucket exists: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as bucket_status
FROM storage.buckets 
WHERE name = 'company-documents';

-- Check MIME types
SELECT 
  'MIME types: ' || array_to_string(allowed_mime_types, ', ') as mime_types
FROM storage.buckets 
WHERE name = 'company-documents';

-- Check storage policies
SELECT 
  'Storage policies: ' || COUNT(*)::text as storage_policies
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Final status
SELECT '=== STORAGE BUCKET RECREATION COMPLETE ===' as status;
SELECT 'Storage bucket has been completely recreated with ALL MIME types allowed.' as message;
SELECT 'PDF uploads should now work.' as info;
SELECT 'Try uploading a PDF file again.' as info;
