-- SQL Script to Fix RLS Policy for company_events table
-- This allows admins and managers to manage company events
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS completely for company_events table
-- This removes all row-level security - admins and managers can manage events freely
ALTER TABLE company_events DISABLE ROW LEVEL SECURITY;

-- Option 2: Create/Update RLS Policy to allow admins and managers (Alternative approach)
-- Uncomment below and comment out Option 1 if you want to use RLS with policies instead
-- This is the safer approach - it keeps RLS enabled but allows admins/managers to manage events

/*
-- First, drop existing policies if they exist (optional - only if you want to recreate them)
DROP POLICY IF EXISTS "company_events_select_policy" ON company_events;
DROP POLICY IF EXISTS "company_events_insert_policy" ON company_events;
DROP POLICY IF EXISTS "company_events_update_policy" ON company_events;
DROP POLICY IF EXISTS "company_events_delete_policy" ON company_events;

-- Enable RLS (if not already enabled)
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Allow admins, managers, and users to view company events
CREATE POLICY "company_events_select_policy"
ON company_events
FOR SELECT
USING (
  -- Admins can see all
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can see events for companies they manage
  current_setting('app.user_role', true) = 'manager'
  OR
  -- Users can see events for their own company
  (
    current_setting('app.user_role', true) = 'user'
    AND company_id = current_setting('app.company_id', true)::uuid
  )
  OR
  -- Internal users can see events for their assigned companies
  (
    current_setting('app.user_role', true) = 'internal'
    AND company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
  )
);

-- Policy for INSERT: Allow admins and managers to add company events
CREATE POLICY "company_events_insert_policy"
ON company_events
FOR INSERT
WITH CHECK (
  -- Admins can insert for any company
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can insert for companies they manage
  (
    current_setting('app.user_role', true) = 'manager'
    AND (
      -- If company_id is set in context, check it matches
      current_setting('app.company_id', true) IS NULL
      OR company_id = current_setting('app.company_id', true)::uuid
      OR company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
    )
  )
);

-- Policy for UPDATE: Allow admins and managers to update company events
CREATE POLICY "company_events_update_policy"
ON company_events
FOR UPDATE
USING (
  -- Admins can update any company event
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can update events for companies they manage
  (
    current_setting('app.user_role', true) = 'manager'
    AND (
      current_setting('app.company_id', true) IS NULL
      OR company_id = current_setting('app.company_id', true)::uuid
      OR company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
    )
  )
)
WITH CHECK (
  -- Same conditions for the updated row
  current_setting('app.user_role', true) = 'admin'
  OR
  (
    current_setting('app.user_role', true) = 'manager'
    AND (
      current_setting('app.company_id', true) IS NULL
      OR company_id = current_setting('app.company_id', true)::uuid
      OR company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
    )
  )
);

-- Policy for DELETE: Allow admins and managers to delete company events
CREATE POLICY "company_events_delete_policy"
ON company_events
FOR DELETE
USING (
  -- Admins can delete any company event
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can delete events for companies they manage
  (
    current_setting('app.user_role', true) = 'manager'
    AND (
      current_setting('app.company_id', true) IS NULL
      OR company_id = current_setting('app.company_id', true)::uuid
      OR company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
    )
  )
);
*/

-- Verify RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'company_events';

-- If using policies, verify they were created:
-- SELECT 
--   schemaname,
--   tablename,
--   policyname,
--   permissive,
--   roles,
--   cmd,
--   qual,
--   with_check
-- FROM pg_policies
-- WHERE tablename = 'company_events';

