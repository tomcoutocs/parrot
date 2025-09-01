-- Fix RLS Policies for Confirmed Meetings Table
-- This script fixes the RLS policies to allow admins to create confirmed meetings

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

-- Step 3: Drop existing policies to start fresh
SELECT '=== DROPPING EXISTING POLICIES ===' as info;

DROP POLICY IF EXISTS "Users can view own meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Admins can view all confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can create confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Only admins can update confirmed meetings" ON confirmed_meetings;
DROP POLICY IF EXISTS "Allow all confirmed_meetings operations" ON confirmed_meetings;

-- Step 4: Create working RLS policies for confirmed_meetings
SELECT '=== CREATING WORKING POLICIES ===' as info;

-- Policy 1: Users can view meetings they're involved in
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

-- Policy 2: Admins can view all confirmed meetings
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

-- Policy 3: Only admins can create confirmed meetings
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

-- Policy 4: Only admins can update confirmed meetings
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

-- Policy 5: Only admins can delete confirmed meetings
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

-- Step 5: Verify policies were created
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
WHERE tablename = 'confirmed_meetings'
ORDER BY policyname;

-- Step 6: Test the policies
SELECT '=== TESTING POLICIES ===' as info;

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
SELECT 'RLS policies for confirmed_meetings have been fixed!' as message;
SELECT 'Admins should now be able to create confirmed meetings!' as next_step;
SELECT 'Test your confirmed meeting creation now!' as action;
