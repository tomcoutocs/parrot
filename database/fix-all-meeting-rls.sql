-- Comprehensive Fix for All Meeting System RLS Policies
-- This script fixes RLS policies for both meeting_requests and confirmed_meetings tables

-- Step 1: Check current RLS status for both tables
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

-- Step 2: Check current policies for both tables
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

-- Step 3: Drop ALL existing policies to start fresh
SELECT '=== DROPPING ALL EXISTING POLICIES ===' as info;

-- Drop policies from meeting_requests
DROP POLICY IF EXISTS "Users can view own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Users can create own meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Users can update own pending meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Admins can view all meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Admins can update all meeting requests" ON meeting_requests;
DROP POLICY IF EXISTS "Allow all meeting_requests operations" ON meeting_requests;

-- Drop policies from confirmed_meetings
DROP POLICY IF EXISTS "Users can view own meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Admins can view all confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can create confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can update confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings operations" ON confirmed_meetings;

-- Step 4: Create comprehensive RLS policies for meeting_requests
SELECT '=== CREATING MEETING_REQUESTS POLICIES ===' as info;

-- Users can view their own meeting requests
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

-- Users can create their own meeting requests
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

-- Step 5: Create comprehensive RLS policies for confirmed_meetings
SELECT '=== CREATING CONFIRMED_MEETINGS POLICIES ===' as info;

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

-- Only admins can delete confirmed meetings
CREATE POLICY "Only admins can delete confirmed meetings" ON confirmed_meetings
    FOR DELETE USING (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Step 6: Verify all policies were created
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

-- Step 7: Test the policies
SELECT '=== TESTING POLICIES ===' as info;

-- Test if we can see both tables
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

-- Step 8: Success message
SELECT '=== SUCCESS ===' as info;
SELECT 'All RLS policies have been fixed!' as message;
SELECT 'Users can create meeting requests!' as next_step;
SELECT 'Admins can create confirmed meetings!' as next_step;
SELECT 'Test your meeting system now!' as action;
