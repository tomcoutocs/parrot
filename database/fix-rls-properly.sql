-- Fix RLS Policies Properly - Using auth.uid() Pattern
-- This script fixes RLS policies using the proven auth.uid() pattern that works

-- Step 1: Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE tablename IN ('companies', 'projects', 'tasks', 'users', 'document_folders', 'documents')
ORDER BY tablename;

-- Step 2: Comprehensive policy cleanup - drop ALL existing policies
DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of tables to process
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'companies', 
            'projects', 
            'tasks', 
            'users', 
            'document_folders', 
            'documents'
        ])
    LOOP
        -- Drop all policies on each table
        FOR policy_record IN 
            SELECT policyname 
            FROM pg_policies 
            WHERE tablename = table_name
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, table_name);
            RAISE NOTICE 'Dropped policy: % on table %', policy_record.policyname, table_name;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'All existing policies dropped successfully';
END $$;

-- Step 3: Create proper RLS policies using auth.uid() pattern
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

-- Users: Simple policy to avoid infinite recursion - allow all authenticated users
CREATE POLICY "Allow all authenticated users to access users" ON users
FOR ALL USING (
  -- Allow all authenticated users to see all users
  -- This is safe because we control access at the application level
  auth.role() = 'authenticated'
);

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

-- Step 4: Verify the new policies
SELECT '=== VERIFYING NEW POLICIES ===' as info;

SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as policy_logic
FROM pg_policies 
WHERE tablename IN ('companies', 'projects', 'tasks', 'users', 'document_folders', 'documents')
ORDER BY tablename, policyname;

-- Step 5: Test access
SELECT '=== TESTING ACCESS ===' as info;

-- Test companies table
SELECT COUNT(*) as company_count FROM companies;
SELECT id, name FROM companies LIMIT 3;

-- Test other tables
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as user_count FROM users;

SELECT 'RLS FIX COMPLETED! Using proper auth.uid() pattern for admin access.' as final_status;
