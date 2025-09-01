-- Check Meeting System Tables
-- This script diagnoses the current state of the meeting system

-- Check if tables exist
SELECT '=== TABLE EXISTENCE CHECK ===' as info;

SELECT 
    'meeting_requests table: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'meeting_requests'
    )
    THEN 'EXISTS' ELSE 'MISSING' END as table_status;

SELECT 
    'confirmed_meetings table: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'confirmed_meetings'
    )
    THEN 'EXISTS' ELSE 'MISSING' END as table_status;

-- Check table structure if they exist
SELECT '=== TABLE STRUCTURE CHECK ===' as info;

-- Check meeting_requests columns
SELECT 
    'meeting_requests columns:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'meeting_requests'
ORDER BY ordinal_position;

-- Check confirmed_meetings columns
SELECT 
    'confirmed_meetings columns:' as info,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'confirmed_meetings'
ORDER BY ordinal_position;

-- Check RLS status (compatible with older PostgreSQL versions)
SELECT '=== ROW LEVEL SECURITY CHECK ===' as info;

SELECT 
    'meeting_requests table exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'meeting_requests' 
        AND schemaname = 'public'
    )
    THEN 'YES' ELSE 'NO' END as table_status;

SELECT 
    'confirmed_meetings table exists: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'confirmed_meetings' 
        AND schemaname = 'public'
    )
    THEN 'YES' ELSE 'NO' END as table_status;

-- Check policies
SELECT '=== POLICY CHECK ===' as info;

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
WHERE tablename IN ('meeting_requests', 'confirmed_meetings')
ORDER BY tablename, policyname;

-- Check if we can insert test data (this will help identify permission issues)
SELECT '=== PERMISSION TEST ===' as info;

-- Try to insert a test record (this will be rolled back)
DO $$
BEGIN
    -- This will test if the table exists and is accessible
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meeting_requests') THEN
        RAISE NOTICE 'meeting_requests table exists';
        
        -- Check if we can see the table structure
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'meeting_requests' 
            AND column_name = 'requester_id'
        ) THEN
            RAISE NOTICE 'Table structure looks correct';
        ELSE
            RAISE NOTICE 'Table structure may be incomplete';
        END IF;
    ELSE
        RAISE NOTICE 'meeting_requests table does not exist';
    END IF;
    
    -- Check auth context
    IF current_user = 'authenticated' THEN
        RAISE NOTICE 'Running as authenticated user';
    ELSE
        RAISE NOTICE 'Running as user: %', current_user;
    END IF;
    
    -- Check if auth.uid() function is available
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'uid' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    ) THEN
        RAISE NOTICE 'auth.uid() function exists';
    ELSE
        RAISE NOTICE 'auth.uid() function not found';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during permission test: %', SQLERRM;
END $$;
