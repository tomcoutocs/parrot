-- Simple fix for support_tickets RLS policy
-- This ensures all authenticated users can create support tickets

-- Drop ALL existing policies on support_tickets to start fresh
DROP POLICY IF EXISTS "Users can manage their support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view their support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can update their support tickets" ON support_tickets;
DROP POLICY IF EXISTS "All authenticated users can create support tickets" ON support_tickets;
DROP POLICY IF EXISTS "All users can create support tickets" ON support_tickets;
DROP POLICY IF EXISTS "temp_support_tickets_all" ON support_tickets;

-- Create a simple INSERT policy that allows any authenticated user to create tickets
CREATE POLICY "All authenticated users can create support tickets" ON support_tickets
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create SELECT policy for users to view their own tickets or tickets in their spaces
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

-- Create UPDATE policy
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

