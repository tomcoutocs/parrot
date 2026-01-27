-- Fix RLS Policies for lead_customization_settings table with custom authentication
-- This uses current_setting('app.user_id') instead of auth.uid() since we use custom auth

-- Drop existing policies on lead_customization_settings
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'lead_customization_settings'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON lead_customization_settings', r.policyname);
    END LOOP;
END $$;

-- Users can view their own customization settings
CREATE POLICY "Users can view their customization settings"
  ON lead_customization_settings FOR SELECT
  USING (user_id::text = current_setting('app.user_id', true));

-- Users can create their own customization settings
CREATE POLICY "Users can create customization settings"
  ON lead_customization_settings FOR INSERT
  WITH CHECK (
    current_setting('app.user_id', true) IS NOT NULL 
    AND current_setting('app.user_id', true) != ''
    AND user_id::text = current_setting('app.user_id', true)
  );

-- Users can update their own customization settings
CREATE POLICY "Users can update their customization settings"
  ON lead_customization_settings FOR UPDATE
  USING (user_id::text = current_setting('app.user_id', true))
  WITH CHECK (user_id::text = current_setting('app.user_id', true));

-- Users can delete their own customization settings
CREATE POLICY "Users can delete their customization settings"
  ON lead_customization_settings FOR DELETE
  USING (user_id::text = current_setting('app.user_id', true));
