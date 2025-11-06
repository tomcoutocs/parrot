-- Fix RLS on users table for notification queries
-- Since you're using custom auth, RLS may be blocking user lookups for notifications
-- IMPORTANT: This targets public.users (your app table), NOT auth.users (Supabase auth table)

-- Option 1: Disable RLS completely (Recommended for Custom Auth)
-- Your application already handles authentication and authorization
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled, create a permissive policy for basic user info
-- Uncomment below and comment out Option 1 above if you prefer to keep RLS

/*
-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Public can view basic user info" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Allow reading basic user info (id, full_name, email, avatar_url) for notifications
-- This allows fetching user details needed for notifications without exposing sensitive data
CREATE POLICY "Public can view basic user info for notifications" ON users
  FOR SELECT USING (true)
  WITH (SELECT id, full_name, email, avatar_url);
*/

-- Verify RLS status (check both schemas - public and information_schema)
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users'
ORDER BY schemaname;

-- More accurate check - get RLS status directly from the table
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'users';

-- If you see duplicate rows, check if there are multiple users tables:
SELECT DISTINCT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE '%user%'
ORDER BY schemaname, tablename;

