-- Quick RLS Fix for Admin Access
-- Run this in your Supabase SQL Editor to fix admin access

-- Step 1: Drop all existing policies on key tables
DROP POLICY IF EXISTS "Allow all authenticated users to access companies" ON companies;
DROP POLICY IF EXISTS "Admin users see all companies, others see own company" ON companies;
DROP POLICY IF EXISTS "Allow all authenticated users to access projects" ON projects;
DROP POLICY IF EXISTS "Admin users see all projects, others see company projects" ON projects;
DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON tasks;
DROP POLICY IF EXISTS "Admin users see all tasks, others see company tasks" ON tasks;
DROP POLICY IF EXISTS "Allow all authenticated users to access users" ON users;
DROP POLICY IF EXISTS "Allow all authenticated users to access document_folders" ON document_folders;
DROP POLICY IF EXISTS "Admin users see all folders, others see company folders" ON document_folders;
DROP POLICY IF EXISTS "Allow all authenticated users to access documents" ON documents;
DROP POLICY IF EXISTS "Admin users see all documents, others see company documents" ON documents;

-- Step 2: Create proper RLS policies using auth.uid() pattern
-- Companies: Admin users can see all companies, others see their own company
CREATE POLICY "Admin users see all companies, others see own company" ON companies
FOR ALL USING (
  -- Admin users can see all companies
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their own company
  id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Projects: Admin users can see all projects, others see their company's projects
CREATE POLICY "Admin users see all projects, others see company projects" ON projects
FOR ALL USING (
  -- Admin users can see all projects
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see projects from their company
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.company_id = projects.company_id
  )
);

-- Tasks: Admin users can see all tasks, others see tasks from their company's projects
CREATE POLICY "Admin users see all tasks, others see company tasks" ON tasks
FOR ALL USING (
  -- Admin users can see all tasks
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see tasks from their company's projects
  EXISTS (
    SELECT 1 FROM users u
    JOIN projects p ON u.company_id = p.company_id
    WHERE u.id = auth.uid() 
    AND p.id = tasks.project_id
  )
);

-- Users: Simple policy to avoid infinite recursion
CREATE POLICY "Allow all authenticated users to access users" ON users
FOR ALL USING (auth.role() = 'authenticated');

-- Document Folders: Admin users can see all folders, others see their company's folders
CREATE POLICY "Admin users see all folders, others see company folders" ON document_folders
FOR ALL USING (
  -- Admin users can see all folders
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their company's folders and system folders
  (company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  ) OR is_system_folder = TRUE)
);

-- Documents: Admin users can see all documents, others see their company's documents
CREATE POLICY "Admin users see all documents, others see company documents" ON documents
FOR ALL USING (
  -- Admin users can see all documents
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their company's documents
  company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Step 3: Verify the policies were created
SELECT '=== VERIFYING POLICIES ===' as info;
SELECT 
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE tablename IN ('companies', 'projects', 'tasks', 'users', 'document_folders', 'documents')
ORDER BY tablename, policyname;

-- Step 4: Test access
SELECT '=== TESTING ACCESS ===' as info;
SELECT COUNT(*) as company_count FROM companies;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as user_count FROM users;

SELECT 'RLS FIX COMPLETED! Admin users should now have access to all data.' as final_status;
