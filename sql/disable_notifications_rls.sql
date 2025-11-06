-- Disable RLS for notifications table (Custom Auth)
-- Since you're using custom auth, RLS may interfere with notification creation
-- Run this if notifications aren't being created

ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'notifications';

