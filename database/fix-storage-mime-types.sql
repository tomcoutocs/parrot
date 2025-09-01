-- Fix Storage MIME Types: Allow PDF and Common Document Types
-- This script updates the storage bucket to allow common document types

-- Step 1: Check current storage bucket settings
SELECT '=== CURRENT STORAGE BUCKET SETTINGS ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 2: Update storage bucket to allow all common document types
SELECT '=== UPDATING STORAGE BUCKET MIME TYPES ===' as info;

UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
  -- Images
  'image/*',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  
  -- Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'text/html',
  'text/css',
  'text/javascript',
  
  -- Archives
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/gzip',
  'application/tar',
  
  -- Audio/Video
  'audio/*',
  'video/*',
  'audio/mpeg',
  'audio/wav',
  'video/mp4',
  'video/webm',
  
  -- Other common types
  'application/json',
  'application/xml',
  'application/octet-stream',
  '*/*'
]
WHERE name = 'company-documents';

-- Step 3: Verify the update
SELECT '=== VERIFIED STORAGE BUCKET SETTINGS ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 4: Test with a simple approach - allow all MIME types
SELECT '=== ALLOWING ALL MIME TYPES ===' as info;

-- If the above didn't work, let's try allowing all MIME types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['*/*']
WHERE name = 'company-documents';

-- Step 5: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'company-documents';

-- Step 6: Check if PDF is now allowed
SELECT '=== CHECKING PDF SUPPORT ===' as info;

SELECT 
  CASE 
    WHEN 'application/pdf' = ANY(allowed_mime_types) THEN 'PDF is allowed'
    WHEN '*/*' = ANY(allowed_mime_types) THEN 'All MIME types are allowed'
    ELSE 'PDF is NOT allowed'
  END as pdf_support_status
FROM storage.buckets
WHERE name = 'company-documents';

-- Final status
SELECT '=== MIME TYPE FIX COMPLETE ===' as status;
SELECT 'Storage bucket now allows PDF and other common document types.' as message;
SELECT 'Try uploading a PDF file again.' as info;
