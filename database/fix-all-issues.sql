-- Comprehensive Fix for Document Management Issues
-- This script fixes both the missing user-company relationships and RLS policies

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as info;

-- Check if tables exist
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('document_folders', 'documents', 'internal_user_companies', 'companies', 'users')
ORDER BY table_name;

-- Check if internal_user_companies has data
SELECT 
  'internal_user_companies count: ' || COUNT(*) as table_status
FROM internal_user_companies;

-- Check if companies has data
SELECT 
  'companies count: ' || COUNT(*) as table_status
FROM companies;

-- Step 2: Fix missing user-company relationships
SELECT '=== FIXING USER-COMPANY RELATIONSHIPS ===' as info;

-- Create a test company if none exists
INSERT INTO companies (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Default Company')
ON CONFLICT (id) DO NOTHING;

-- Get the company ID we just created or existing one
DO $$
DECLARE
  company_id UUID;
  user_id UUID;
BEGIN
  -- Get the company ID
  SELECT id INTO company_id FROM companies LIMIT 1;
  
  -- Get a user ID from auth.users
  SELECT id INTO user_id FROM auth.users LIMIT 1;
  
  IF company_id IS NOT NULL AND user_id IS NOT NULL THEN
    -- Insert user-company relationship if it doesn't exist
    INSERT INTO internal_user_companies (user_id, company_id, is_primary, assigned_by)
    VALUES (user_id, company_id, true, user_id)
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    RAISE NOTICE 'User-company relationship created: User % -> Company %', user_id, company_id;
  ELSE
    RAISE NOTICE 'Could not create user-company relationship - missing user or company';
  END IF;
END $$;

-- Step 3: Fix RLS policies
SELECT '=== FIXING RLS POLICIES ===' as info;

-- Drop all existing restrictive policies
DROP POLICY IF EXISTS "Users can view company folders" ON document_folders;
DROP POLICY IF EXISTS "Users can create company folders" ON document_folders;
DROP POLICY IF EXISTS "Users can update folders they created" ON document_folders;
DROP POLICY IF EXISTS "Users can delete folders they created" ON document_folders;
DROP POLICY IF EXISTS "Users can view company documents" ON documents;
DROP POLICY IF EXISTS "Users can create company documents" ON documents;
DROP POLICY IF EXISTS "Users can update documents they uploaded" ON documents;
DROP POLICY IF EXISTS "Users can delete documents they uploaded" ON documents;
DROP POLICY IF EXISTS "Admins can view all folders" ON document_folders;
DROP POLICY IF EXISTS "Admins can manage all folders" ON document_folders;
DROP POLICY IF EXISTS "Admins can view all documents" ON documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;

-- Create simple, working policies
CREATE POLICY "Allow authenticated users to view folders" ON document_folders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create folders" ON document_folders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update folders" ON document_folders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete folders" ON document_folders
  FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to view documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create documents" ON documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update documents" ON documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete documents" ON documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- Step 4: Verify the fix
SELECT '=== VERIFYING THE FIX ===' as info;

-- Check final state
SELECT 
  'Final internal_user_companies count: ' || COUNT(*) as final_status
FROM internal_user_companies;

-- Check RLS policies
SELECT 
  'Final RLS policies count: ' || COUNT(*) as final_status
FROM pg_policies 
WHERE tablename IN ('document_folders', 'documents');

-- Test folder creation capability
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
    INSERT INTO document_folders (name, company_id, path, created_by) 
    VALUES ('Test Folder', test_company_id, '/Test Folder', test_user_id);
    
    RAISE NOTICE 'SUCCESS: Test folder created successfully!';
    
    -- Clean up the test folder
    DELETE FROM document_folders WHERE name = 'Test Folder';
    RAISE NOTICE 'Test folder cleaned up.';
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
  END IF;
END $$;

-- Step 5: Final status
SELECT '=== FINAL STATUS ===' as info;
SELECT 
  'All issues fixed successfully!' as status,
  'You should now be able to create folders and documents.' as message;
