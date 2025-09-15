-- Fix RLS Policies for User Invitations Table
-- Run this in your Supabase SQL Editor

-- First, let's see what RLS policies currently exist on user_invitations table
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
WHERE tablename = 'user_invitations';

-- Drop existing policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can manage invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can insert invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can delete invitations" ON user_invitations;

-- Create new policies that allow admins to manage invitations
-- Policy 1: Admins can insert invitations
CREATE POLICY "Admins can insert invitations" ON user_invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy 2: Admins can view all invitations for their company
CREATE POLICY "Admins can view company invitations" ON user_invitations
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.company_id = user_invitations.company_id
        )
    );

-- Policy 3: Admins can update invitations for their company
CREATE POLICY "Admins can update company invitations" ON user_invitations
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.company_id = user_invitations.company_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.company_id = user_invitations.company_id
        )
    );

-- Policy 4: Admins can delete invitations for their company
CREATE POLICY "Admins can delete company invitations" ON user_invitations
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
            AND users.company_id = user_invitations.company_id
        )
    );

-- Policy 5: Allow public access for invitation acceptance (by token)
CREATE POLICY "Public can view invitation by token" ON user_invitations
    FOR SELECT
    TO anon
    USING (status = 'pending' AND expires_at > NOW());

-- Policy 6: Allow public to update invitation status when accepting
CREATE POLICY "Public can accept invitation" ON user_invitations
    FOR UPDATE
    TO anon
    USING (status = 'pending' AND expires_at > NOW())
    WITH CHECK (status = 'accepted');

-- Verify the policies were created
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

-- Test that RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_invitations';
