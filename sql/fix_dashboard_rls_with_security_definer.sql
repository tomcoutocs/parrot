-- Alternative Fix: Use Security Definer Functions to Bypass RLS
-- This approach uses functions that run with elevated privileges to bypass RLS checks
-- Use this if auth.uid() is not working properly with your custom auth setup

-- Create a helper function to check if user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION is_admin_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Create a helper function to check if user is manager
CREATE OR REPLACE FUNCTION is_manager_user(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = user_id AND role = 'manager'
  );
END;
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view dashboard config for their company" ON space_dashboard_config;
DROP POLICY IF EXISTS "Admins bypass RLS for dashboard config" ON space_dashboard_config;
DROP POLICY IF EXISTS "Managers can manage dashboard config" ON space_dashboard_config;

-- Recreate policies using the helper functions
-- Allow users to view config for their company
CREATE POLICY "Users can view dashboard config for their company" ON space_dashboard_config
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR is_admin_user(auth.uid())
  );

-- Admins bypass RLS completely
CREATE POLICY "Admins bypass RLS for dashboard config" ON space_dashboard_config
  FOR ALL USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

-- Managers can manage dashboard config
CREATE POLICY "Managers can manage dashboard config" ON space_dashboard_config
  FOR ALL USING (is_manager_user(auth.uid()))
  WITH CHECK (is_manager_user(auth.uid()));

-- Now update notes policies
DROP POLICY IF EXISTS "Users can view notes for their company" ON dashboard_notes;
DROP POLICY IF EXISTS "Admins bypass RLS for notes" ON dashboard_notes;
DROP POLICY IF EXISTS "Managers can manage notes" ON dashboard_notes;

CREATE POLICY "Users can view notes for their company" ON dashboard_notes
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR is_admin_user(auth.uid())
  );

CREATE POLICY "Admins bypass RLS for notes" ON dashboard_notes
  FOR ALL USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Managers can manage notes" ON dashboard_notes
  FOR ALL USING (is_manager_user(auth.uid()))
  WITH CHECK (is_manager_user(auth.uid()));

-- Now update links policies
DROP POLICY IF EXISTS "Users can view links for their company" ON dashboard_links;
DROP POLICY IF EXISTS "Admins bypass RLS for links" ON dashboard_links;
DROP POLICY IF EXISTS "Managers can manage links" ON dashboard_links;

CREATE POLICY "Users can view links for their company" ON dashboard_links
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR is_admin_user(auth.uid())
  );

CREATE POLICY "Admins bypass RLS for links" ON dashboard_links
  FOR ALL USING (is_admin_user(auth.uid()))
  WITH CHECK (is_admin_user(auth.uid()));

CREATE POLICY "Managers can manage links" ON dashboard_links
  FOR ALL USING (is_manager_user(auth.uid()))
  WITH CHECK (is_manager_user(auth.uid()));

