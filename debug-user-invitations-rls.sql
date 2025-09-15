-- Comprehensive Fix for User Invitations RLS Issue
-- Run this in your Supabase SQL Editor

-- Step 1: Check if RLS is enabled and what policies exist
SELECT 'Current RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_invitations';

SELECT 'Current Policies:' as info;
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

-- Step 2: Check the current user context and role
SELECT 'Current Auth Context:' as info;
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.jwt() ->> 'role' as jwt_role;

-- Step 3: Check if the user_invitations table exists and its structure
SELECT 'Table Structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'user_invitations' 
ORDER BY ordinal_position;

-- Step 4: Temporarily disable RLS to test if that's the issue
ALTER TABLE user_invitations DISABLE ROW LEVEL SECURITY;

-- Step 5: Test insert to see if it works without RLS
-- (This will be commented out for safety)
-- INSERT INTO user_invitations (email, full_name, company_id, role, invited_by, invitation_token, status, expires_at, tab_permissions)
-- VALUES ('test@example.com', 'Test User', 'test-company-id', 'user', auth.uid(), 'test-token', 'pending', NOW() + INTERVAL '7 days', '{}');

-- Step 6: Re-enable RLS with a simple policy
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Step 7: Drop all existing policies
DROP POLICY IF EXISTS "Admins can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can view company invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can update company invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete company invitations" ON user_invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON user_invitations;
DROP POLICY IF EXISTS "Public can accept invitation" ON user_invitations;

-- Step 8: Create a simple, permissive policy for admins
CREATE POLICY "Allow all for admins" ON user_invitations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Step 9: Add a policy for public invitation acceptance
CREATE POLICY "Allow public invitation access" ON user_invitations
    FOR SELECT
    TO anon
    USING (status = 'pending' AND expires_at > NOW());

CREATE POLICY "Allow public invitation acceptance" ON user_invitations
    FOR UPDATE
    TO anon
    USING (status = 'pending' AND expires_at > NOW())
    WITH CHECK (status = 'accepted');

-- Step 10: Verify the new policies
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

-- Step 11: Test the policy by checking if current user is admin
SELECT 'Admin Check:' as info;
SELECT 
    u.id,
    u.email,
    u.role,
    u.company_id,
    CASE 
        WHEN u.role = 'admin' THEN 'IS ADMIN - Should have access'
        ELSE 'NOT ADMIN - No access'
    END as access_status
FROM users u
WHERE u.id = auth.uid();
