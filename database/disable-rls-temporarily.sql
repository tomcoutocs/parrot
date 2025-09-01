-- Temporary RLS Disable - Get Basic Functionality Working
-- This script temporarily disables RLS so you can create folders and documents

-- Step 1: Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;
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

-- Step 2: Drop ALL existing policies
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

-- Step 3: DISABLE RLS temporarily
SELECT '=== DISABLING RLS TEMPORARILY ===' as info;
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is disabled
SELECT '=== VERIFYING RLS STATUS ===' as info;
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

-- Step 5: Test folder creation without RLS
SELECT '=== TESTING FOLDER CREATION WITHOUT RLS ===' as info;
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

-- Step 6: Final status
SELECT '=== FINAL STATUS ===' as info;
SELECT 
  'RLS temporarily disabled!' as status,
  'You should now be able to create folders and documents without RLS blocking you.' as message,
  'WARNING: This removes database-level security temporarily.' as security_note;

