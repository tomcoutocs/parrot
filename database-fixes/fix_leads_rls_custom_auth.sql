-- Fix RLS Policies for leads table with custom authentication
-- This uses current_setting('app.user_id') instead of auth.uid() since we use custom auth

-- Drop existing policies on leads
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'leads'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON leads', r.policyname);
    END LOOP;
END $$;

-- Users can view leads they own, are assigned to, or leads in their space
CREATE POLICY "Users can view relevant leads"
  ON leads FOR SELECT
  USING (
    user_id::text = current_setting('app.user_id', true)
    OR assigned_to::text = current_setting('app.user_id', true)
    OR (space_id IS NOT NULL AND space_id = get_user_space_id(current_setting('app.user_id', true)::uuid))
  );

-- Users can create leads
CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  WITH CHECK (
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND user_id::text = current_setting('app.user_id', true)
  );

-- Users can update leads they own or are assigned to
CREATE POLICY "Users can update relevant leads"
  ON leads FOR UPDATE
  USING (
    user_id::text = current_setting('app.user_id', true)
    OR assigned_to::text = current_setting('app.user_id', true)
    OR (space_id IS NOT NULL AND space_id = get_user_space_id(current_setting('app.user_id', true)::uuid))
  )
  WITH CHECK (
    user_id::text = current_setting('app.user_id', true)
    OR assigned_to::text = current_setting('app.user_id', true)
    OR (space_id IS NOT NULL AND space_id = get_user_space_id(current_setting('app.user_id', true)::uuid))
  );

-- Users can delete leads they own
CREATE POLICY "Users can delete their leads"
  ON leads FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true));
