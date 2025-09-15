-- Alternative Fix: Create a Simple RLS Policy Without RPC Dependencies
-- Run this in your Supabase SQL Editor

-- This approach doesn't rely on the set_user_context RPC function
-- which might be causing the RLS context issues

-- Step 1: Check current status
SELECT 'Current RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_invitations';

-- Step 2: Drop all existing policies
DROP POLICY IF EXISTS "Allow all for admins" ON user_invitations;
DROP POLICY IF EXISTS "Allow public invitation access" ON user_invitations;
DROP POLICY IF EXISTS "Allow public invitation acceptance" ON user_invitations;
DROP POLICY IF EXISTS "Admins can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can view company invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can update company invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete company invitations" ON user_invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON user_invitations;
DROP POLICY IF EXISTS "Public can accept invitation" ON user_invitations;

-- Step 3: Create a very simple policy that allows authenticated users to do everything
-- This is temporary and should be made more restrictive later
CREATE POLICY "Allow all authenticated users" ON user_invitations
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Step 4: Add public access for invitation acceptance
CREATE POLICY "Allow public invitation access" ON user_invitations
    FOR SELECT
    TO anon
    USING (status = 'pending' AND expires_at > NOW());

CREATE POLICY "Allow public invitation acceptance" ON user_invitations
    FOR UPDATE
    TO anon
    USING (status = 'pending' AND expires_at > NOW())
    WITH CHECK (status = 'accepted');

-- Step 5: Verify policies
SELECT 'New Policies:' as info;
SELECT 
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'user_invitations'
ORDER BY policyname;

-- Step 6: Test message
SELECT 'Simple RLS policy created. All authenticated users can now manage invitations.' as result;
