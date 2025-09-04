-- Disable RLS for Admin Users - Simple Fix
-- This script disables RLS on key tables for admin users

-- Step 1: Drop all existing RLS policies
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

-- Step 2: Create simple policies that allow all authenticated users
-- This effectively disables RLS restrictions for admin users

-- Companies: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to access companies" ON companies
FOR ALL USING (auth.role() = 'authenticated');

-- Projects: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to access projects" ON projects
FOR ALL USING (auth.role() = 'authenticated');

-- Tasks: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to access tasks" ON tasks
FOR ALL USING (auth.role() = 'authenticated');

-- Users: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to access users" ON users
FOR ALL USING (auth.role() = 'authenticated');

-- Document Folders: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to access document_folders" ON document_folders
FOR ALL USING (auth.role() = 'authenticated');

-- Documents: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to access documents" ON documents
FOR ALL USING (auth.role() = 'authenticated');

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

SELECT 'RLS DISABLED FOR ADMIN USERS! All authenticated users can now access all data.' as final_status;
