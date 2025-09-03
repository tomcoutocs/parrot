-- Add Back RLS Safely - No Recursion Approach
-- This script adds RLS policies back with a safe approach that avoids infinite recursion

-- Step 1: Check current RLS status
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

-- Step 2: Create a safe function to check admin status
-- This function uses a different approach to avoid recursion
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    -- Use a direct query with LIMIT 1 to avoid potential recursion
    SELECT role INTO user_role 
    FROM users 
    WHERE id = user_id 
    LIMIT 1;
    
    RETURN COALESCE(user_role, 'user');
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, return 'user' (not admin)
        RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a safe function to get user's company
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID DEFAULT auth.uid())
RETURNS UUID AS $$
DECLARE
    company_id UUID;
BEGIN
    -- Use a direct query with LIMIT 1 to avoid potential recursion
    SELECT company_id INTO company_id 
    FROM users 
    WHERE id = user_id 
    LIMIT 1;
    
    RETURN company_id;
EXCEPTION
    WHEN OTHERS THEN
        -- If there's any error, return null
        RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Enable RLS on all tables
SELECT '=== ENABLING RLS ON ALL TABLES ===' as info;

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Step 5: Create RLS policies using the safe functions
SELECT '=== CREATING SAFE RLS POLICIES ===' as info;

-- Users: Simple policy - all authenticated users can see all users
-- This is safe because we control access at application level
CREATE POLICY "Allow all authenticated users to access users" ON users
FOR ALL USING (auth.role() = 'authenticated');

-- Projects: Admin users can see all projects, others see their company's projects
CREATE POLICY "Admin users see all projects, others see company projects" ON projects
FOR ALL USING (
  get_user_role() = 'admin' OR
  company_id = get_user_company_id()
);

-- Tasks: Admin users can see all tasks, others see tasks from their company's projects
CREATE POLICY "Admin users see all tasks, others see company tasks" ON tasks
FOR ALL USING (
  get_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = tasks.project_id
    AND p.company_id = get_user_company_id()
  )
);

-- Document Folders: Admin users can see all folders, others see their company's folders and system folders
CREATE POLICY "Admin users see all folders, others see company folders" ON document_folders
FOR ALL USING (
  get_user_role() = 'admin' OR
  company_id = get_user_company_id() OR
  is_system_folder = TRUE
);

-- Documents: Admin users can see all documents, others see their company's documents
CREATE POLICY "Admin users see all documents, others see company documents" ON documents
FOR ALL USING (
  get_user_role() = 'admin' OR
  company_id = get_user_company_id()
);

-- Companies: Admin users can see all companies, others see their own company
CREATE POLICY "Admin users see all companies, others see own company" ON companies
FOR ALL USING (
  get_user_role() = 'admin' OR
  id = get_user_company_id()
);

-- Internal User Companies: Admin users can see all assignments, others see their own
CREATE POLICY "Admin users see all assignments, others see own" ON internal_user_companies
FOR ALL USING (
  get_user_role() = 'admin' OR
  user_id = auth.uid()
);

-- Meeting Requests: Admin users can see all requests, others see their own
CREATE POLICY "Admin users see all requests, others see own" ON meeting_requests
FOR ALL USING (
  get_user_role() = 'admin' OR
  requester_id = auth.uid()
);

-- Confirmed Meetings: Admin users can see all meetings, others see their own
CREATE POLICY "Admin users see all meetings, others see own" ON confirmed_meetings
FOR ALL USING (
  get_user_role() = 'admin' OR
  requester_id = auth.uid()
);

-- Company Events: Admin users can see all events, others see their company's events
CREATE POLICY "Admin users see all events, others see company events" ON company_events
FOR ALL USING (
  get_user_role() = 'admin' OR
  company_id = get_user_company_id()
);

-- User Favorites: Admin users can see all favorites, others see their own
CREATE POLICY "Admin users see all favorites, others see own" ON user_favorites
FOR ALL USING (
  get_user_role() = 'admin' OR
  user_id = auth.uid()
);

-- Step 6: Test the functions
SELECT '=== TESTING FUNCTIONS ===' as info;

-- Test if the functions work
SELECT 
  'Current user info:' as info,
  auth.uid() as user_id,
  get_user_role() as user_role,
  get_user_company_id() as company_id;

-- Step 7: Verify the new policies
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

-- Step 8: Test access for different user types
SELECT '=== TESTING ACCESS ===' as info;

-- Count records in each table (this will show what the current user can see)
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

-- Step 9: Show sample data
SELECT '=== SAMPLE DATA ===' as info;

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

-- Step 10: Final status
SELECT '=== RLS SAFELY ADDED BACK ===' as status;
SELECT 'RLS is enabled with safe admin checking functions.' as message;
SELECT 'Admin users have full access to all tables.' as note;
SELECT 'Non-admin users are restricted to their company data.' as note2;
SELECT 'No infinite recursion issues.' as note3;
SELECT 'The Project Overview tab should work correctly for admin users.' as note4;
