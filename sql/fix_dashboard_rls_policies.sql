-- Fix RLS Policies for Dashboard Customization Tables
-- This script fixes the RLS policies to properly allow admins to bypass RLS
-- Run this if you're getting "new row violates row-level security policy" errors

-- Drop ALL existing policies first to avoid conflicts
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

-- Users can view dashboard config for their company
CREATE POLICY "Users can view dashboard config for their company" ON space_dashboard_config
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins bypass RLS completely (handles NULL auth.uid() case)
CREATE POLICY "Admins bypass RLS for dashboard config" ON space_dashboard_config
  FOR ALL USING (
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1))
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1))
  );

-- Managers can manage dashboard config
CREATE POLICY "Managers can manage dashboard config" ON space_dashboard_config
  FOR ALL USING (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- ============================================
-- DASHBOARD_NOTES POLICIES
-- ============================================

-- Users can view notes for their company
CREATE POLICY "Users can view notes for their company" ON dashboard_notes
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins bypass RLS completely
CREATE POLICY "Admins bypass RLS for notes" ON dashboard_notes
  FOR ALL USING (
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1))
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1))
  );

-- Managers can manage notes
CREATE POLICY "Managers can manage notes" ON dashboard_notes
  FOR ALL USING (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- ============================================
-- DASHBOARD_LINKS POLICIES
-- ============================================

-- Users can view links for their company
CREATE POLICY "Users can view links for their company" ON dashboard_links
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins bypass RLS completely
CREATE POLICY "Admins bypass RLS for links" ON dashboard_links
  FOR ALL USING (
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1))
  )
  WITH CHECK (
    (auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
    OR (auth.uid() IS NULL AND EXISTS (SELECT 1 FROM users WHERE role = 'admin' LIMIT 1))
  );

-- Managers can manage links
CREATE POLICY "Managers can manage links" ON dashboard_links
  FOR ALL USING (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

