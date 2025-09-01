-- Quick Fix for Folder Creation Issues
-- This script addresses the most common causes of folder creation failures

-- Step 1: Ensure tables exist and have correct structure
SELECT '=== ENSURING TABLES EXIST ===' as info;

-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_folders table if it doesn't exist
CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  company_id UUID NOT NULL,
  parent_folder_id UUID,
  path VARCHAR(500) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  folder_path VARCHAR(500) NOT NULL DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create basic indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_company_id ON document_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);

-- Step 3: Insert sample company if none exists
SELECT '=== ENSURING SAMPLE DATA ===' as info;

INSERT INTO companies (id, name) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Default Company')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Drop all existing RLS policies (clean slate)
SELECT '=== DROPPING EXISTING RLS POLICIES ===' as info;

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

-- Step 5: Enable RLS and create simple policies
SELECT '=== CREATING SIMPLE RLS POLICIES ===' as info;

ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create simple policies that allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON document_folders
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all authenticated users" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 6: Test folder creation
SELECT '=== TESTING FOLDER CREATION ===' as info;

DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
  insert_result RECORD;
BEGIN
  -- Get the default company ID
  SELECT id INTO test_company_id FROM companies WHERE name = 'Default Company';
  
  -- Get a user ID from auth.users
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with company_id: % and user_id: %', test_company_id, test_user_id;
    
    -- Try to insert a test folder
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by) 
      VALUES ('Test Folder', test_company_id, '/Test Folder', test_user_id)
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

-- Step 7: Verify final state
SELECT '=== FINAL VERIFICATION ===' as info;

-- Check policies
SELECT 
  'Policies created: ' || COUNT(*)::text as policies_info
FROM pg_policies 
WHERE tablename IN ('document_folders', 'documents');

-- Check RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('document_folders', 'documents')
ORDER BY tablename;

-- Check data
SELECT 
  'Companies: ' || COUNT(*)::text as companies_info
FROM companies;

SELECT 
  'Auth users: ' || COUNT(*)::text as users_info
FROM auth.users;

-- Final message
SELECT '=== FOLDER CREATION SHOULD NOW WORK ===' as status;
SELECT 'If the test above succeeded, folder creation should work in your application.' as message;
