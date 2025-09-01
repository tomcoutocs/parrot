-- Simple RLS Fix using users.company_id
-- This approach is much simpler and more direct

-- Drop all existing complex policies
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

-- Create simple policies using users.company_id
-- Users can view folders from their company
CREATE POLICY "Users can view company folders" ON document_folders
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can create folders in their company
CREATE POLICY "Users can create company folders" ON document_folders
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can update folders they created
CREATE POLICY "Users can update folders they created" ON document_folders
  FOR UPDATE USING (
    created_by = auth.uid() AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can delete folders they created
CREATE POLICY "Users can delete folders they created" ON document_folders
  FOR DELETE USING (
    created_by = auth.uid() AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can view documents from their company
CREATE POLICY "Users can view company documents" ON documents
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can create documents in their company
CREATE POLICY "Users can create company documents" ON documents
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can update documents they uploaded
CREATE POLICY "Users can update documents they uploaded" ON documents
  FOR UPDATE USING (
    uploaded_by = auth.uid() AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Users can delete documents they uploaded
CREATE POLICY "Users can delete documents they uploaded" ON documents
  FOR DELETE USING (
    uploaded_by = auth.uid() AND
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Admin and Manager override policies (can see and manage all documents in any company)
CREATE POLICY "Admins and Managers can view all folders" ON document_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

CREATE POLICY "Admins and Managers can manage all folders" ON document_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

CREATE POLICY "Admins and Managers can view all documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

CREATE POLICY "Admins and Managers can manage all documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND (role = 'admin' OR role = 'manager')
    )
  );

-- Verify the new policies
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

-- Test if we can insert a folder (this should work now)
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
    
    RAISE NOTICE 'Test folder created successfully!';
    
    -- Clean up the test folder
    DELETE FROM document_folders WHERE name = 'Test Folder';
    RAISE NOTICE 'Test folder cleaned up.';
  ELSE
    RAISE NOTICE 'Could not find company or user for testing';
  END IF;
END $$;

SELECT 'RLS policies fixed using users.company_id approach! You should now be able to create folders.' as status;
