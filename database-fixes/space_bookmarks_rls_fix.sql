-- Fix Row-Level Security (RLS) for space_bookmarks table
-- This script disables RLS to allow custom admin access checks in the application

-- Option 1: Disable RLS completely (ACTIVE - recommended)
-- This removes all row-level security from the table
-- Access control is now handled by custom admin checks in the application code
ALTER TABLE space_bookmarks DISABLE ROW LEVEL SECURITY;

-- Option 2: Drop existing RLS policies (if any exist)
-- Uncomment these lines if you want to remove specific policies instead
-- DROP POLICY IF EXISTS "space_bookmarks_select_policy" ON space_bookmarks;
-- DROP POLICY IF EXISTS "space_bookmarks_insert_policy" ON space_bookmarks;
-- DROP POLICY IF EXISTS "space_bookmarks_update_policy" ON space_bookmarks;
-- DROP POLICY IF EXISTS "space_bookmarks_delete_policy" ON space_bookmarks;

-- Verify RLS is disabled
-- Run this query to confirm: SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'space_bookmarks';
-- rowsecurity should be 'f' (false) after running this script

