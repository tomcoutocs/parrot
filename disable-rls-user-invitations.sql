-- Quick Fix: Disable RLS for User Invitations Table
-- Run this in your Supabase SQL Editor

-- This will temporarily disable RLS on the user_invitations table
-- This allows admins to invite users without RLS restrictions
-- You can re-enable RLS later with proper policies

-- Check current RLS status
SELECT 'Before - RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_invitations';

-- Disable RLS
ALTER TABLE user_invitations DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 'After - RLS Status:' as info;
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'user_invitations';

-- Show any existing policies (they won't be enforced now)
SELECT 'Existing Policies (not enforced):' as info;
SELECT policyname, cmd, permissive, roles
FROM pg_policies 
WHERE tablename = 'user_invitations';

-- Test message
SELECT 'RLS disabled for user_invitations table. Admins can now invite users.' as result;
