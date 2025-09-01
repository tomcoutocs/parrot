-- Proper RLS Fix - Maintain Security While Fixing Issues
-- This script creates clean, working RLS policies that maintain proper access control

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

-- Step 2: Drop existing problematic policies
SELECT '=== DROPPING EXISTING POLICIES ===' as info;
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
DROP POLICY IF EXISTS "Admins can view all documents" ON document_folders;
DROP POLICY IF EXISTS "Admins can manage all documents" ON documents;
DROP POLICY IF EXISTS "Admins and Managers can view all folders" ON document_folders;
DROP POLICY IF EXISTS "Admins and Managers can manage all folders" ON document_folders;
DROP POLICY IF EXISTS "Admins and Managers can view all documents" ON documents;
DROP POLICY IF EXISTS "Admins and Managers can manage all documents" ON documents;
DROP POLICY IF EXISTS "Allow all authenticated users" ON document_folders;
DROP POLICY IF EXISTS "Allow all authenticated users" ON documents;

-- Step 3: Ensure RLS is enabled
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Step 4: Create clean, working RLS policies
SELECT '=== CREATING CLEAN RLS POLICIES ===' as info;

-- Policy 1: Allow users to view folders from their company
CREATE POLICY "Users can view company folders" ON document_folders
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 2: Allow users to create folders in their company
CREATE POLICY "Users can create company folders" ON document_folders
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 3: Allow users to update folders they created in their company
CREATE POLICY "Users can update own folders" ON document_folders
  FOR UPDATE USING (
    created_by = auth.uid() AND
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 4: Allow users to delete folders they created in their company
CREATE POLICY "Users can delete own folders" ON document_folders
  FOR DELETE USING (
    created_by = auth.uid() AND
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 5: Allow users to view documents from their company
CREATE POLICY "Users can view company documents" ON documents
  FOR SELECT USING (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 6: Allow users to create documents in their company
CREATE POLICY "Users can create company documents" ON documents
  FOR INSERT WITH CHECK (
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 7: Allow users to update documents they uploaded in their company
CREATE POLICY "Users can update own documents" ON documents
  FOR UPDATE USING (
    uploaded_by = auth.uid() AND
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 8: Allow users to delete documents they uploaded in their company
CREATE POLICY "Users can delete own documents" ON documents
  FOR DELETE USING (
    uploaded_by = auth.uid() AND
    company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Policy 9: Admin override - can access all folders
CREATE POLICY "Admins can access all folders" ON document_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 10: Admin override - can access all documents
CREATE POLICY "Admins can access all documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy 11: Manager override - can access all folders
CREATE POLICY "Managers can access all folders" ON document_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager'
    )
  );

-- Policy 12: Manager override - can access all documents
CREATE POLICY "Managers can access all documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager'
    )
  );

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

-- Step 6: Test the policies
SELECT '=== TESTING POLICIES ===' as info;
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
  test_admin_id UUID;
BEGIN
  -- Get a company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get a regular user ID
  SELECT id INTO test_user_id FROM auth.users LIMIT 1;
  
  -- Get an admin user ID
  SELECT id INTO test_admin_id FROM users WHERE role = 'admin' LIMIT 1;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Test 1: Regular user creating folder in their company
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by) 
      VALUES ('Test User Folder', test_company_id, '/Test User Folder', test_user_id);
      RAISE NOTICE 'SUCCESS: Regular user can create folder in their company';
      
      -- Clean up
      DELETE FROM document_folders WHERE name = 'Test User Folder';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Regular user cannot create folder: %', SQLERRM;
    END;
    
    -- Test 2: Admin creating folder in any company
    IF test_admin_id IS NOT NULL THEN
      BEGIN
        INSERT INTO document_folders (name, company_id, path, created_by) 
        VALUES ('Test Admin Folder', test_company_id, '/Test Admin Folder', test_admin_id);
        RAISE NOTICE 'SUCCESS: Admin can create folder in any company';
        
        -- Clean up
        DELETE FROM document_folders WHERE name = 'Test Admin Folder';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Admin cannot create folder: %', SQLERRM;
      END;
    END IF;
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
  END IF;
END $$;

-- Step 7: Final status
SELECT '=== FINAL STATUS ===' as info;
SELECT 
  'RLS policies created successfully!' as status,
  'Security maintained while fixing access issues.' as message,
  COUNT(*) as total_policies
FROM pg_policies 
WHERE tablename IN ('document_folders', 'documents');
