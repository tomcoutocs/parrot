-- Debug Document Storage Issue
-- This script helps identify why documents are not found in storage

-- Step 1: Check all documents and their file paths
SELECT '=== DOCUMENTS AND FILE PATHS ===' as info;

SELECT 
  id,
  name,
  file_path,
  file_size,
  file_type,
  company_id,
  uploaded_by,
  created_at
FROM documents
ORDER BY created_at DESC
LIMIT 10;

-- Step 2: Check if there are any documents with invalid file paths
SELECT '=== DOCUMENTS WITH POTENTIAL PATH ISSUES ===' as info;

SELECT 
  id,
  name,
  file_path,
  CASE 
    WHEN file_path IS NULL THEN 'NULL_PATH'
    WHEN file_path = '' THEN 'EMPTY_PATH'
    WHEN file_path NOT LIKE '%/%' THEN 'NO_SLASHES'
    WHEN file_path LIKE '//%' THEN 'DOUBLE_SLASH_START'
    WHEN file_path LIKE '%//%' THEN 'DOUBLE_SLASH_MIDDLE'
    WHEN file_path LIKE '%/' THEN 'TRAILING_SLASH'
    ELSE 'PATH_OK'
  END as path_status
FROM documents
WHERE file_path IS NULL 
   OR file_path = ''
   OR file_path NOT LIKE '%/%'
   OR file_path LIKE '//%'
   OR file_path LIKE '%//%'
   OR file_path LIKE '%/'
ORDER BY created_at DESC;

-- Step 3: Check storage bucket configuration
SELECT '=== STORAGE BUCKET CHECK ===' as info;

-- This will show if the documents bucket exists
SELECT 
  name,
  id,
  created_at,
  updated_at,
  public
FROM storage.buckets
WHERE name = 'documents';

-- Step 4: Check for any storage policies
SELECT '=== STORAGE POLICIES ===' as info;

SELECT 
  name,
  definition,
  check_expression
FROM storage.policies
WHERE bucket_id = 'documents';

-- Step 5: Sample file paths to test
SELECT '=== SAMPLE FILE PATHS FOR TESTING ===' as info;

SELECT 
  'Sample file paths from database:' as info,
  file_path,
  'Test this path in Supabase Storage' as instruction
FROM documents
WHERE file_path IS NOT NULL 
  AND file_path != ''
ORDER BY created_at DESC
LIMIT 5;

-- Step 6: Check for common path issues
SELECT '=== COMMON PATH ISSUES ===' as info;

-- Check for documents with company_id but no company folder
SELECT 
  d.id,
  d.name,
  d.file_path,
  d.company_id,
  c.name as company_name,
  CASE 
    WHEN d.file_path NOT LIKE d.company_id || '/%' THEN 'MISSING_COMPANY_FOLDER'
    ELSE 'COMPANY_FOLDER_OK'
  END as folder_status
FROM documents d
LEFT JOIN companies c ON d.company_id = c.id
WHERE d.file_path IS NOT NULL
ORDER BY d.created_at DESC
LIMIT 10;
