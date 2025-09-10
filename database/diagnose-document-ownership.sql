-- Document Ownership Diagnostic Script
-- This script helps identify why documents are being assigned to "tom" instead of the actual creator

-- Step 1: Check all users in the database
SELECT '=== ALL USERS IN DATABASE ===' as info;

SELECT 
  id,
  email,
  full_name,
  role,
  company_id,
  is_active,
  created_at
FROM users
ORDER BY created_at DESC;

-- Step 2: Check recent documents and their owners
SELECT '=== RECENT DOCUMENTS AND OWNERS ===' as info;

SELECT 
  d.id,
  d.name,
  d.file_path,
  d.company_id,
  d.uploaded_by,
  d.created_at,
  u.full_name as uploaded_by_name,
  u.email as uploaded_by_email,
  c.name as company_name
FROM documents d
LEFT JOIN users u ON d.uploaded_by = u.id
LEFT JOIN companies c ON d.company_id = c.id
ORDER BY d.created_at DESC
LIMIT 10;

-- Step 3: Check if there's a user named "tom" or similar
SELECT '=== SEARCHING FOR "TOM" USER ===' as info;

SELECT 
  id,
  email,
  full_name,
  role,
  company_id
FROM users
WHERE LOWER(full_name) LIKE '%tom%' 
   OR LOWER(email) LIKE '%tom%'
   OR LOWER(full_name) LIKE '%thomas%';

-- Step 4: Check document upload patterns
SELECT '=== DOCUMENT UPLOAD PATTERNS ===' as info;

SELECT 
  uploaded_by,
  COUNT(*) as document_count,
  u.full_name as uploader_name,
  u.email as uploader_email,
  MIN(d.created_at) as first_upload,
  MAX(d.created_at) as last_upload
FROM documents d
LEFT JOIN users u ON d.uploaded_by = u.id
GROUP BY uploaded_by, u.full_name, u.email
ORDER BY document_count DESC;

-- Step 5: Check for any default user assignments
SELECT '=== CHECKING FOR DEFAULT USER ASSIGNMENTS ===' as info;

-- Look for any hardcoded user IDs that might be used as defaults
SELECT 
  'Possible default user IDs:' as info,
  '550e8400-e29b-41d4-a716-446655440001' as admin_id,
  '550e8400-e29b-41d4-a716-446655440002' as manager_id,
  '550e8400-e29b-41d4-a716-446655440003' as user_id;

-- Check if any of these IDs exist in users table
SELECT 
  id,
  full_name,
  email,
  role
FROM users
WHERE id IN (
  '550e8400-e29b-41d4-a716-446655440001',
  '550e8400-e29b-41d4-a716-446655440002',
  '550e8400-e29b-41d4-a716-446655440003'
);

-- Step 6: Check session context function
SELECT '=== CHECKING SESSION CONTEXT ===' as info;

-- Check if the set_user_context function exists and what it does
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name = 'set_user_context'
  AND routine_schema = 'public';

-- Step 7: Check for any triggers on documents table
SELECT '=== CHECKING DOCUMENTS TABLE TRIGGERS ===' as info;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'documents';

-- Step 8: Check RLS policies on documents table
SELECT '=== CHECKING RLS POLICIES ON DOCUMENTS ===' as info;

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'documents';

-- Step 9: Final summary
SELECT '=== DIAGNOSTIC SUMMARY ===' as info;
SELECT 'Run this script to identify the document ownership issue.' as message1;
SELECT 'Look for any user named "tom" or check if documents are being assigned to wrong user IDs.' as message2;
SELECT 'Check the session context and RLS policies for any issues.' as message3;
