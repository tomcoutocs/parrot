-- Quick Fix for RLS Policy Issue
-- Run this script to immediately fix the folder creation problem

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

SELECT 'RLS policies fixed! You can now create folders.' as status;
