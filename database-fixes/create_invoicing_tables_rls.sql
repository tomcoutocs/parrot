-- RLS Policies for Invoicing Tables
-- Run this after create_invoicing_tables.sql
-- These policies use only space_id (after migration) and handle both spaces/companies tables

-- Drop existing policies if they exist (for re-running)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename IN ('invoices', 'invoice_line_items', 'clients', 'payments', 'expenses', 'ai_bookkeeping_queries', 'support_tickets', 'support_messages', 'account_recovery_codes', 'login_audit_log')
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- Helper function to get user's accessible space IDs
-- This handles both spaces and companies tables, and internal_user_companies
CREATE OR REPLACE FUNCTION get_user_accessible_spaces(user_id UUID)
RETURNS TABLE(space_id UUID) AS $$
BEGIN
    RETURN QUERY
    -- From internal_user_companies (for internal users)
    SELECT iuc.space_id
    FROM internal_user_companies iuc
    WHERE iuc.user_id = get_user_accessible_spaces.user_id
    AND iuc.space_id IS NOT NULL
    
    UNION
    
    -- From users table (for regular users)
    SELECT u.space_id
    FROM users u
    WHERE u.id = get_user_accessible_spaces.user_id
    AND u.space_id IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for invoices
CREATE POLICY "Users can view invoices in their space" ON invoices
  FOR SELECT USING (
    created_by = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

CREATE POLICY "Users can create invoices in their space" ON invoices
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

CREATE POLICY "Users can update invoices in their space" ON invoices
  FOR UPDATE USING (
    created_by = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

CREATE POLICY "Users can delete invoices in their space" ON invoices
  FOR DELETE USING (
    created_by = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

-- RLS Policies for invoice_line_items
CREATE POLICY "Users can manage line items for their invoices" ON invoice_line_items
  FOR ALL USING (
    invoice_id IN (
      SELECT id FROM invoices 
      WHERE created_by = auth.uid()
      OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
    )
  );

-- RLS Policies for clients
CREATE POLICY "Users can manage clients in their space" ON clients
  FOR ALL USING (
    space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

-- RLS Policies for payments
CREATE POLICY "Users can manage payments in their space" ON payments
  FOR ALL USING (
    space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

-- RLS Policies for expenses
CREATE POLICY "Users can manage expenses in their space" ON expenses
  FOR ALL USING (
    created_by = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

-- RLS Policies for ai_bookkeeping_queries
CREATE POLICY "Users can manage their AI queries" ON ai_bookkeeping_queries
  FOR SELECT USING (
    user_id = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

CREATE POLICY "Users can create AI queries" ON ai_bookkeeping_queries
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
  );

-- RLS Policies for support_tickets
-- All authenticated users can create support tickets
CREATE POLICY "All users can create support tickets" ON support_tickets
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Users can view their own tickets or tickets in their accessible spaces
-- System admins can view all tickets
CREATE POLICY "Users can view their support tickets" ON support_tickets
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'system_admin'
    )
  );

-- Users can update their own tickets or tickets in their accessible spaces
-- System admins can update all tickets
CREATE POLICY "Users can update their support tickets" ON support_tickets
  FOR UPDATE 
  USING (
    user_id = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'system_admin'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'system_admin'
    )
  );

-- RLS Policies for support_messages
CREATE POLICY "Users can view messages for their tickets" ON support_messages
  FOR SELECT USING (
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE user_id = auth.uid()
      OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'system_admin'
      )
    )
  );

CREATE POLICY "Users can create messages for their tickets" ON support_messages
  FOR INSERT WITH CHECK (
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE user_id = auth.uid()
      OR space_id IN (SELECT space_id FROM get_user_accessible_spaces(auth.uid()))
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() 
        AND role = 'system_admin'
      )
    )
  );

-- RLS Policies for account_recovery_codes
CREATE POLICY "Users can manage their recovery codes" ON account_recovery_codes
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for login_audit_log
CREATE POLICY "Users can view their login history" ON login_audit_log
  FOR SELECT USING (user_id = auth.uid());

