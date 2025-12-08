-- Migration: Recreate form_submissions table cleanly
-- This is a nuclear option - it will drop and recreate the table
-- WARNING: This will DELETE ALL EXISTING FORM SUBMISSIONS
-- Only run this if you're okay losing existing data or have a backup

-- Step 1: Drop all dependent objects first
DROP VIEW IF EXISTS form_submissions_view CASCADE;
DROP MATERIALIZED VIEW IF EXISTS form_submissions_mv CASCADE;

-- Step 2: Drop all triggers
DO $$
DECLARE
  trigger_name TEXT;
BEGIN
  FOR trigger_name IN
    SELECT tgname
    FROM pg_trigger
    WHERE tgrelid = 'form_submissions'::regclass
    AND tgisinternal = false
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON form_submissions CASCADE', trigger_name);
  END LOOP;
END $$;

-- Step 3: Drop all policies
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'form_submissions'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON form_submissions', policy_name);
  END LOOP;
END $$;

-- Step 4: Drop the table (THIS DELETES ALL DATA)
-- Uncomment the next line only if you're sure you want to delete all submissions
-- DROP TABLE IF EXISTS form_submissions CASCADE;

-- Step 5: Recreate the table with correct structure
CREATE TABLE IF NOT EXISTS form_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  submission_data JSONB NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id ON form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at DESC);

-- Step 7: Ensure RLS is disabled
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Step 8: Add comments
COMMENT ON TABLE form_submissions IS 'Stores form submission data. company_id links to the space (company) where the form was submitted.';
COMMENT ON COLUMN form_submissions.company_id IS 'The space (company) from which the form was submitted. NULL if submitted from admin view.';
COMMENT ON COLUMN form_submissions.submission_data IS 'JSONB object containing all form field responses.';

-- Step 9: Verify the table structure
DO $$
DECLARE
  col_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_name = 'form_submissions'
  AND table_schema = 'public';
  
  IF col_count >= 7 THEN
    RAISE NOTICE 'Table form_submissions created successfully with % columns', col_count;
  ELSE
    RAISE EXCEPTION 'Table form_submissions has incorrect structure: % columns found', col_count;
  END IF;
END $$;
