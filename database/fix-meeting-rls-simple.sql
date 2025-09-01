-- Simple Meeting System RLS Fix
-- This script creates basic, working RLS policies

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "Users can view own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Users can create own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Users can update own pending meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Admins can view all meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Admins can update all meeting requests" ON meeting_requests;

DROP POLICY IF EXISTS "Users can view own meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Admins can view all confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can create confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can update confirmed meetings" ON confirmed_meetings;

-- Step 2: Create simple, permissive policies for testing
-- These policies are more permissive to get things working first

-- Allow all operations on meeting_requests (temporarily permissive)
CREATE POLICY "Allow all meeting_requests operations" ON meeting_requests
    FOR ALL USING (true)
    WITH CHECK (true);

-- Allow all operations on confirmed_meetings (temporarily permissive)
CREATE POLICY "Allow all confirmed_meetings operations" ON confirmed_meetings
    FOR ALL USING (true)
    WITH CHECK (true);

-- Step 3: Verify policies were created
SELECT '=== POLICY VERIFICATION ===' as info;

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

-- Step 4: Test basic access
SELECT '=== BASIC ACCESS TEST ===' as info;

-- Test if we can see the tables
SELECT 
    'meeting_requests accessible: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM meeting_requests LIMIT 1
    )
    THEN 'YES' ELSE 'NO' END as test_result;

SELECT 
    'confirmed_meetings accessible: ' ||
    CASE WHEN EXISTS (
        SELECT 1 FROM confirmed_meetings LIMIT 1
    )
    THEN 'YES' ELSE 'NO' END as test_result;

-- Step 5: Instructions for next steps
SELECT '=== NEXT STEPS ===' as info;
SELECT '1. Test your meeting request submission now' as step;
SELECT '2. If it works, we know the issue was RLS policies' as step;
SELECT '3. We can then create more restrictive policies' as step;
SELECT '4. These current policies are TEMPORARY and permissive' as step;
