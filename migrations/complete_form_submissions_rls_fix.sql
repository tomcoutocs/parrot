-- Migration: Complete fix for form_submissions RLS policies
-- This aggressively removes all policies and recreates them without forms.company_id references

-- Step 1: Disable RLS completely
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies on form_submissions (using a more aggressive approach)
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  -- Get all policy names and drop them
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'form_submissions'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON form_submissions CASCADE', policy_name);
      RAISE NOTICE 'Dropped policy: %', policy_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policy %: %', policy_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Also try dropping policies directly from pg_policy system catalog
DO $$
DECLARE
  pol_name TEXT;
BEGIN
  FOR pol_name IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = 'form_submissions'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON form_submissions', pol_name);
      RAISE NOTICE 'Dropped policy from pg_policy: %', pol_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policy %: %', pol_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 4: Re-enable RLS
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, safe policies that don't reference forms table at all
-- Policy: Allow inserts if user_id matches auth.uid() OR exists in users table
CREATE POLICY "allow_insert_authenticated"
ON form_submissions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = user_id
  )
);

-- Policy: Users can view their own submissions
CREATE POLICY "allow_select_own"
ON form_submissions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can view submissions if user_id exists in users table
CREATE POLICY "allow_select_by_user_id"
ON form_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = form_submissions.user_id
  )
);

-- Policy: Admins can view all submissions
CREATE POLICY "allow_select_admins"
ON form_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- Policy: Managers can view all submissions
CREATE POLICY "allow_select_managers"
ON form_submissions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'manager'
  )
);
