-- SQL Script to Fix RLS Policy for company_services table
-- This allows admins and managers to manage company services
-- Run this in your Supabase SQL Editor

-- Option 1: Disable RLS completely for company_services table
-- WARNING: This removes all row-level security. Only use if you want no restrictions.
-- Uncomment the line below if you want to disable RLS:
-- ALTER TABLE company_services DISABLE ROW LEVEL SECURITY;

-- Option 2: Create/Update RLS Policy to allow admins and managers (RECOMMENDED)
-- This is the safer approach - it keeps RLS enabled but allows admins/managers to manage services

-- First, drop existing policies if they exist (optional - only if you want to recreate them)
-- DROP POLICY IF EXISTS "Allow admins and managers to manage company services" ON company_services;
-- DROP POLICY IF EXISTS "company_services_select_policy" ON company_services;
-- DROP POLICY IF EXISTS "company_services_insert_policy" ON company_services;
-- DROP POLICY IF EXISTS "company_services_update_policy" ON company_services;
-- DROP POLICY IF EXISTS "company_services_delete_policy" ON company_services;

-- Enable RLS (if not already enabled)
ALTER TABLE company_services ENABLE ROW LEVEL SECURITY;

-- Policy for SELECT: Allow admins, managers, and users to view company services
CREATE POLICY "company_services_select_policy"
ON company_services
FOR SELECT
USING (
  -- Admins can see all
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can see services for companies they manage
  current_setting('app.user_role', true) = 'manager'
  OR
  -- Users can see services for their own company
  (
    current_setting('app.user_role', true) = 'user'
    AND company_id = current_setting('app.company_id', true)::uuid
  )
  OR
  -- Internal users can see services for their assigned companies
  (
    current_setting('app.user_role', true) = 'internal'
    AND company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
  )
);

-- Policy for INSERT: Allow admins and managers to add company services
CREATE POLICY "company_services_insert_policy"
ON company_services
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

-- Policy for UPDATE: Allow admins and managers to update company services
CREATE POLICY "company_services_update_policy"
ON company_services
FOR UPDATE
USING (
  -- Admins can update any company service
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can update services for companies they manage
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

-- Policy for DELETE: Allow admins and managers to delete company services
CREATE POLICY "company_services_delete_policy"
ON company_services
FOR DELETE
USING (
  -- Admins can delete any company service
  current_setting('app.user_role', true) = 'admin'
  OR
  -- Managers can delete services for companies they manage
  (
    current_setting('app.user_role', true) = 'manager'
    AND (
      current_setting('app.company_id', true) IS NULL
      OR company_id = current_setting('app.company_id', true)::uuid
      OR company_id = ANY(string_to_array(current_setting('app.company_ids', true), ',')::uuid[])
    )
  )
);

-- Verify the policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'company_services';

