-- Comprehensive RLS Fix - Simple Permissive Policies
-- This script creates simple, permissive RLS policies for all tables

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as info;
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
WHERE tablename IN ('document_folders', 'documents', 'companies', 'users', 'projects', 'tasks')
ORDER BY tablename, policyname;

-- Step 2: Drop ALL existing policies (complete clean slate)
SELECT '=== DROPPING ALL POLICIES ===' as info;
DO $$
DECLARE
    policy_record RECORD;
    table_name TEXT;
BEGIN
    -- List of tables to process
    FOR table_name IN 
        SELECT unnest(ARRAY[
            'document_folders', 
            'documents', 
            'companies', 
            'users', 
            'projects', 
            'tasks',
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

-- Step 3: Ensure RLS is enabled on all tables
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

-- Step 4: Create simple, permissive policies for all tables
SELECT '=== CREATING SIMPLE PERMISSIVE POLICIES ===' as info;

-- Document Folders: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON document_folders
  FOR ALL USING (auth.role() = 'authenticated');

-- Documents: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON documents
  FOR ALL USING (auth.role() = 'authenticated');

-- Companies: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON companies
  FOR ALL USING (auth.role() = 'authenticated');

-- Users: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON users
  FOR ALL USING (auth.role() = 'authenticated');

-- Projects: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON projects
  FOR ALL USING (auth.role() = 'authenticated');

-- Tasks: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON tasks
  FOR ALL USING (auth.role() = 'authenticated');

-- Internal User Companies: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON internal_user_companies
  FOR ALL USING (auth.role() = 'authenticated');

-- Meeting Requests: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON meeting_requests
  FOR ALL USING (auth.role() = 'authenticated');

-- Confirmed Meetings: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON confirmed_meetings
  FOR ALL USING (auth.role() = 'authenticated');

-- Company Events: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON company_events
  FOR ALL USING (auth.role() = 'authenticated');

-- User Favorites: Allow all authenticated users
CREATE POLICY "Allow all authenticated users" ON user_favorites
  FOR ALL USING (auth.role() = 'authenticated');

-- Step 5: Verify the fix
SELECT '=== VERIFYING FIX ===' as info;
SELECT 
  'Final RLS policies count: ' || COUNT(*) as final_status
FROM pg_policies 
WHERE tablename IN (
  'document_folders', 
  'documents', 
  'companies', 
  'users', 
  'projects', 
  'tasks',
  'internal_user_companies',
  'meeting_requests',
  'confirmed_meetings',
  'company_events',
  'user_favorites'
);

-- Step 6: Test basic operations
SELECT '=== TESTING BASIC OPERATIONS ===' as info;
DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
BEGIN
  -- Get a company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get a user ID
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Try to select from companies table
    PERFORM COUNT(*) FROM companies WHERE id = test_company_id;
    RAISE NOTICE 'SUCCESS: Companies table accessible!';
    
    -- Try to select from users table
    PERFORM COUNT(*) FROM users WHERE id = test_user_id;
    RAISE NOTICE 'SUCCESS: Users table accessible!';
    
    -- Try to select from document_folders table
    PERFORM COUNT(*) FROM document_folders LIMIT 1;
    RAISE NOTICE 'SUCCESS: Document folders table accessible!';
    
    -- Try to select from documents table
    PERFORM COUNT(*) FROM documents LIMIT 1;
    RAISE NOTICE 'SUCCESS: Documents table accessible!';
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
  END IF;
END $$;

SELECT 'COMPREHENSIVE RLS FIX COMPLETED! All authenticated users can now access all tables.' as status;
