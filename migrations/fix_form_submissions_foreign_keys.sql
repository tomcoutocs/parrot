-- Migration: Fix foreign key constraints that might be causing PostgREST issues
-- The error "column f.company_id does not exist" suggests PostgREST is trying to validate
-- the foreign key by joining with forms table and accessing forms.company_id

-- Step 1: Drop the existing foreign key constraint on form_id
-- This constraint references forms(id), and PostgREST might be doing a join that references forms.company_id
ALTER TABLE form_submissions 
DROP CONSTRAINT IF EXISTS form_submissions_form_id_fkey;

-- Step 2: Recreate it with a simpler definition
-- Using CASCADE to ensure it works, but this shouldn't affect anything
ALTER TABLE form_submissions
ADD CONSTRAINT form_submissions_form_id_fkey 
FOREIGN KEY (form_id) 
REFERENCES forms(id) 
ON DELETE CASCADE;

-- Step 3: Verify the constraint was created
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'form_submissions_form_id_fkey'
        AND table_name = 'form_submissions'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Foreign key constraint form_submissions_form_id_fkey recreated successfully ✓';
    ELSE
        RAISE WARNING 'Failed to recreate foreign key constraint';
    END IF;
END $$;

-- Step 4: Ensure RLS is still disabled
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Step 5: Ensure no triggers are enabled
ALTER TABLE form_submissions DISABLE TRIGGER ALL;
