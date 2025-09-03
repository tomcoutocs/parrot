-- Comprehensive RLS Fix for Admin Users - Fixed Version
-- This script fixes all RLS policies to allow admin users full access
-- while avoiding infinite recursion issues

-- Step 1: Check current RLS status for all relevant tables
SELECT '=== CURRENT RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN (
  'projects', 
  'tasks', 
  'document_folders', 
  'documents', 
  'companies', 
  'users', 
  'internal_user_companies',
  'meeting_requests',
  'confirmed_meetings',
  'company_events',
  'user_favorites'
)
ORDER BY tablename;

-- Step 2: Drop ALL existing policies to start fresh
SELECT '=== DROPPING ALL EXISTING POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of tables to process
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'projects', 
            'tasks', 
            'document_folders', 
            'documents', 
            'companies', 
            'users', 
            'internal_user_companies',
            'meeting_requests',
            'confirmed_meetings',
            'company_events',
            'user_favorites'
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
    
    RAISE NOTICE 'All policies dropped successfully';
END $$;

-- Step 3: Disable RLS on users table to prevent infinite recursion
SELECT '=== DISABLING RLS ON USERS TABLE ===' as info;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 4: Ensure RLS is enabled on other tables
SELECT '=== ENABLING RLS ON OTHER TABLES ===' as info;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Step 5: Create new policies that allow admin users full access
SELECT '=== CREATING NEW ADMIN-FRIENDLY POLICIES ===' as info;

-- Projects: Admin users can see all projects, others see their company's projects
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

-- Tasks: Admin users can see all tasks, others see tasks from their company's projects
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

-- Document Folders: Admin users can see all folders, others see their company's folders and system folders
CREATE POLICY "Allow admin users to see all folders" ON document_folders
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
CREATE POLICY "Allow admin users to see all documents" ON documents
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

-- Companies: Admin users can see all companies, others see their own company
CREATE POLICY "Allow admin users to see all companies" ON companies
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

-- Internal User Companies: Admin users can see all assignments, others see their own
CREATE POLICY "Allow admin users to see all internal user companies" ON internal_user_companies
FOR ALL USING (
  -- Admin users can see all assignments
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their own assignments
  user_id = auth.uid()
);

-- Meeting Requests: Admin users can see all requests, others see their own
CREATE POLICY "Allow admin users to see all meeting requests" ON meeting_requests
FOR ALL USING (
  -- Admin users can see all requests
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their own requests
  requester_id = auth.uid()
);

-- Confirmed Meetings: Admin users can see all meetings, others see their own
CREATE POLICY "Allow admin users to see all confirmed meetings" ON confirmed_meetings
FOR ALL USING (
  -- Admin users can see all meetings
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their own meetings
  requester_id = auth.uid()
);

-- Company Events: Admin users can see all events, others see their company's events
CREATE POLICY "Allow admin users to see all company events" ON company_events
FOR ALL USING (
  -- Admin users can see all events
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their company's events
  company_id = (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- User Favorites: Admin users can see all favorites, others see their own
CREATE POLICY "Allow admin users to see all user favorites" ON user_favorites
FOR ALL USING (
  -- Admin users can see all favorites
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Other users can see their own favorites
  user_id = auth.uid()
);

-- Step 6: Verify the new policies
SELECT '=== VERIFYING NEW POLICIES ===' as info;

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
WHERE tablename IN (
  'projects', 
  'tasks', 
  'document_folders', 
  'documents', 
  'companies', 
  'users', 
  'internal_user_companies',
  'meeting_requests',
  'confirmed_meetings',
  'company_events',
  'user_favorites'
)
ORDER BY tablename, policyname;

-- Step 7: Test admin access
SELECT '=== TESTING ADMIN ACCESS ===' as info;

-- Count records in each table
SELECT 'Projects count: ' || COUNT(*)::text as project_count FROM projects;
SELECT 'Tasks count: ' || COUNT(*)::text as task_count FROM tasks;
SELECT 'Document folders count: ' || COUNT(*)::text as folder_count FROM document_folders;
SELECT 'Documents count: ' || COUNT(*)::text as document_count FROM documents;
SELECT 'Companies count: ' || COUNT(*)::text as company_count FROM companies;
SELECT 'Users count: ' || COUNT(*)::text as user_count FROM users;
SELECT 'Internal user companies count: ' || COUNT(*)::text as iuc_count FROM internal_user_companies;
SELECT 'Meeting requests count: ' || COUNT(*)::text as mr_count FROM meeting_requests;
SELECT 'Confirmed meetings count: ' || COUNT(*)::text as cm_count FROM confirmed_meetings;
SELECT 'Company events count: ' || COUNT(*)::text as ce_count FROM company_events;
SELECT 'User favorites count: ' || COUNT(*)::text as uf_count FROM user_favorites;

-- Step 8: Final status
SELECT '=== RLS FIX COMPLETE ===' as status;
SELECT 'Admin users should now have full access to all tables.' as message;
SELECT 'Users table RLS is disabled to prevent infinite recursion.' as note;
SELECT 'Other users will still be restricted by company-based policies.' as note2;
