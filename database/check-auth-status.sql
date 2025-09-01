-- Check Authentication Status
-- This script helps diagnose authentication issues

-- Step 1: Check current user context
SELECT '=== CURRENT USER CONTEXT ===' as info;

SELECT 
  current_user,
  session_user,
  current_setting('role'),
  current_setting('app.current_user_id'),
  current_setting('app.current_user_role'),
  current_setting('app.current_company_id');

-- Step 2: Check auth.users table
SELECT '=== AUTH.USERS TABLE ===' as info;

SELECT 
  'Auth users count: ' || COUNT(*)::text as auth_users_info
FROM auth.users;

-- Show some sample users
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
LIMIT 5;

-- Step 3: Check public.users table (if it exists)
SELECT '=== PUBLIC.USERS TABLE ===' as info;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Public users count: %', (SELECT COUNT(*) FROM users);
        
        -- Show some sample users
        RAISE NOTICE 'Sample users:';
        FOR user_record IN SELECT id, email, full_name, role, company_id FROM users LIMIT 5 LOOP
            RAISE NOTICE '  ID: %, Email: %, Name: %, Role: %, Company: %', 
                user_record.id, user_record.email, user_record.full_name, 
                user_record.role, user_record.company_id;
        END LOOP;
    ELSE
        RAISE NOTICE 'Public users table does not exist';
    END IF;
END $$;

-- Step 4: Check companies table
SELECT '=== COMPANIES TABLE ===' as info;

SELECT 
  'Companies count: ' || COUNT(*)::text as companies_info
FROM companies;

-- Show sample companies
SELECT 
  id,
  name,
  created_at
FROM companies 
LIMIT 5;

-- Step 5: Check document_folders table
SELECT '=== DOCUMENT_FOLDERS TABLE ===' as info;

SELECT 
  'Document folders count: ' || COUNT(*)::text as folders_info
FROM document_folders;

-- Show sample folders
SELECT 
  id,
  name,
  company_id,
  created_by,
  created_at
FROM document_folders 
LIMIT 5;

-- Step 6: Check RLS status
SELECT '=== RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('document_folders', 'documents')
ORDER BY tablename;

-- Step 7: Check current policies
SELECT '=== CURRENT POLICIES ===' as info;

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

-- Step 8: Test basic authentication
SELECT '=== TESTING AUTHENTICATION ===' as info;

-- Test if we can access auth.users
DO $$
BEGIN
    BEGIN
        PERFORM COUNT(*) FROM auth.users;
        RAISE NOTICE 'SUCCESS: Can access auth.users table';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Cannot access auth.users table - %', SQLERRM;
    END;
END $$;

-- Test if we can access public.users (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        BEGIN
            PERFORM COUNT(*) FROM users;
            RAISE NOTICE 'SUCCESS: Can access public.users table';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'ERROR: Cannot access public.users table - %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'SKIP: public.users table does not exist';
    END IF;
END $$;

-- Test if we can access companies
DO $$
BEGIN
    BEGIN
        PERFORM COUNT(*) FROM companies;
        RAISE NOTICE 'SUCCESS: Can access companies table';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Cannot access companies table - %', SQLERRM;
    END;
END $$;

-- Test if we can access document_folders
DO $$
BEGIN
    BEGIN
        PERFORM COUNT(*) FROM document_folders;
        RAISE NOTICE 'SUCCESS: Can access document_folders table';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Cannot access document_folders table - %', SQLERRM;
    END;
END $$;

-- Step 9: Recommendations
SELECT '=== RECOMMENDATIONS ===' as info;

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM auth.users LIMIT 1) 
    THEN 'Create users in auth.users table'
    ELSE 'Auth users exist - OK'
  END as recommendation_1;

SELECT 
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM companies LIMIT 1) 
    THEN 'Create at least one company'
    ELSE 'Companies exist - OK'
  END as recommendation_2;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE tablename = 'document_folders' AND rowsecurity = true
    ) 
    THEN 'Consider disabling RLS temporarily to test folder creation'
    ELSE 'RLS is disabled - folder creation should work'
  END as recommendation_3;
