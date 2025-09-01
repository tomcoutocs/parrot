-- Emergency: Disable RLS on Confirmed Meetings Table
-- This script completely disables RLS to get confirmed meetings working immediately

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
WHERE tablename = 'confirmed_meetings';

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
WHERE tablename = 'confirmed_meetings'
ORDER BY policyname;

-- Step 3: Drop ALL existing policies
SELECT '=== DROPPING ALL POLICIES ===' as info;

DROP POLICY IF EXISTS "Users can view own meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Admins can view all confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can create confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can update confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings operations" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings SELECT" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings INSERT" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings UPDATE" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings DELETE" ON confirmed_meetings;

-- Step 4: Disable RLS completely
SELECT '=== DISABLING RLS ===' as info;

ALTER TABLE confirmed_meetings DISABLE ROW LEVEL SECURITY;

-- Step 5: Verify RLS is disabled
SELECT '=== VERIFICATION ===' as info;

SELECT 
    tablename,
    rowsecurity,
    CASE 
        WHEN rowsecurity THEN 'ENABLED' 
        ELSE 'DISABLED' 
    END as rls_status
FROM pg_tables 
WHERE tablename = 'confirmed_meetings';

-- Step 6: Test access
SELECT '=== TESTING ACCESS ===' as info;

-- Test if we can see the table
DO $$
BEGIN
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

-- Step 7: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'RLS has been completely disabled on confirmed_meetings!' as message;
SELECT 'Anyone can now create, view, update, and delete confirmed meetings!' as next_step;
SELECT 'Test your confirmed meeting creation now!' as action;
SELECT '⚠️ WARNING: This removes ALL security restrictions. Re-enable RLS later for production!' as warning;
