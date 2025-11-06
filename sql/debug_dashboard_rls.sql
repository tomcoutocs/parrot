-- Debug script to check RLS policies and test access
-- Run this to diagnose why policies might be blocking

-- Check if policies exist
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
WHERE tablename IN ('space_dashboard_config', 'dashboard_notes', 'dashboard_links')
ORDER BY tablename, policyname;

-- Test what auth.uid() returns (should be run as the user)
SELECT auth.uid() as current_user_id;

-- Check if user exists and has admin role
-- Replace 'YOUR_USER_ID' with actual user ID
SELECT id, email, role, company_id 
FROM users 
WHERE id = auth.uid();

-- Test the policy condition directly
SELECT 
  auth.uid() as current_auth_uid,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'admin'
  ) as is_admin,
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND role = 'manager'
  ) as is_manager,
  (SELECT role FROM users WHERE id = auth.uid()) as user_role,
  (SELECT email FROM users WHERE id = auth.uid()) as user_email;

-- Check all admin users to see if auth.uid() matches any
SELECT id, email, role, 
  CASE WHEN id = auth.uid() THEN 'MATCHES auth.uid()' ELSE 'Does not match' END as match_status
FROM users 
WHERE role IN ('admin', 'manager')
ORDER BY role, email;

