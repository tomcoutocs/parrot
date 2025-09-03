-- Bridge Custom Auth with RLS
-- This script creates a bridge between the custom authentication system and RLS policies

-- Step 1: Create a custom RPC function to set user context
CREATE OR REPLACE FUNCTION set_user_context(
  user_id UUID,
  user_role TEXT,
  company_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  -- Store the user context in a temporary setting
  -- This will be available during the current session
  PERFORM set_config('app.user_id', user_id::text, false);
  PERFORM set_config('app.user_role', user_role, false);
  PERFORM set_config('app.company_id', COALESCE(company_id::text, 'NULL'), false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create helper functions to get user context
CREATE OR REPLACE FUNCTION get_current_user_id() RETURNS UUID AS $$
BEGIN
  RETURN COALESCE(current_setting('app.user_id', true)::UUID, NULL);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_user_role() RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(current_setting('app.user_role', true), 'user');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_current_company_id() RETURNS UUID AS $$
BEGIN
  RETURN CASE 
    WHEN current_setting('app.company_id', true) = 'NULL' THEN NULL
    ELSE COALESCE(current_setting('app.company_id', true)::UUID, NULL)
  END;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Drop all existing policies
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

-- Step 4: Enable RLS on all tables
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

-- Step 5: Create new RLS policies that work with custom auth
-- Users: Admin can see all, others can see users from their company
CREATE POLICY "Allow access based on custom auth" ON users
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  company_id = get_current_company_id()
);

-- Projects: Admin can see all, others can see projects from their company
CREATE POLICY "Allow access based on custom auth" ON projects
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  company_id = get_current_company_id()
);

-- Tasks: Admin can see all, others can see tasks from their company
CREATE POLICY "Allow access based on custom auth" ON tasks
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = tasks.project_id 
    AND p.company_id = get_current_company_id()
  )
);

-- Document Folders: Admin can see all, others can see folders from their company
CREATE POLICY "Allow access based on custom auth" ON document_folders
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  company_id = get_current_company_id()
);

-- Documents: Admin can see all, others can see documents from their company
CREATE POLICY "Allow access based on custom auth" ON documents
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  company_id = get_current_company_id()
);

-- Companies: Admin can see all, others can see their own company
CREATE POLICY "Allow access based on custom auth" ON companies
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  id = get_current_company_id()
);

-- Internal User Companies: Admin can see all, others can see their own assignments
CREATE POLICY "Allow access based on custom auth" ON internal_user_companies
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  user_id = get_current_user_id()
);

-- Meeting Requests: Admin can see all, others can see their own requests
CREATE POLICY "Allow access based on custom auth" ON meeting_requests
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  requester_id = get_current_user_id()
);

-- Confirmed Meetings: Admin can see all, others can see their own meetings
CREATE POLICY "Allow access based on custom auth" ON confirmed_meetings
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  requester_id = get_current_user_id()
);

-- Company Events: Admin can see all, others can see events from their company
CREATE POLICY "Allow access based on custom auth" ON company_events
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  company_id = get_current_company_id()
);

-- User Favorites: Admin can see all, others can see their own favorites
CREATE POLICY "Allow access based on custom auth" ON user_favorites
FOR ALL USING (
  get_current_user_role() = 'admin' OR
  user_id = get_current_user_id()
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
  qual
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

-- Step 7: Test the RPC function
SELECT '=== TESTING RPC FUNCTION ===' as info;

-- Test setting user context
SELECT set_user_context(
  '550e8400-e29b-41d4-a716-446655440001'::UUID, 
  'admin', 
  NULL
);

-- Test getting user context
SELECT 
  'Current user ID: ' || get_current_user_id()::text as user_id,
  'Current user role: ' || get_current_user_role() as user_role,
  'Current company ID: ' || COALESCE(get_current_company_id()::text, 'NULL') as company_id;

-- Step 8: Final status
SELECT '=== CUSTOM AUTH RLS BRIDGE COMPLETE ===' as status;
SELECT 'RPC function set_user_context() created.' as message;
SELECT 'Helper functions get_current_user_id(), get_current_user_role(), get_current_company_id() created.' as message2;
SELECT 'RLS policies now work with custom authentication system.' as message3;
SELECT 'Admin users will have full access to all data.' as message4;
SELECT 'Non-admin users will be restricted to their company data.' as message5;
