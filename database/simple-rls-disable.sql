-- Simple RLS Fix - Just Drop Policies
-- This script just drops existing policies without recreating them

-- Step 1: Drop all existing policies on companies table
DROP POLICY IF EXISTS "Allow all authenticated users to access companies" ON companies;
DROP POLICY IF EXISTS "Admin users see all companies, others see own company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can perform all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON companies;
DROP POLICY IF EXISTS "Allow all access to companies" ON companies;

-- Step 2: Drop policies on other tables
DROP POLICY IF EXISTS "Allow all authenticated users to access projects" ON projects;
DROP POLICY IF EXISTS "Admin users see all projects, others see company projects" ON projects;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON projects;
DROP POLICY IF EXISTS "Allow all access to projects" ON projects;

DROP POLICY IF EXISTS "Allow all authenticated users to access tasks" ON tasks;
DROP POLICY IF EXISTS "Admin users see all tasks, others see company tasks" ON tasks;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON tasks;
DROP POLICY IF EXISTS "Allow all access to tasks" ON tasks;

DROP POLICY IF EXISTS "Allow all authenticated users to access document_folders" ON document_folders;
DROP POLICY IF EXISTS "Admin users see all folders, others see company folders" ON document_folders;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON document_folders;
DROP POLICY IF EXISTS "Allow all access to document_folders" ON document_folders;

DROP POLICY IF EXISTS "Allow all authenticated users to access documents" ON documents;
DROP POLICY IF EXISTS "Admin users see all documents, others see company documents" ON documents;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON documents;
DROP POLICY IF EXISTS "Allow all access to documents" ON documents;

-- Step 3: Disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify the fix
SELECT '=== VERIFYING RLS DISABLE ===' as info;
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('companies', 'projects', 'tasks', 'document_folders', 'documents')
ORDER BY tablename;

-- Step 5: Test access
SELECT '=== TESTING ACCESS ===' as info;
SELECT COUNT(*) as company_count FROM companies;
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as task_count FROM tasks;

SELECT 'RLS DISABLED! All tables should now be accessible.' as final_status;
