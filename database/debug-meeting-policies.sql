-- Debug Meeting System RLS Policies
-- This script temporarily disables RLS to help diagnose issues
-- WARNING: Only use this for debugging, not in production!

-- Step 1: Check current RLS status
SELECT '=== CURRENT RLS STATUS ===' as info;

SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('meeting_requests', 'confirmed_meetings');

-- Step 2: Check current policies
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

-- Step 3: Temporarily disable RLS for debugging
SELECT '=== TEMPORARILY DISABLING RLS ===' as info;

ALTER TABLE meeting_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE confirmed_meetings DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is disabled
SELECT '=== RLS STATUS AFTER DISABLE ===' as info;

SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('meeting_requests', 'confirmed_meetings');

-- Step 5: Test basic access
SELECT '=== TESTING BASIC ACCESS ===' as info;

-- Try to insert a test record
DO $$
BEGIN
    -- This will test if we can insert without RLS
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
        'Test Meeting',
        'This is a test meeting for debugging'
    );
    
    RAISE NOTICE 'Test insert successful - RLS is not blocking';
    
    -- Clean up the test record
    DELETE FROM meeting_requests WHERE meeting_title = 'Test Meeting';
    RAISE NOTICE 'Test record cleaned up';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Test insert failed: %', SQLERRM;
END $$;

-- Step 6: Instructions for re-enabling RLS
SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Test your meeting request submission now' as step;
SELECT '2. If it works, the issue was with RLS policies' as step;
SELECT '3. Run the fix-meeting-rls-policies.sql script' as step;
SELECT '4. Re-enable RLS with: ALTER TABLE meeting_requests ENABLE ROW LEVEL SECURITY;' as step;
SELECT '5. Re-enable RLS with: ALTER TABLE confirmed_meetings ENABLE ROW LEVEL SECURITY;' as step;
