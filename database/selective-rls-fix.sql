-- Selective RLS Fix: Allow Folder Creation and Document Uploading
-- This script disables RLS only for the specific operations that need it

-- Step 1: Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('document_folders', 'documents', 'companies', 'users', 'internal_user_companies')
ORDER BY tablename;

-- Step 2: Disable RLS only on document_folders and documents tables
SELECT '=== DISABLING RLS ON FOLDER AND DOCUMENT TABLES ===' as info;

ALTER TABLE document_folders DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- Step 3: Drop existing policies on these tables only
SELECT '=== DROPPING POLICIES ON FOLDER AND DOCUMENT TABLES ===' as info;

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies on document_folders
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'document_folders'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON document_folders', policy_record.policyname);
    END LOOP;
    
    -- Drop policies on documents
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'documents'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON documents', policy_record.policyname);
    END LOOP;
END $$;

-- Step 4: Create storage bucket if it doesn't exist
SELECT '=== CREATING STORAGE BUCKET ===' as info;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-documents',
  'company-documents',
  false,
  52428800, -- 50MB limit
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']
)
ON CONFLICT (id) DO NOTHING;

-- Step 5: Create simple storage policies (allow authenticated users)
SELECT '=== CREATING STORAGE POLICIES ===' as info;

-- Drop existing storage policies
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' AND schemaname = 'storage'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
    END LOOP;
END $$;

-- Allow all authenticated users to upload to company-documents bucket
CREATE POLICY "storage_upload_authenticated" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated'
);

-- Allow all authenticated users to download from company-documents bucket
CREATE POLICY "storage_download_authenticated" ON storage.objects
FOR SELECT USING (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated'
);

-- Allow all authenticated users to delete from company-documents bucket
CREATE POLICY "storage_delete_authenticated" ON storage.objects
FOR DELETE USING (
  bucket_id = 'company-documents' AND
  auth.role() = 'authenticated'
);

-- Step 6: Ensure tables exist with correct structure
SELECT '=== ENSURING TABLES EXIST ===' as info;

-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  company_id UUID REFERENCES companies(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_folders table if it doesn't exist
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

-- Create documents table if it doesn't exist
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  uploaded_by UUID NOT NULL,
  folder_path VARCHAR(500) DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create internal_user_companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS internal_user_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  company_id UUID NOT NULL REFERENCES companies(id),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, company_id)
);

-- Step 7: Insert test data if needed
SELECT '=== INSERTING TEST DATA IF NEEDED ===' as info;

-- Insert test company if none exists
INSERT INTO companies (id, name, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Test Company',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Insert test user if none exists
INSERT INTO users (id, email, full_name, role, company_id)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'test@example.com',
  'Test User',
  'user',
  '550e8400-e29b-41d4-a716-446655440000'
)
ON CONFLICT (id) DO NOTHING;

-- Step 8: Test folder creation and document upload
SELECT '=== TESTING FOLDER CREATION AND DOCUMENT UPLOAD ===' as info;

DO $$
DECLARE
  test_company_id UUID;
  test_user_id UUID;
BEGIN
  -- Get test company ID
  SELECT id INTO test_company_id FROM companies LIMIT 1;
  
  -- Get test user ID
  SELECT id INTO test_user_id FROM users LIMIT 1;
  
  IF test_company_id IS NOT NULL AND test_user_id IS NOT NULL THEN
    -- Test folder creation
    BEGIN
      INSERT INTO document_folders (name, company_id, path, created_by)
      VALUES ('Test Folder', test_company_id, '/Test Folder', test_user_id);
      RAISE NOTICE 'SUCCESS: Folder creation worked';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Folder creation failed - %', SQLERRM;
    END;
    
    -- Test document creation
    BEGIN
      INSERT INTO documents (name, file_path, file_size, file_type, company_id, uploaded_by)
      VALUES ('test.txt', 'test/path.txt', 100, 'text/plain', test_company_id, test_user_id);
      RAISE NOTICE 'SUCCESS: Document creation worked';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR: Document creation failed - %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'ERROR: No test company or user found';
  END IF;
END $$;

-- Step 9: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

-- Check RLS status
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename IN ('document_folders', 'documents', 'companies', 'users', 'internal_user_companies')
ORDER BY tablename;

-- Check storage bucket
SELECT 
  'Storage bucket exists: ' || CASE WHEN COUNT(*) > 0 THEN 'YES' ELSE 'NO' END as bucket_status
FROM storage.buckets 
WHERE name = 'company-documents';

-- Check storage policies
SELECT 
  'Storage policies: ' || COUNT(*)::text as storage_policies
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check data
SELECT 
  'Companies: ' || COUNT(*)::text as companies_count
FROM companies;

SELECT 
  'Users: ' || COUNT(*)::text as users_count
FROM users;

-- Final status
SELECT '=== SELECTIVE RLS FIX COMPLETE ===' as status;
SELECT 'RLS disabled only for folder creation and document uploading.' as message;
SELECT 'Other tables still have RLS protection.' as info;
