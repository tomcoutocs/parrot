-- Fix Projects RLS Policies for Admin Access
-- This script ensures admin users can see all projects

-- Step 1: Check current RLS status for projects table
SELECT '=== CURRENT PROJECTS RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'projects';

-- Step 2: Check existing policies on projects table
SELECT '=== CURRENT PROJECTS POLICIES ===' as info;

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
WHERE tablename = 'projects'
ORDER BY policyname;

-- Step 3: Drop existing policies on projects table
SELECT '=== DROPPING EXISTING PROJECTS POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 4: Ensure RLS is enabled on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new policy that allows admin users to see all projects
SELECT '=== CREATING NEW PROJECTS POLICY ===' as info;

CREATE POLICY "Allow admin users to see all projects" ON projects
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

-- Step 6: Verify the new policy
SELECT '=== VERIFYING NEW POLICY ===' as info;

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
WHERE tablename = 'projects'
ORDER BY policyname;

-- Step 7: Test project access
SELECT '=== TESTING PROJECT ACCESS ===' as info;

-- Count total projects
SELECT 'Total projects in database: ' || COUNT(*)::text as project_count
FROM projects;

-- Show sample projects
SELECT 
  'Sample projects:' as info,
  id,
  name,
  company_id,
  status
FROM projects 
LIMIT 5;

-- Step 8: Final status
SELECT '=== PROJECTS RLS FIX COMPLETE ===' as status;
SELECT 'Admin users should now be able to see all projects.' as message;
