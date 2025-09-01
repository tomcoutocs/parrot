-- Debug Folder Creation Issues
-- This script helps diagnose why folder creation is failing

-- Step 1: Check if tables exist
SELECT '=== CHECKING TABLE EXISTENCE ===' as info;

SELECT 
    table_name,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = table_name
    ) THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as status
FROM (VALUES ('document_folders'), ('documents'), ('companies'), ('users')) AS t(table_name);

-- Step 2: Check table structures
SELECT '=== CHECKING TABLE STRUCTURES ===' as info;

-- Check document_folders structure
SELECT 
    'document_folders structure:' as table_info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'document_folders' 
ORDER BY ordinal_position;

-- Step 3: Check RLS status
SELECT '=== CHECKING RLS STATUS ===' as info;

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

-- Step 4: Check current RLS policies
SELECT '=== CHECKING CURRENT RLS POLICIES ===' as info;

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

-- Step 5: Check data availability
SELECT '=== CHECKING DATA AVAILABILITY ===' as info;

-- Check companies
SELECT 
    'Companies count: ' || COUNT(*)::text as companies_info
FROM companies;

-- Check auth.users
SELECT 
    'Auth users count: ' || COUNT(*)::text as auth_users_info
FROM auth.users;

-- Check public.users (if exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Public users count: %', (SELECT COUNT(*) FROM users);
    ELSE
        RAISE NOTICE 'Public users table does not exist';
    END IF;
END $$;

-- Step 6: Test basic insert without RLS
SELECT '=== TESTING BASIC INSERT (RLS DISABLED) ===' as info;

-- Temporarily disable RLS for testing
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;

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
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with company_id: % and user_id: %', test_company_id, test_user_id;
    
    -- Try to insert a test folder
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by) 
      VALUES ('Debug Test Folder', test_company_id, '/Debug Test Folder', test_user_id)
      RETURNING * INTO insert_result;
      
      RAISE NOTICE 'SUCCESS: Test folder created successfully! ID: %', insert_result.id;
      
      -- Clean up the test folder
      DELETE FROM document_folders WHERE id = insert_result.id;
      RAISE NOTICE 'Test folder cleaned up.';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Test folder creation failed: %', SQLERRM;
      RAISE NOTICE 'Error code: %', SQLSTATE;
    END;
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
    RAISE NOTICE 'Company ID: %, User ID: %', test_company_id, test_user_id;
  END IF;
END $$;

-- Re-enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;

-- Step 7: Check foreign key constraints
SELECT '=== CHECKING FOREIGN KEY CONSTRAINTS ===' as info;

SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'document_folders'
ORDER BY tc.constraint_name;

-- Step 8: Check for any triggers
SELECT '=== CHECKING TRIGGERS ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'document_folders'
ORDER BY trigger_name;

-- Step 9: Final recommendations
SELECT '=== RECOMMENDATIONS ===' as info;

SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM companies LIMIT 1) 
        THEN 'Create at least one company in the companies table'
        ELSE 'Companies table has data - OK'
    END as recommendation_1;

SELECT 
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) 
        THEN 'No users in auth.users - this is likely the problem!'
        ELSE 'Auth users exist - OK'
    END as recommendation_2;

SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE tablename = 'document_folders' AND cmd = 'INSERT'
        ) 
        THEN 'No INSERT policy on document_folders - this will block folder creation'
        ELSE 'INSERT policy exists - OK'
    END as recommendation_3;
