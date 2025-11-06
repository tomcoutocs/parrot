-- Secure Fix for RLS Policies
-- This version requires proper authentication but handles edge cases better

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view dashboard config for their company" ON space_dashboard_config;
DROP POLICY IF EXISTS "Admins and managers can update dashboard config" ON space_dashboard_config;
DROP POLICY IF EXISTS "Admins bypass RLS for dashboard config" ON space_dashboard_config;
DROP POLICY IF EXISTS "Managers can manage dashboard config" ON space_dashboard_config;

DROP POLICY IF EXISTS "Users can view notes for their company" ON dashboard_notes;
DROP POLICY IF EXISTS "Admins and managers can manage notes" ON dashboard_notes;
DROP POLICY IF EXISTS "Admins bypass RLS for notes" ON dashboard_notes;
DROP POLICY IF EXISTS "Managers can manage notes" ON dashboard_notes;

DROP POLICY IF EXISTS "Users can view links for their company" ON dashboard_links;
DROP POLICY IF EXISTS "Admins and managers can manage links" ON dashboard_links;
DROP POLICY IF EXISTS "Admins bypass RLS for links" ON dashboard_links;
DROP POLICY IF EXISTS "Managers can manage links" ON dashboard_links;

-- ============================================
-- SPACE_DASHBOARD_CONFIG POLICIES
-- ============================================

-- SELECT: Users can view dashboard config for their company or admins can view all
CREATE POLICY "Users can view dashboard config for their company" ON space_dashboard_config
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT/UPDATE/DELETE: Admins can do everything
CREATE POLICY "Admins bypass RLS for dashboard config" ON space_dashboard_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- INSERT/UPDATE/DELETE: Managers can manage config
CREATE POLICY "Managers can manage dashboard config" ON space_dashboard_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- ============================================
-- DASHBOARD_NOTES POLICIES
-- ============================================

CREATE POLICY "Users can view notes for their company" ON dashboard_notes
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins bypass RLS for notes" ON dashboard_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers can manage notes" ON dashboard_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- ============================================
-- DASHBOARD_LINKS POLICIES
-- ============================================

CREATE POLICY "Users can view links for their company" ON dashboard_links
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins bypass RLS for links" ON dashboard_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Managers can manage links" ON dashboard_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

