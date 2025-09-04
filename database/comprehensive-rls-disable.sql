-- Comprehensive RLS Disable for Custom Auth
-- This script disables RLS on all main tables to work with our custom auth system

-- Step 1: Disable RLS on all main tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on all tables
-- Companies
DROP POLICY IF EXISTS "Allow all authenticated users to access companies" ON companies;
DROP POLICY IF EXISTS "Admin users see all companies, others see own company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can perform all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON companies;

-- Projects
DROP POLICY IF EXISTS "Allow all authenticated users to access projects" ON projects;
DROP POLICY IF EXISTS "Admin users see all projects, others see company projects" ON projects;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON projects;

-- Tasks
DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON tasks;
DROP POLICY IF EXISTS "Admin users see all tasks, others see company tasks" ON tasks;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON tasks;

-- Document Folders
DROP POLICY IF EXISTS "Allow all authenticated users to access document_folders" ON document_folders;
DROP POLICY IF EXISTS "Admin users see all folders, others see company folders" ON document_folders;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON document_folders;

-- Documents
DROP POLICY IF EXISTS "Allow all authenticated users to access documents" ON documents;
DROP POLICY IF EXISTS "Admin users see all documents, others see company documents" ON documents;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON documents;

-- Step 3: Create simple policies that allow all access
CREATE POLICY "Allow all access to companies" ON companies FOR ALL USING (true);
CREATE POLICY "Allow all access to projects" ON projects FOR ALL USING (true);
CREATE POLICY "Allow all access to tasks" ON tasks FOR ALL USING (true);
CREATE POLICY "Allow all access to document_folders" ON document_folders FOR ALL USING (true);
CREATE POLICY "Allow all access to documents" ON documents FOR ALL USING (true);

-- Step 4: Verify the fix
SELECT '=== VERIFYING COMPREHENSIVE FIX ===' as info;
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('companies', 'projects', 'tasks', 'document_folders', 'documents')
ORDER BY tablename;

-- Step 5: Test access to all tables
SELECT '=== TESTING ACCESS ===' as info;
SELECT COUNT(*) as company_count FROM companies;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as task_count FROM tasks;
SELECT COUNT(*) as folder_count FROM document_folders;
SELECT COUNT(*) as document_count FROM documents;

SELECT 'COMPREHENSIVE RLS DISABLE COMPLETE! All tables should now be accessible.' as final_status;
