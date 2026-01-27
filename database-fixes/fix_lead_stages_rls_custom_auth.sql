-- Fix RLS Policies for lead_stages table with custom authentication
-- This uses current_setting('app.user_id') instead of auth.uid() since we use custom auth

-- Drop existing policies on lead_stages
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'lead_stages'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON lead_stages', r.policyname);
    END LOOP;
END $$;

-- Users can view their own stages or stages in their space
CREATE POLICY "Users can view their stages"
  ON lead_stages FOR SELECT
  USING (
    user_id::text = current_setting('app.user_id', true)
    OR (space_id IS NOT NULL AND space_id = get_user_space_id(current_setting('app.user_id', true)::uuid))
  );

-- Users can create stages
CREATE POLICY "Users can create stages"
  ON lead_stages FOR INSERT
  WITH CHECK (
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND user_id::text = current_setting('app.user_id', true)
  );

-- Users can update their own stages
CREATE POLICY "Users can update their stages"
  ON lead_stages FOR UPDATE
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- Users can delete their own stages
CREATE POLICY "Users can delete their stages"
  ON lead_stages FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true));
