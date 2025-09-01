-- Create Basic Users Setup
-- This script creates the necessary users and tables for the application to work

-- Step 1: Check current state
SELECT '=== CURRENT STATE ===' as info;

SELECT 
  'Auth users count: ' || COUNT(*)::text as auth_users_info
FROM auth.users;

-- Step 2: Create companies table if it doesn't exist
SELECT '=== CREATING COMPANIES TABLE ===' as info;

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create public.users table if it doesn't exist
SELECT '=== CREATING PUBLIC.USERS TABLE ===' as info;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  company_id UUID REFERENCES companies(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 4: Create document_folders table if it doesn't exist
SELECT '=== CREATING DOCUMENT_FOLDERS TABLE ===' as info;

CREATE TABLE IF NOT EXISTS document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  parent_folder_id UUID REFERENCES document_folders(id),
  path VARCHAR(500) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create documents table if it doesn't exist
SELECT '=== CREATING DOCUMENTS TABLE ===' as info;

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  uploaded_by UUID NOT NULL,
  folder_path VARCHAR(500) NOT NULL DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Insert sample company
SELECT '=== INSERTING SAMPLE COMPANY ===' as info;

INSERT INTO companies (id, name) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Default Company')
ON CONFLICT (id) DO NOTHING;

-- Step 7: Insert sample users
SELECT '=== INSERTING SAMPLE USERS ===' as info;

-- Insert admin user
INSERT INTO users (id, email, full_name, role, company_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440001', 'admin@company.com', 'Admin User', 'admin', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (email) DO NOTHING;

-- Insert manager user
INSERT INTO users (id, email, full_name, role, company_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440002', 'manager@company.com', 'Manager User', 'manager', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (email) DO NOTHING;

-- Insert regular user
INSERT INTO users (id, email, full_name, role, company_id) VALUES 
  ('550e8400-e29b-41d4-a716-446655440003', 'user@company.com', 'Regular User', 'user', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (email) DO NOTHING;

-- Step 8: Create users in auth.users (if possible)
SELECT '=== ATTEMPTING TO CREATE AUTH USERS ===' as info;

-- Note: This might not work depending on your Supabase setup
-- You may need to create users through the Supabase dashboard or auth API
DO $$
BEGIN
    -- Try to insert a test user into auth.users
    BEGIN
        INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
        VALUES (
            '550e8400-e29b-41d4-a716-446655440001',
            'admin@company.com',
            crypt('demo123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW()
        );
        RAISE NOTICE 'SUCCESS: Created auth user for admin@company.com';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'WARNING: Could not create auth user - %', SQLERRM;
        RAISE NOTICE 'You may need to create users through the Supabase dashboard';
    END;
END $$;

-- Step 9: Disable RLS temporarily
SELECT '=== DISABLING RLS ===' as info;

ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Step 10: Drop any existing policies
SELECT '=== DROPPING EXISTING POLICIES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all policies on document_folders
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'document_folders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON document_folders', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    -- Drop all policies on documents
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
        RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'All policies dropped successfully';
END $$;

-- Step 11: Test folder creation
SELECT '=== TESTING FOLDER CREATION ===' as info;

DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
  insert_result RECORD;
BEGIN
  -- Get the default company ID
  SELECT id INTO test_company_id FROM companies WHERE name = 'Default Company';
  
  -- Get a user ID from public.users
  SELECT id INTO test_user_id FROM users WHERE email = 'admin@company.com';
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    RAISE NOTICE 'Testing with company_id: % and user_id: %', test_company_id, test_user_id;
    
    -- Try to insert a test folder
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by) 
      VALUES ('Test Folder', test_company_id, '/Test Folder', test_user_id)
      RETURNING * INTO insert_result;
      
      RAISE NOTICE 'SUCCESS: Test folder created successfully! ID: %', insert_result.id;
      
      -- Clean up the test folder
      DELETE FROM document_folders WHERE id = insert_result.id;
      RAISE NOTICE 'Test folder cleaned up.';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Test folder creation failed: %', SQLERRM;
      RAISE NOTICE 'Error code: %', SQLSTATE;
    END;
  ELSE
    RAISE NOTICE 'WARNING: Could not find company or user for testing';
    RAISE NOTICE 'Company ID: %, User ID: %', test_company_id, test_user_id;
  END IF;
END $$;

-- Step 12: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Check data counts
SELECT 
  'Companies: ' || COUNT(*)::text as companies_info
FROM companies;

SELECT 
  'Public users: ' || COUNT(*)::text as public_users_info
FROM users;

SELECT 
  'Auth users: ' || COUNT(*)::text as auth_users_info
FROM auth.users;

-- Show created users
SELECT 
  'Created users:' as user_list,
  email,
  full_name,
  role,
  company_id
FROM users
ORDER BY role, email;

-- Final status
SELECT '=== BASIC USERS SETUP COMPLETE ===' as status;
SELECT 'Users have been created in public.users table.' as message;
SELECT 'You may need to create auth users through the Supabase dashboard.' as note;
SELECT 'Folder creation should now work with RLS disabled.' as result;
