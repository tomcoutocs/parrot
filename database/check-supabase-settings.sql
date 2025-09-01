-- Check Supabase Storage Settings: Comprehensive Diagnostic
-- This script checks all possible storage configurations that might be causing MIME type issues

-- Step 1: Check all storage buckets and their configurations
SELECT '=== ALL STORAGE BUCKETS ===' as info;

SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at,
  updated_at
FROM storage.buckets
ORDER BY name;

-- Step 2: Check if there are any storage policies that might be restricting MIME types
SELECT '=== STORAGE POLICIES ===' as info;

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
WHERE tablename = 'objects' AND schemaname = 'storage'
ORDER BY policyname;

-- Step 3: Check if there are any RLS policies on storage.objects
SELECT '=== RLS STATUS ON STORAGE.OBJECTS ===' as info;

SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- Step 4: Check if there are any triggers on storage.objects that might be blocking uploads
SELECT '=== TRIGGERS ON STORAGE.OBJECTS ===' as info;

SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'objects' AND event_object_schema = 'storage';

-- Step 5: Check if there are any constraints on storage.objects
SELECT '=== CONSTRAINTS ON STORAGE.OBJECTS ===' as info;

SELECT 
  constraint_name,
  constraint_type,
  table_name
FROM information_schema.table_constraints 
WHERE table_schema = 'storage' AND table_name = 'objects';

-- Step 6: Check the storage.objects table structure
SELECT '=== STORAGE.OBJECTS TABLE STRUCTURE ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'storage' AND table_name = 'objects'
ORDER BY ordinal_position;

-- Step 7: Check if there are any Supabase-specific settings
SELECT '=== SUPABASE CONFIGURATION ===' as info;

-- Check if there are any custom functions that might be affecting storage
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'storage' 
  AND routine_name LIKE '%mime%' OR routine_name LIKE '%upload%'
ORDER BY routine_name;

-- Step 8: Test if we can insert a simple record into storage.objects
SELECT '=== TESTING STORAGE.OBJECTS INSERT ===' as info;

-- Try to insert a test record to see what happens
DO $$
DECLARE
    test_id uuid;
BEGIN
    test_id := gen_random_uuid();
    
    INSERT INTO storage.objects (
        id,
        bucket_id,
        name,
        owner,
        metadata
    ) VALUES (
        test_id,
        'documents',
        'test-file.txt',
        auth.uid(),
        '{"mimeType": "text/plain", "size": 100}'::jsonb
    );
    
    RAISE NOTICE 'SUCCESS: Test record inserted with ID: %', test_id;
    
    -- Clean up
    DELETE FROM storage.objects WHERE id = test_id;
    RAISE NOTICE 'SUCCESS: Test record cleaned up';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'ERROR: Could not insert test record: %', SQLERRM;
END $$;

-- Step 9: Check if there are any project-level restrictions
SELECT '=== PROJECT-LEVEL CHECKS ===' as info;

-- Check if there are any global settings that might affect storage
SELECT 
    'Current user role' as setting,
    current_user as value
UNION ALL
SELECT 
    'Current database' as setting,
    current_database() as value
UNION ALL
SELECT 
    'Current schema' as setting,
    current_schema as value
UNION ALL
SELECT 
    'RLS enabled globally' as setting,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND rowsecurity = true
    ) THEN 'YES' ELSE 'NO' END as value;

-- Step 10: Final recommendations
SELECT '=== RECOMMENDATIONS ===' as info;

SELECT 
  'If MIME type error persists, try these steps:' as recommendation
UNION ALL
SELECT '1. Go to Supabase Dashboard > Storage > Settings'
UNION ALL
SELECT '2. Check if there are any global MIME type restrictions'
UNION ALL
SELECT '3. Try creating a bucket through the dashboard instead of SQL'
UNION ALL
SELECT '4. Check if your Supabase plan has storage restrictions'
UNION ALL
SELECT '5. Try uploading a different file type (like .txt) to test'
UNION ALL
SELECT '6. Check browser console for additional error details';

-- Final status
SELECT '=== DIAGNOSTIC COMPLETE ===' as status;
SELECT 'Check the output above for any configuration issues.' as message;
SELECT 'If no obvious issues found, the problem may be in Supabase dashboard settings.' as info;
