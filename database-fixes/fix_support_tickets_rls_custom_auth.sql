-- Fix RLS Policies for support_tickets with custom authentication
-- This uses current_setting('app.user_id') instead of auth.uid() since we use custom auth

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

-- Create INSERT policy - allow any user with app.user_id set to create tickets
CREATE POLICY "All authenticated users can create tickets" ON support_tickets
  FOR INSERT 
  WITH CHECK (
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
  );

-- Create SELECT policy - users can see their own tickets or tickets in their spaces
-- System admins can see all tickets
CREATE POLICY "Users can view their support tickets" ON support_tickets
  FOR SELECT 
  USING (
    user_id::text = current_setting('app.user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = current_setting('app.user_id', true)
      AND role IN ('system_admin', 'admin', 'internal')
    )
    OR space_id IN (
      SELECT space_id FROM get_user_accessible_spaces(
        current_setting('app.user_id', true)::uuid
      )
    )
  );

-- Create UPDATE policy - users can update their own tickets, system admins can update all
CREATE POLICY "Users can update their support tickets" ON support_tickets
  FOR UPDATE 
  USING (
    user_id::text = current_setting('app.user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = current_setting('app.user_id', true)
      AND role IN ('system_admin', 'admin', 'internal')
    )
    OR space_id IN (
      SELECT space_id FROM get_user_accessible_spaces(
        current_setting('app.user_id', true)::uuid
      )
    )
  )
  WITH CHECK (
    user_id::text = current_setting('app.user_id', true)
    OR EXISTS (
      SELECT 1 FROM users 
      WHERE id::text = current_setting('app.user_id', true)
      AND role IN ('system_admin', 'admin', 'internal')
    )
    OR space_id IN (
      SELECT space_id FROM get_user_accessible_spaces(
        current_setting('app.user_id', true)::uuid
      )
    )
  );

-- Also update support_messages policies
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'support_messages'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON support_messages', r.policyname);
    END LOOP;
END $$;

CREATE POLICY "Users can view messages for their tickets" ON support_messages
  FOR SELECT 
  USING (
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE user_id::text = current_setting('app.user_id', true)
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = current_setting('app.user_id', true)
        AND role IN ('system_admin', 'admin', 'internal')
      )
      OR space_id IN (
        SELECT space_id FROM get_user_accessible_spaces(
          current_setting('app.user_id', true)::uuid
        )
      )
    )
  );

CREATE POLICY "Users can create messages for their tickets" ON support_messages
  FOR INSERT 
  WITH CHECK (
    ticket_id IN (
      SELECT id FROM support_tickets 
      WHERE user_id::text = current_setting('app.user_id', true)
      OR EXISTS (
        SELECT 1 FROM users 
        WHERE id::text = current_setting('app.user_id', true)
        AND role IN ('system_admin', 'admin', 'internal')
      )
      OR space_id IN (
        SELECT space_id FROM get_user_accessible_spaces(
          current_setting('app.user_id', true)::uuid
        )
      )
    )
  );

