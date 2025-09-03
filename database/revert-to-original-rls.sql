-- Revert to Original RLS Policies
-- This script restores the original RLS policies that were working before our changes

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

-- Step 3: Enable RLS on all tables
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

-- Step 4: Create original simple policies
SELECT '=== CREATING ORIGINAL SIMPLE POLICIES ===' as info;

-- Projects: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access projects" ON projects
FOR ALL USING (auth.role() = 'authenticated');

-- Tasks: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access tasks" ON tasks
FOR ALL USING (auth.role() = 'authenticated');

-- Document Folders: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access document folders" ON document_folders
FOR ALL USING (auth.role() = 'authenticated');

-- Documents: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access documents" ON documents
FOR ALL USING (auth.role() = 'authenticated');

-- Companies: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access companies" ON companies
FOR ALL USING (auth.role() = 'authenticated');

-- Users: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access users" ON users
FOR ALL USING (auth.role() = 'authenticated');

-- Internal User Companies: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access internal user companies" ON internal_user_companies
FOR ALL USING (auth.role() = 'authenticated');

-- Meeting Requests: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access meeting requests" ON meeting_requests
FOR ALL USING (auth.role() = 'authenticated');

-- Confirmed Meetings: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access confirmed meetings" ON confirmed_meetings
FOR ALL USING (auth.role() = 'authenticated');

-- Company Events: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access company events" ON company_events
FOR ALL USING (auth.role() = 'authenticated');

-- User Favorites: Simple policy allowing authenticated users
CREATE POLICY "Allow authenticated users to access user favorites" ON user_favorites
FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Verify the restored policies
SELECT '=== VERIFYING RESTORED POLICIES ===' as info;

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

-- Step 6: Test basic access
SELECT '=== TESTING BASIC ACCESS ===' as info;

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

-- Step 7: Final status
SELECT '=== RLS REVERT COMPLETE ===' as status;
SELECT 'All RLS policies have been reverted to simple authenticated user access.' as message;
SELECT 'This should restore the previous working state.' as note;
