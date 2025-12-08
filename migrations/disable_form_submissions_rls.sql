-- Migration: Disable RLS on form_submissions table
-- This removes all RLS restrictions to allow form submissions without policy conflicts

-- Step 1: Drop all existing policies on form_submissions
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
      EXECUTE format('DROP POLICY IF EXISTS %I ON form_submissions', policy_name);
      RAISE NOTICE 'Dropped policy: %', policy_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policy %: %', policy_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Disable RLS on form_submissions
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Step 3: Verify RLS is disabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'form_submissions'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF rls_enabled = false THEN
    RAISE NOTICE 'RLS successfully disabled on form_submissions ✓';
  ELSE
    RAISE WARNING 'RLS may still be enabled. Please verify manually.';
  END IF;
END $$;
