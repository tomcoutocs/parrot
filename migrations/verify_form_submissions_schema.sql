-- Migration: Verify and fix form_submissions schema
-- This migration ensures form_submissions has the company_id column
-- and verifies the schema is correct for form submissions

-- Step 1: Ensure company_id column exists in form_submissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE form_submissions 
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
    
    RAISE NOTICE 'Added company_id column to form_submissions';
  ELSE
    RAISE NOTICE 'company_id column already exists in form_submissions';
  END IF;
END $$;

-- Step 2: Ensure form_spaces table exists
CREATE TABLE IF NOT EXISTS form_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(form_id, company_id)
);

-- Step 3: Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_form_spaces_form_id ON form_spaces(form_id);
CREATE INDEX IF NOT EXISTS idx_form_spaces_company_id ON form_spaces(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id ON form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);

-- Step 4: Verify the schema
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'company_id'
  ) INTO column_exists;
  
  IF column_exists THEN
    RAISE NOTICE 'Schema verification: form_submissions.company_id exists ✓';
  ELSE
    RAISE EXCEPTION 'Schema verification failed: form_submissions.company_id does not exist';
  END IF;
END $$;
