-- Debug and fix for support_tickets RLS policy
-- This creates very permissive policies to ensure tickets can be created

-- First, let's see what policies exist
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies 
-- WHERE tablename = 'support_tickets';

-- Drop ALL existing policies on support_tickets
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'support_tickets'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON support_tickets', r.policyname);
    END LOOP;
END $$;

-- Create a very permissive INSERT policy - any authenticated user can create tickets
CREATE POLICY "Allow all authenticated users to create tickets" ON support_tickets
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create SELECT policy - users can see their own tickets, system admins see all
CREATE POLICY "Allow users to view tickets" ON support_tickets
  FOR SELECT 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('system_admin', 'admin', 'internal')
    )
    OR space_id IN (
      SELECT space_id FROM get_user_accessible_spaces(auth.uid())
    )
  );

-- Create UPDATE policy - users can update their own tickets, system admins can update all
CREATE POLICY "Allow users to update tickets" ON support_tickets
  FOR UPDATE 
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('system_admin', 'admin', 'internal')
    )
    OR space_id IN (
      SELECT space_id FROM get_user_accessible_spaces(auth.uid())
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('system_admin', 'admin', 'internal')
    )
    OR space_id IN (
      SELECT space_id FROM get_user_accessible_spaces(auth.uid())
    )
  );

-- Verify policies were created
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'support_tickets';

