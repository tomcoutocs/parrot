-- Fix RLS Policies for Custom Authentication Setup
-- Since you're using custom auth, auth.uid() won't work
-- This solution disables RLS for dashboard tables since you handle auth in application layer

-- Option 1: Disable RLS completely (recommended for custom auth)
-- Your application already handles authentication and authorization
ALTER TABLE space_dashboard_config DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_notes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_links DISABLE ROW LEVEL SECURITY;

-- Option 2: If you want to keep RLS enabled but allow admins
-- Uncomment below and comment out Option 1 above

/*
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view dashboard config for their company" ON space_dashboard_config;
DROP POLICY IF EXISTS "Admins bypass RLS for dashboard config" ON space_dashboard_config;
DROP POLICY IF EXISTS "Managers can manage dashboard config" ON space_dashboard_config;

DROP POLICY IF EXISTS "Users can view notes for their company" ON dashboard_notes;
DROP POLICY IF EXISTS "Admins bypass RLS for notes" ON dashboard_notes;
DROP POLICY IF EXISTS "Managers can manage notes" ON dashboard_notes;

DROP POLICY IF EXISTS "Users can view links for their company" ON dashboard_links;
DROP POLICY IF EXISTS "Admins bypass RLS for links" ON dashboard_links;
DROP POLICY IF EXISTS "Managers can manage links" ON dashboard_links;

-- Allow all authenticated users (since custom auth handles permissions)
-- Your application code already checks for admin/manager roles
CREATE POLICY "Allow all authenticated operations for dashboard config" ON space_dashboard_config
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated operations for notes" ON dashboard_notes
  FOR ALL USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow all authenticated operations for links" ON dashboard_links
  FOR ALL USING (true)
  WITH CHECK (true);
*/

