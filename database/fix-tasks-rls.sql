-- Fix Tasks RLS Policies for Admin Access
-- This script ensures admin users can see all tasks

-- Step 1: Check current RLS status for tasks table
SELECT '=== CURRENT TASKS RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'tasks';

-- Step 2: Check existing policies on tasks table
SELECT '=== CURRENT TASKS POLICIES ===' as info;

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
WHERE tablename = 'tasks'
ORDER BY policyname;

-- Step 3: Drop existing policies on tasks table
SELECT '=== DROPPING EXISTING TASKS POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tasks'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 4: Ensure RLS is enabled on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new policy that allows admin users to see all tasks
SELECT '=== CREATING NEW TASKS POLICY ===' as info;

CREATE POLICY "Allow admin users to see all tasks" ON tasks
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
WHERE tablename = 'tasks'
ORDER BY policyname;

-- Step 7: Test task access
SELECT '=== TESTING TASK ACCESS ===' as info;

-- Count total tasks
SELECT 'Total tasks in database: ' || COUNT(*)::text as task_count
FROM tasks;

-- Show sample tasks
SELECT 
  'Sample tasks:' as info,
  id,
  title,
  project_id,
  status
FROM tasks 
LIMIT 5;

-- Step 8: Final status
SELECT '=== TASKS RLS FIX COMPLETE ===' as status;
SELECT 'Admin users should now be able to see all tasks.' as message;
