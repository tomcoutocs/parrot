-- Comprehensive Meeting System Debug Script
-- This script will help identify the root cause of RLS issues

-- Step 1: Check basic table existence and structure
SELECT '=== BASIC TABLE CHECK ===' as info;

SELECT 
    table_name,
    table_type,
    is_insertable_into,
    is_updatable
FROM information_schema.tables 
WHERE table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY table_name;

-- Step 2: Check RLS status
SELECT '=== RLS STATUS CHECK ===' as info;

SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'ENABLED' 
        ELSE 'DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE tablename IN ('meeting_requests', 'confirmed_meetings')
ORDER BY tablename;

-- Step 3: Check current policies
SELECT '=== CURRENT POLICIES ===' as info;

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

-- Step 4: Check if we can see the tables as current user
SELECT '=== CURRENT USER ACCESS ===' as info;

SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role;

-- Step 5: Test basic table access
SELECT '=== TABLE ACCESS TEST ===' as info;

-- Try to select from meeting_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM meeting_requests LIMIT 1) THEN
        RAISE NOTICE 'meeting_requests: SELECT works';
    ELSE
        RAISE NOTICE 'meeting_requests: SELECT works (no rows)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'meeting_requests: SELECT failed - %', SQLERRM;
END $$;

-- Try to select from confirmed_meetings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM confirmed_meetings LIMIT 1) THEN
        RAISE NOTICE 'confirmed_meetings: SELECT works';
    ELSE
        RAISE NOTICE 'confirmed_meetings: SELECT works (no rows)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'confirmed_meetings: SELECT failed - %', SQLERRM;
END $$;

-- Step 6: Check auth.uid() function
SELECT '=== AUTH.UID() FUNCTION CHECK ===' as info;

-- Check if auth.uid() function exists
SELECT 
    'auth.uid() function: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'uid' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    )
    THEN 'EXISTS' ELSE 'MISSING' END as function_status;

-- Step 7: Test auth.uid() in current context
SELECT '=== AUTH.UID() TEST ===' as info;

DO $$
DECLARE
    uid_result uuid;
BEGIN
    SELECT auth.uid() INTO uid_result;
    IF uid_result IS NULL THEN
        RAISE NOTICE 'auth.uid() returns: NULL';
    ELSE
        RAISE NOTICE 'auth.uid() returns: %', uid_result;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'auth.uid() error: %', SQLERRM;
END $$;

-- Step 8: Check if we're in an authenticated context
SELECT '=== AUTHENTICATION CONTEXT ===' as info;

-- Check if we can access auth.users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM auth.users LIMIT 1) THEN
        RAISE NOTICE 'auth.users: Accessible';
    ELSE
        RAISE NOTICE 'auth.users: Not accessible or empty';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'auth.users: Access failed - %', SQLERRM;
END $$;

-- Step 9: Test a simple insert with explicit values
SELECT '=== INSERT TEST ===' as info;

DO $$
BEGIN
    -- Try to insert a test record
    INSERT INTO meeting_requests (
        requester_id,
        requested_date,
        requested_time_slot,
        meeting_title,
        meeting_description
    ) VALUES (
        '00000000-0000-0000-0000-000000000000', -- dummy UUID
        '2024-01-01',
        '9:00 AM',
        'Debug Test Meeting',
        'This is a debug test'
    );
    
    RAISE NOTICE 'Test insert: SUCCESS';
    
    -- Clean up
    DELETE FROM meeting_requests WHERE meeting_title = 'Debug Test Meeting';
    RAISE NOTICE 'Test record: CLEANED UP';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert: FAILED - %', SQLERRM;
        RAISE NOTICE 'Error code: %', SQLSTATE;
END $$;

-- Step 10: Check for any triggers or constraints
SELECT '=== TRIGGERS AND CONSTRAINTS ===' as info;

SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table IN ('meeting_requests', 'confirmed_meetings')
ORDER BY event_object_table, trigger_name;

SELECT 
    constraint_name,
    constraint_type,
    table_name
FROM information_schema.table_constraints 
WHERE table_name IN ('meeting_requests', 'confirmed_meetings')
ORDER BY table_name, constraint_type;
