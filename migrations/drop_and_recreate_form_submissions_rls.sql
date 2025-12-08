-- Migration: Drop and recreate form_submissions RLS policies
-- This fixes the issue where policies reference forms.company_id (which doesn't exist)

-- Step 1: Disable RLS temporarily
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on form_submissions
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'form_submissions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON form_submissions', policy_record.policyname);
    RAISE NOTICE 'Dropped policy: %', policy_record.policyname;
  END LOOP;
END $$;

-- Step 3: Re-enable RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Step 4: Create new policies that don't reference forms.company_id
-- Policy: Users can insert their own submissions
-- Allow if user_id matches auth.uid() OR if user_id exists in users table
CREATE POLICY "enable_insert_for_users"
ON form_submissions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_id
  )
);

-- Policy: Users can view their own submissions
CREATE POLICY "enable_select_for_users"
ON form_submissions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Admins can view all submissions
CREATE POLICY "enable_select_for_admins"
ON form_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Managers can view all submissions
CREATE POLICY "enable_select_for_managers"
ON form_submissions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'manager'
  )
);
