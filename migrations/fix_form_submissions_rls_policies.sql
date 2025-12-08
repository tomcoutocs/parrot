-- Migration: Fix RLS policies on form_submissions
-- This ensures RLS policies don't reference forms.company_id (which doesn't exist)

-- Step 1: Drop any problematic policies that reference forms.company_id
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'form_submissions'
    AND (
      qual LIKE '%f.company_id%' OR qual LIKE '%forms.company_id%' OR
      with_check LIKE '%f.company_id%' OR with_check LIKE '%forms.company_id%'
    )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON form_submissions', policy_name);
    RAISE NOTICE 'Dropped problematic policy: %', policy_name;
  END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Step 3: Create basic RLS policies (if they don't exist)
-- Users can insert their own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'enable_insert_for_users'
  ) THEN
    CREATE POLICY "enable_insert_for_users"
    ON form_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Users can view their own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'enable_select_for_users'
  ) THEN
    CREATE POLICY "enable_select_for_users"
    ON form_submissions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;
