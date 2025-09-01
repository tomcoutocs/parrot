-- Diagnose Meeting System RLS Issues
-- This script helps identify the exact problem with RLS policies

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

-- Step 4: Check current user context
SELECT '=== CURRENT USER CONTEXT ===' as info;

SELECT 
    current_user as current_user,
    session_user as session_user,
    current_setting('role') as current_role,
    current_setting('application_name') as app_name;

-- Step 5: Check auth context
SELECT '=== AUTH CONTEXT CHECK ===' as info;

-- Check if auth.uid() function exists and what it returns
DO $$
DECLARE
    auth_uid_result uuid;
BEGIN
    -- Check if auth.uid() function exists
    IF EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'uid' 
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
    ) THEN
        RAISE NOTICE 'auth.uid() function: EXISTS';
        
        -- Try to call auth.uid()
        BEGIN
            SELECT auth.uid() INTO auth_uid_result;
            IF auth_uid_result IS NOT NULL THEN
                RAISE NOTICE 'auth.uid() returns: %', auth_uid_result;
            ELSE
                RAISE NOTICE 'auth.uid() returns: NULL (no authenticated user)';
            END IF;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'auth.uid() call failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'auth.uid() function: NOT FOUND';
    END IF;
END $$;

-- Step 6: Test table access with current context
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

-- Step 7: Check if we can see the users table (for admin role checks)
SELECT '=== USERS TABLE ACCESS ===' as info;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users LIMIT 1) THEN
        RAISE NOTICE 'users table: SELECT works';
        
        -- Check if we can see user roles
        IF EXISTS (
            SELECT 1 FROM users 
            WHERE role = 'admin' 
            LIMIT 1
        ) THEN
            RAISE NOTICE 'users table: Can see admin users';
        ELSE
            RAISE NOTICE 'users table: Cannot see admin users';
        END IF;
    ELSE
        RAISE NOTICE 'users table: SELECT failed or no rows';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'users table: SELECT failed - %', SQLERRM;
END $$;

-- Step 8: Summary and recommendations
SELECT '=== DIAGNOSIS SUMMARY ===' as info;

SELECT 
    'RLS Status: ' ||
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename IN ('meeting_requests', 'confirmed_meetings')
            AND rowsecurity = true
        ) THEN 'ENABLED' 
        ELSE 'DISABLED' 
    END as rls_summary;

SELECT 
    'Policies Count: ' ||
    (SELECT COUNT(*) FROM pg_policies 
     WHERE tablename IN ('meeting_requests', 'confirmed_meetings')) as policies_summary;

SELECT 
    'Auth Context: ' ||
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc 
            WHERE proname = 'uid' 
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'auth')
        ) THEN 'auth.uid() available' 
        ELSE 'auth.uid() not available' 
    END as auth_summary;

-- Step 9: Recommendations
SELECT '=== RECOMMENDATIONS ===' as info;

SELECT 'If RLS is ENABLED and policies exist:' as recommendation;
SELECT '  - Check if auth.uid() returns the expected user ID' as detail;
SELECT '  - Verify the user has the correct role in the users table' as detail;
SELECT '  - Ensure policies allow the current user context' as detail;

SELECT 'If RLS is DISABLED:' as recommendation;
SELECT '  - RLS should be enabled with proper policies' as detail;
SELECT '  - Use fix-meeting-rls-urgent.sql to create policies' as detail;

SELECT 'If no policies exist:' as recommendation;
SELECT '  - Create policies using fix-meeting-rls-urgent.sql' as detail;
SELECT '  - Or temporarily disable RLS using disable-rls-emergency.sql' as detail;
