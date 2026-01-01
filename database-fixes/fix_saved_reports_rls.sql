-- Fix RLS policy for saved_reports table
-- This disables RLS since the application handles user filtering

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own saved reports" ON saved_reports;
DROP POLICY IF EXISTS "Users can create their own saved reports" ON saved_reports;
DROP POLICY IF EXISTS "Users can update their own saved reports" ON saved_reports;
DROP POLICY IF EXISTS "Users can delete their own saved reports" ON saved_reports;

-- Disable RLS
ALTER TABLE saved_reports DISABLE ROW LEVEL SECURITY;

