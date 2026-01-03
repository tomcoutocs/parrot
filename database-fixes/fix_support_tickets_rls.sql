-- Fix RLS Policies for support_tickets
-- Allow all authenticated users to create support tickets
-- Users can view/manage their own tickets or tickets in their accessible spaces
-- System admins can view all tickets

-- Drop existing policies
DROP POLICY IF EXISTS "Users can manage their support tickets" ON support_tickets;
DROP POLICY IF EXISTS "temp_support_tickets_all" ON support_tickets;

-- Policy: All authenticated users can create support tickets
CREATE POLICY "All users can create support tickets" ON support_tickets
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Users can view their own tickets or tickets in their accessible spaces
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

-- Policy: Users can update their own tickets or tickets in their accessible spaces
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

-- Policy: Users can delete their own tickets (optional - you may want to restrict this)
-- System admins can delete all tickets
CREATE POLICY "Users can delete their support tickets" ON support_tickets
  FOR DELETE 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'system_admin'
    )
  );

-- Also update support_messages policies to ensure they work correctly
DROP POLICY IF EXISTS "Users can view messages for their tickets" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages for their tickets" ON support_messages;
DROP POLICY IF EXISTS "temp_support_messages_all" ON support_messages;

-- Policy: Users can view messages for tickets they can access
CREATE POLICY "Users can view messages for their tickets" ON support_messages
  FOR SELECT 
  USING (
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

-- Policy: Users can create messages for tickets they can access
CREATE POLICY "Users can create messages for their tickets" ON support_messages
  FOR INSERT 
  WITH CHECK (
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

-- Policy: Users can update messages for tickets they can access
CREATE POLICY "Users can update messages for their tickets" ON support_messages
  FOR UPDATE 
  USING (
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
  )
  WITH CHECK (
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

