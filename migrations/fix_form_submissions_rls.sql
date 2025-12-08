-- Migration: Fix RLS policies on form_submissions
-- This migration ensures RLS policies don't reference forms.company_id (which doesn't exist)
-- Forms are linked to companies through form_spaces junction table, not directly

-- Step 1: Drop any existing RLS policies that might reference forms.company_id
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Find and drop policies that reference forms.company_id
  FOR policy_record IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE tablename = 'form_submissions'
    AND definition LIKE '%forms%company_id%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_record.policyname, policy_record.tablename);
    RAISE NOTICE 'Dropped policy: % on %', policy_record.policyname, policy_record.tablename;
  END LOOP;
END $$;

-- Step 2: Create proper RLS policies for form_submissions
-- Policy: Users can insert their own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'Users can insert their own form submissions'
  ) THEN
    CREATE POLICY "Users can insert their own form submissions"
    ON form_submissions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
    
    RAISE NOTICE 'Created policy: Users can insert their own form submissions';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can insert their own form submissions';
  END IF;
END $$;

-- Policy: Users can view their own submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'Users can view their own form submissions'
  ) THEN
    CREATE POLICY "Users can view their own form submissions"
    ON form_submissions
    FOR SELECT
    USING (auth.uid() = user_id);
    
    RAISE NOTICE 'Created policy: Users can view their own form submissions';
  ELSE
    RAISE NOTICE 'Policy already exists: Users can view their own form submissions';
  END IF;
END $$;

-- Policy: Admins can view all submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'form_submissions' 
    AND policyname = 'Admins can view all form submissions'
  ) THEN
    CREATE POLICY "Admins can view all form submissions"
    ON form_submissions
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
      )
    );
    
    RAISE NOTICE 'Created policy: Admins can view all form submissions';
  ELSE
    RAISE NOTICE 'Policy already exists: Admins can view all form submissions';
  END IF;
END $$;

-- Step 3: Enable RLS on form_submissions if not already enabled
ALTER TABLE form_submissions ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify no policies reference forms.company_id
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'form_submissions'
  AND definition LIKE '%forms%company_id%';
  
  IF policy_count > 0 THEN
    RAISE WARNING 'Found % policies that still reference forms.company_id. These may need manual review.', policy_count;
  ELSE
    RAISE NOTICE 'No policies found referencing forms.company_id ✓';
  END IF;
END $$;
