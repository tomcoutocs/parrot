-- Diagnose Upload Issue
-- This script checks the current state to understand why uploads are still failing

-- Step 1: Check RLS status on all tables
SELECT '=== RLS STATUS ON ALL TABLES ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('document_folders', 'documents', 'companies', 'users', 'internal_user_companies')
ORDER BY tablename;

-- Step 2: Check all existing policies
SELECT '=== ALL EXISTING POLICIES ===' as info;

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
WHERE tablename IN ('document_folders', 'documents', 'companies', 'users', 'internal_user_companies', 'objects')
ORDER BY tablename, policyname;

-- Step 3: Check storage bucket
SELECT '=== STORAGE BUCKET STATUS ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 4: Check storage policies specifically
SELECT '=== STORAGE POLICIES ===' as info;

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Step 5: Check if tables exist and have data
SELECT '=== TABLE DATA CHECK ===' as info;

SELECT 
  'Companies: ' || COUNT(*)::text as companies_count
FROM companies;

SELECT 
  'Users: ' || COUNT(*)::text as users_count
FROM users;

SELECT 
  'Documents: ' || COUNT(*)::text as documents_count
FROM documents;

SELECT 
  'Document folders: ' || COUNT(*)::text as folders_count
FROM document_folders;

-- Step 6: Check current user context
SELECT '=== CURRENT USER CONTEXT ===' as info;

SELECT 
  current_user,
  session_user,
  current_setting('role'),
  current_setting('app.current_user_id'),
  current_setting('app.current_user_role'),
  current_setting('app.current_company_id');

-- Step 7: Test a simple insert to documents table
SELECT '=== TESTING DOCUMENTS INSERT ===' as info;

DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
  insert_result TEXT;
BEGIN
  -- Get test company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get test user ID
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO documents (name, file_path, file_size, file_type, company_id, uploaded_by)
      VALUES ('test.txt', 'test/path.txt', 100, 'text/plain', test_company_id, test_user_id);
      
      RAISE NOTICE 'SUCCESS: Documents insert worked';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Documents insert failed - %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ERROR: No test company or user found';
  END IF;
END $$;

-- Step 8: Test storage bucket access
SELECT '=== TESTING STORAGE ACCESS ===' as info;

-- Check if we can see the storage bucket
SELECT 
  'Can access storage bucket: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as access_status
FROM storage.buckets 
WHERE name = 'company-documents';

-- Final diagnosis
SELECT '=== DIAGNOSIS COMPLETE ===' as status;
SELECT 'Check the output above to identify the specific issue.' as message;
