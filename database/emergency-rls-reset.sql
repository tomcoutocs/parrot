-- Complete RLS Reset - Disable All RLS to Get Back to Working State
-- This script completely disables RLS on all tables to restore functionality

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

-- Step 2: Drop ALL existing policies
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

-- Step 3: DISABLE RLS on ALL tables completely
SELECT '=== DISABLING RLS ON ALL TABLES ===' as info;

ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_user_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is disabled on all tables
SELECT '=== VERIFYING RLS IS DISABLED ===' as info;

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

-- Step 5: Test access to all tables
SELECT '=== TESTING ACCESS TO ALL TABLES ===' as info;

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

-- Step 6: Show sample data to verify access
SELECT '=== SAMPLE DATA VERIFICATION ===' as info;

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

-- Show sample users
SELECT 
  'Sample users:' as info,
  id,
  email,
  full_name,
  role,
  company_id
FROM users 
LIMIT 3;

-- Step 7: Final status
SELECT '=== COMPLETE RLS RESET COMPLETE ===' as status;
SELECT 'All RLS has been disabled on all tables.' as message;
SELECT 'Your application should now work without any RLS restrictions.' as note;
SELECT 'You can handle permissions at the application level.' as note2;
