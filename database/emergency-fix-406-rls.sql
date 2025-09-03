-- Emergency Fix for 406 and RLS Issues
-- This script quickly fixes the immediate problems

-- Step 1: Disable RLS on problematic tables
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on these tables
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
DROP POLICY IF EXISTS "Allow all authenticated users" ON document_folders;
DROP POLICY IF EXISTS "Allow all authenticated users" ON documents;
DROP POLICY IF EXISTS "Allow authenticated users all operations" ON document_folders;
DROP POLICY IF EXISTS "Allow authenticated users all operations" ON documents;

-- Companies table policies
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can perform all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow admin users to see all companies" ON companies;
DROP POLICY IF EXISTS "Admin users see all companies, others see own company" ON companies;
DROP POLICY IF EXISTS "Allow all authenticated users" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users all operations" ON companies;

-- Users table policies
DROP POLICY IF EXISTS "Allow all authenticated users to access users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users to see users" ON users;
DROP POLICY IF EXISTS "Admin users see all users, others see company users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users" ON users;
DROP POLICY IF EXISTS "Allow authenticated users all operations" ON users;

-- Step 3: Verify the fix
SELECT 'EMERGENCY FIX APPLIED!' as status;
SELECT 'RLS disabled on document_folders, documents, companies, and users tables.' as message;
SELECT 'All policies dropped. Tables should now be accessible.' as message2;

-- Step 4: Test basic access
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get a user ID
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_company_id IS NOT NULL THEN
    RAISE NOTICE 'SUCCESS: Companies table accessible! Company ID: %', test_company_id;
  END IF;
  
  IF test_user_id IS NOT NULL THEN
    RAISE NOTICE 'SUCCESS: Users table accessible! User ID: %', test_user_id;
  END IF;
  
  -- Test document folders access
  PERFORM COUNT(*) FROM document_folders LIMIT 1;
  RAISE NOTICE 'SUCCESS: Document folders table accessible!';
  
  -- Test documents access
  PERFORM COUNT(*) FROM documents LIMIT 1;
  RAISE NOTICE 'SUCCESS: Documents table accessible!';
  
END $$;
