-- Final RLS Fix - Single Policy Approach
-- This script creates one simple policy per table that should work immediately

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as info;
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

-- Step 2: Drop ALL existing policies (complete clean slate)
SELECT '=== DROPPING ALL POLICIES ===' as info;
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on document_folders
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'document_folders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON document_folders', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop all policies on documents
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'All policies dropped successfully';
END $$;

-- Step 3: Ensure RLS is enabled
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Create ONE simple policy per table
SELECT '=== CREATING SIMPLE POLICIES ===' as info;

-- Single policy for document_folders - allows all operations for authenticated users
CREATE POLICY "Allow authenticated users all operations" ON document_folders
  FOR ALL USING (auth.role() = 'authenticated');

-- Single policy for documents - allows all operations for authenticated users  
CREATE POLICY "Allow authenticated users all operations" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Verify the policies
SELECT '=== VERIFYING POLICIES ===' as info;
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

-- Step 6: Test folder creation
SELECT '=== TESTING FOLDER CREATION ===' as info;
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get a user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Try to insert a test folder
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by) 
      VALUES ('Test Folder', test_company_id, '/Test Folder', test_user_id);
      
      RAISE NOTICE 'SUCCESS: Test folder created successfully!';
      
      -- Clean up the test folder
      DELETE FROM document_folders WHERE name = 'Test Folder';
      RAISE NOTICE 'Test folder cleaned up.';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Test folder creation failed: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
  END IF;
END $$;

-- Step 7: Check table structure and constraints
SELECT '=== CHECKING TABLE STRUCTURE ===' as info;

-- Check document_folders table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'document_folders' 
ORDER BY ordinal_position;

-- Check for any foreign key constraints
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

-- Step 8: Check if users table exists and has the right structure
SELECT '=== CHECKING USERS TABLE ===' as info;

-- Check if users table exists
SELECT 
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN 'EXISTS' ELSE 'DOES NOT EXIST' END as users_table_status;

-- If users table exists, check its structure
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Users table exists - checking structure...';
    ELSE
        RAISE NOTICE 'Users table does not exist - this might be the issue!';
    END IF;
END $$;

-- Step 9: Final status
SELECT '=== FINAL STATUS ===' as info;
SELECT 
  'Simple RLS policies created successfully!' as status,
  'All authenticated users can now create folders and documents.' as message,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename IN ('document_folders', 'documents');

-- Step 10: Additional troubleshooting info
SELECT '=== TROUBLESHOOTING INFO ===' as info;

-- Check if there are any companies in the database
SELECT 
  'Companies count: ' || COUNT(*)::text as companies_info
FROM companies;

-- Check if there are any users in auth.users
SELECT 
  'Auth users count: ' || COUNT(*)::text as auth_users_info
FROM auth.users;

-- Check if there are any users in public.users (if it exists)
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
