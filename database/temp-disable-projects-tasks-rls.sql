-- Temporary RLS Disable for Projects and Tasks (Testing Only)
-- This script temporarily disables RLS to test if that's the issue

-- Step 1: Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('projects', 'tasks')
ORDER BY tablename;

-- Step 2: Temporarily disable RLS on projects and tasks
SELECT '=== TEMPORARILY DISABLING RLS ===' as info;

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT '=== VERIFYING RLS IS DISABLED ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('projects', 'tasks')
ORDER BY tablename;

-- Step 4: Test data access
SELECT '=== TESTING DATA ACCESS ===' as info;

-- Count projects
SELECT 'Total projects: ' || COUNT(*)::text as project_count
FROM projects;

-- Count tasks
SELECT 'Total tasks: ' || COUNT(*)::text as task_count
FROM tasks;

-- Show sample projects
SELECT 
  'Sample projects:' as info,
  id,
  name,
  company_id,
  status
FROM projects 
LIMIT 3;

-- Show sample tasks
SELECT 
  'Sample tasks:' as info,
  id,
  title,
  project_id,
  status
FROM tasks 
LIMIT 3;

-- Step 5: Final status
SELECT '=== TEMPORARY RLS DISABLE COMPLETE ===' as status;
SELECT 'RLS is now disabled on projects and tasks tables.' as message;
SELECT 'This is for testing only - remember to re-enable RLS later.' as warning;
