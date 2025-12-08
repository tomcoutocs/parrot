-- Migration: Fix form_submissions company_id column
-- This ensures the company_id column exists and is properly configured

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

-- Step 2: Ensure form_spaces table exists (junction table for forms and companies)
CREATE TABLE IF NOT EXISTS form_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(form_id, company_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_spaces_form_id ON form_spaces(form_id);
CREATE INDEX IF NOT EXISTS idx_form_spaces_company_id ON form_spaces(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id ON form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);

-- Step 4: Add comments for documentation
COMMENT ON TABLE form_spaces IS 'Junction table linking forms to spaces (companies). Allows forms to be assigned to multiple spaces.';
COMMENT ON COLUMN form_submissions.company_id IS 'The space (company) from which the form was submitted. NULL if submitted from admin view.';
