-- Migration: Add space support to forms
-- This migration adds the ability to assign forms to spaces and track which space a form was submitted from

-- Step 1: Create junction table for form-space assignments (many-to-many)
CREATE TABLE IF NOT EXISTS form_spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(form_id, company_id)
);

-- Step 2: Add space_id to form_submissions if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE form_submissions 
    ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_form_spaces_form_id ON form_spaces(form_id);
CREATE INDEX IF NOT EXISTS idx_form_spaces_company_id ON form_spaces(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_company_id ON form_submissions(company_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);

-- Step 4: Add comment for documentation
COMMENT ON TABLE form_spaces IS 'Junction table linking forms to spaces (companies). Allows forms to be assigned to multiple spaces.';
COMMENT ON COLUMN form_submissions.company_id IS 'The space (company) from which the form was submitted. NULL if submitted from admin view.';
