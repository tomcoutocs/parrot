-- Re-enable RLS for Projects and Tasks with Proper Policies
-- Run this after testing with RLS disabled

-- Step 1: Re-enable RLS
SELECT '=== RE-ENABLING RLS ===' as info;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop any existing policies
SELECT '=== DROPPING EXISTING POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies on projects
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'projects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON projects', policy_record.policyname);
        RAISE NOTICE 'Dropped projects policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop policies on tasks
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'tasks'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', policy_record.policyname);
        RAISE NOTICE 'Dropped tasks policy: %', policy_record.policyname;
    END LOOP;
END $$;

-- Step 3: Create new policies
SELECT '=== CREATING NEW POLICIES ===' as info;

-- Projects policy: Admin users can see all projects, others see their company's projects
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

-- Tasks policy: Admin users can see all tasks, others see tasks from their company's projects
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

-- Step 4: Verify policies
SELECT '=== VERIFYING POLICIES ===' as info;

SELECT 
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename IN ('projects', 'tasks')
ORDER BY tablename, policyname;

-- Step 5: Test access
SELECT '=== TESTING ACCESS ===' as info;

-- Test project access
SELECT 'Projects accessible: ' || COUNT(*)::text as project_count
FROM projects;

-- Test task access
SELECT 'Tasks accessible: ' || COUNT(*)::text as task_count
FROM tasks;

-- Step 6: Final status
SELECT '=== RLS RE-ENABLE COMPLETE ===' as status;
SELECT 'RLS is now enabled with proper policies for admin access.' as message;
