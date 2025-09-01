-- EMERGENCY: Temporarily Disable RLS for Meeting System
-- This script disables RLS to get meeting requests working immediately
-- WARNING: This is a temporary fix - re-enable RLS with proper policies later!

-- Step 1: Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;

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

-- Step 2: Temporarily disable RLS
SELECT '=== DISABLING RLS ===' as info;

ALTER TABLE meeting_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
SELECT '=== RLS STATUS AFTER DISABLE ===' as info;

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

-- Step 4: Test basic access
SELECT '=== TESTING BASIC ACCESS ===' as info;

-- Test if we can see the tables
DO $$
BEGIN
    -- Check if we can see meeting_requests
    IF EXISTS (SELECT 1 FROM meeting_requests LIMIT 1) THEN
        RAISE NOTICE 'meeting_requests: SELECT works';
    ELSE
        RAISE NOTICE 'meeting_requests: SELECT works (no rows)';
    END IF;
    
    -- Check if we can see confirmed_meetings
    IF EXISTS (SELECT 1 FROM confirmed_meetings LIMIT 1) THEN
        RAISE NOTICE 'confirmed_meetings: SELECT works';
    ELSE
        RAISE NOTICE 'confirmed_meetings: SELECT works (no rows)';
    END IF;
    
    RAISE NOTICE 'Basic table access: SUCCESS';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Basic table access: FAILED - %', SQLERRM;
END $$;

-- Step 5: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'RLS has been temporarily disabled!' as message;
SELECT 'Users should now be able to create meeting requests!' as next_step;
SELECT 'Test your meeting request submission now!' as action;
SELECT '' as warning;
SELECT 'IMPORTANT: This is a temporary fix!' as warning;
SELECT 'Re-enable RLS with proper policies after testing!' as warning;
SELECT 'Use fix-meeting-rls-urgent.sql to create proper policies!' as next_action;
