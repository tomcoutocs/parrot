-- Emergency RLS Fix - Disable RLS on All Tables
-- This script fixes the 406 errors by disabling RLS temporarily

-- Step 1: Disable RLS on all tables
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
ALTER TABLE forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE services DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE internal_user_companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies
DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of tables to process
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'companies', 
            'projects', 
            'tasks', 
            'users', 
            'document_folders', 
            'documents', 
            'forms',
            'form_submissions',
            'services',
            'company_services',
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

-- Step 3: Verify RLS is disabled
SELECT 
    tablename,
    CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = t.tablename) as policy_count
FROM pg_tables t
WHERE tablename IN (
    'companies', 
    'projects', 
    'tasks', 
    'users', 
    'document_folders', 
    'documents', 
    'forms',
    'form_submissions',
    'services',
    'company_services'
)
ORDER BY tablename;

-- Step 4: Test access
SELECT '=== TESTING ACCESS ===' as info;

-- Test companies table
SELECT COUNT(*) as company_count FROM companies;
SELECT id, name FROM companies LIMIT 3;

-- Test other tables
SELECT COUNT(*) as project_count FROM projects;
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as service_count FROM services;

SELECT 'EMERGENCY RLS FIX COMPLETED! All tables should now be accessible.' as final_status;
