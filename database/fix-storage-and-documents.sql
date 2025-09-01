-- Fix Storage and Documents RLS Issues
-- This script fixes both storage bucket permissions and document table RLS policies

-- Step 1: Check current storage buckets
SELECT '=== CHECKING STORAGE BUCKETS ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 2: Create storage bucket if it doesn't exist
SELECT '=== CREATING STORAGE BUCKET ===' as info;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- Step 3: Check current RLS policies on documents table
SELECT '=== CURRENT DOCUMENTS RLS POLICIES ===' as info;

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'documents'
ORDER BY policyname;

-- Step 4: Drop existing documents policies
SELECT '=== DROPPING EXISTING DOCUMENTS POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
    END LOOP;
END $$;

-- Step 5: Create simple documents policies
SELECT '=== CREATING SIMPLE DOCUMENTS POLICIES ===' as info;

-- Policy for selecting documents (any authenticated user can view documents in their company)
CREATE POLICY "documents_select_policy" ON documents
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Policy for inserting documents (any authenticated user can create documents in their company)
CREATE POLICY "documents_insert_policy" ON documents
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Policy for updating documents (any authenticated user can update documents in their company)
CREATE POLICY "documents_update_policy" ON documents
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Policy for deleting documents (any authenticated user can delete documents in their company)
CREATE POLICY "documents_delete_policy" ON documents
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Step 6: Create storage policies
SELECT '=== CREATING STORAGE POLICIES ===' as info;

-- Policy for uploading files (any authenticated user can upload to their company folder)
CREATE POLICY "storage_upload_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id::text FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Policy for downloading files (any authenticated user can download from their company folder)
CREATE POLICY "storage_download_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id::text FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Policy for deleting files (any authenticated user can delete from their company folder)
CREATE POLICY "storage_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] IN (
    SELECT company_id::text FROM users WHERE id = auth.uid()
    UNION
    SELECT company_id::text FROM internal_user_companies WHERE user_id = auth.uid()
  )
);

-- Step 7: Test the setup
SELECT '=== TESTING SETUP ===' as info;

-- Check if we have users and companies
SELECT 
  'Users count: ' || COUNT(*)::text as users_info
FROM users;

SELECT 
  'Companies count: ' || COUNT(*)::text as companies_info
FROM companies;

-- Check if we have internal user companies
SELECT 
  'Internal user companies count: ' || COUNT(*)::text as internal_user_companies_info
FROM internal_user_companies;

-- Step 8: Create test data if needed
SELECT '=== CREATING TEST DATA IF NEEDED ===' as info;

-- Insert test company if none exists
INSERT INTO companies (id, name, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Company',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Insert test user if none exists
INSERT INTO users (id, email, full_name, role, company_id)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'test@example.com',
  'Test User',
  'user',
  '550e8400-e29b-41d4-a716-446655440000'
)
ON CONFLICT (id) DO NOTHING;

-- Step 9: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Check all policies
SELECT 
  'Documents policies: ' || COUNT(*)::text as documents_policies
FROM pg_policies 
WHERE tablename = 'documents';

SELECT 
  'Storage policies: ' || COUNT(*)::text as storage_policies
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check bucket exists
SELECT 
  'Storage bucket exists: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as bucket_status
FROM storage.buckets 
WHERE name = 'company-documents';

-- Final status
SELECT '=== STORAGE AND DOCUMENTS FIX COMPLETE ===' as status;
SELECT 'File uploads should now work correctly.' as message;
