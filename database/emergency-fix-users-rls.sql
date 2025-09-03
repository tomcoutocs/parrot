-- Emergency Fix: Disable RLS on Users Table to Stop Infinite Recursion
-- This script temporarily disables RLS on the users table to fix the infinite recursion error

-- Step 1: Check current RLS status for users table
SELECT '=== CURRENT USERS TABLE RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'users';

-- Step 2: Check current policies on users table
SELECT '=== CURRENT USERS TABLE POLICIES ===' as info;

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
WHERE tablename = 'users'
ORDER BY policyname;

-- Step 3: Drop ALL existing policies on users table
SELECT '=== DROPPING ALL USERS TABLE POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON users', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'All users table policies dropped successfully';
END $$;

-- Step 4: Disable RLS on users table completely
SELECT '=== DISABLING RLS ON USERS TABLE ===' as info;

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 5: Verify RLS is disabled
SELECT '=== VERIFYING USERS TABLE RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'users';

-- Step 6: Test users table access
SELECT '=== TESTING USERS TABLE ACCESS ===' as info;

-- Count users
SELECT 'Users count: ' || COUNT(*)::text as user_count FROM users;

-- Show sample users (without sensitive data)
SELECT 
  'Sample users:' as info,
  id,
  email,
  full_name,
  role,
  company_id
FROM users 
LIMIT 5;

-- Step 7: Final status
SELECT '=== USERS TABLE RLS DISABLE COMPLETE ===' as status;
SELECT 'Users table RLS has been disabled to fix infinite recursion.' as message;
SELECT 'The application should now be able to fetch users without errors.' as note;
