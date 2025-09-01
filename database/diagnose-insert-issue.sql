-- Diagnose Insert Issue - Find the Real Problem
-- This script helps identify why folder creation is failing

-- Step 1: Check if tables exist and have correct structure
SELECT '=== TABLE STRUCTURE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name IN ('document_folders', 'documents')
ORDER BY table_name, ordinal_position;

-- Step 2: Check if RLS is enabled
SELECT '=== RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'ENABLED' 
    ELSE 'DISABLED' 
  END as status
FROM pg_tables 
WHERE tablename IN ('document_folders', 'documents')
ORDER BY tablename;

-- Step 3: Check existing policies
SELECT '=== EXISTING POLICIES ===' as info;
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
WHERE tablename IN ('document_folders', 'documents')
ORDER BY tablename, policyname;

-- Step 4: Check if companies table has data
SELECT '=== COMPANIES DATA ===' as info;
SELECT 
  COUNT(*) as companies_count,
  MIN(id) as first_company_id,
  MAX(id) as last_company_id
FROM companies;

-- Step 5: Check if users table has data
SELECT '=== USERS DATA ===' as info;
SELECT 
  COUNT(*) as users_count,
  MIN(id) as first_user_id,
  MAX(id) as last_user_id
FROM users;

-- Step 6: Check if auth.users has data
SELECT '=== AUTH.USERS DATA ===' as info;
SELECT 
  COUNT(*) as auth_users_count,
  MIN(id) as first_auth_user_id,
  MAX(id) as last_auth_user_id
FROM auth.users;

-- Step 7: Check current user context
SELECT '=== CURRENT USER CONTEXT ===' as info;
SELECT 
  current_user,
  session_user,
  current_setting('role'),
  current_setting('app.current_user_id'),
  current_setting('app.current_user_role'),
  current_setting('app.current_company_id');

-- Step 8: Try a direct insert to see the exact error
SELECT '=== TESTING DIRECT INSERT ===' as info;
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
  insert_result RECORD;
BEGIN
  -- Get a company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get a user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  RAISE NOTICE 'Test company ID: %', test_company_id;
  RAISE NOTICE 'Test user ID: %', test_user_id;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Try to insert a test folder
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by) 
      VALUES ('Test Folder', test_company_id, '/Test Folder', test_user_id)
      RETURNING * INTO insert_result;
      
      RAISE NOTICE 'SUCCESS: Test folder created with ID: %', insert_result.id;
      
      -- Clean up the test folder
      DELETE FROM document_folders WHERE id = insert_result.id;
      RAISE NOTICE 'Test folder cleaned up.';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Test folder creation failed';
      RAISE NOTICE 'Error code: %', SQLSTATE;
      RAISE NOTICE 'Error message: %', SQLERRM;
      RAISE NOTICE 'Error detail: %', SQLERRM_DETAIL;
      RAISE NOTICE 'Error hint: %', SQLERRM_HINT;
    END;
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
  END IF;
END $$;

-- Step 9: Check for any constraints that might be blocking
SELECT '=== TABLE CONSTRAINTS ===' as info;
SELECT 
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_name IN ('document_folders', 'documents')
ORDER BY tc.table_name, tc.constraint_type;

