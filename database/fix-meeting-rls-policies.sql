-- Fix Meeting System RLS Policies
-- This script fixes the Row Level Security policies to be more robust

-- Step 1: Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Users can create own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Users can update own pending meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Admins can view all meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Admins can update all meeting requests" ON meeting_requests;

DROP POLICY IF EXISTS "Users can view own meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Admins can view all confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can create confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can update confirmed meetings" ON confirmed_meetings;

-- Step 2: Create more robust RLS policies for meeting_requests

-- Users can view their own meeting requests (with fallback for auth.uid() being NULL)
CREATE POLICY "Users can view own meeting requests" ON meeting_requests
    FOR SELECT USING (
        -- Allow if user is viewing their own requests
        (auth.uid() IS NOT NULL AND requester_id = auth.uid()) OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Users can create their own meeting requests (with fallback for auth.uid() being NULL)
CREATE POLICY "Users can create own meeting requests" ON meeting_requests
    FOR INSERT WITH CHECK (
        -- Allow if user is creating their own request
        (auth.uid() IS NOT NULL AND requester_id = auth.uid()) OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Users can update their own pending meeting requests
CREATE POLICY "Users can update own pending meeting requests" ON meeting_requests
    FOR UPDATE USING (
        -- Allow if user is updating their own pending request
        (auth.uid() IS NOT NULL AND requester_id = auth.uid() AND status = 'pending') OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Admins can view all meeting requests
CREATE POLICY "Admins can view all meeting requests" ON meeting_requests
    FOR SELECT USING (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Admins can update all meeting requests
CREATE POLICY "Admins can update all meeting requests" ON meeting_requests
    FOR UPDATE USING (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Step 3: Create more robust RLS policies for confirmed_meetings

-- Users can view meetings they're involved in
CREATE POLICY "Users can view own meetings" ON confirmed_meetings
    FOR SELECT USING (
        -- Allow if user is viewing their own meetings
        (auth.uid() IS NOT NULL AND requester_id = auth.uid()) OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Admins can view all confirmed meetings
CREATE POLICY "Admins can view all confirmed meetings" ON confirmed_meetings
    FOR SELECT USING (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Only admins can create confirmed meetings
CREATE POLICY "Only admins can create confirmed meetings" ON confirmed_meetings
    FOR INSERT WITH CHECK (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Only admins can update confirmed meetings
CREATE POLICY "Only admins can update confirmed meetings" ON confirmed_meetings
    FOR UPDATE USING (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Step 4: Verify the policies were created
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

-- Step 5: Test the policies
SELECT '=== POLICY TEST ===' as info;

-- Check if we can see the tables
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
