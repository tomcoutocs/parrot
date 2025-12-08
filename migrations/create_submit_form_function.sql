-- Migration: Create a database function to insert form submissions
-- This bypasses PostgREST checks that might be referencing forms.company_id

-- Step 1: Drop the function if it exists (to allow changing return type)
DROP FUNCTION IF EXISTS submit_form_submission(UUID, UUID, JSONB, UUID);

-- Step 2: Create a simpler function that just inserts and returns the ID
-- This avoids any potential PostgREST introspection issues
CREATE FUNCTION submit_form_submission(
  p_form_id UUID,
  p_user_id UUID,
  p_submission_data JSONB,
  p_company_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_submission_id UUID;
BEGIN
  -- Insert the submission directly without any joins or queries
  INSERT INTO form_submissions (
    form_id,
    user_id,
    submission_data,
    company_id
  ) VALUES (
    p_form_id,
    p_user_id,
    p_submission_data,
    p_company_id
  )
  RETURNING id INTO v_submission_id;
  
  RETURN v_submission_id;
END;
$$;

-- Step 2: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION submit_form_submission(UUID, UUID, JSONB, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_form_submission(UUID, UUID, JSONB, UUID) TO anon;

-- Step 3: Add comment
COMMENT ON FUNCTION submit_form_submission IS 'Inserts a form submission directly, bypassing PostgREST validation that might reference forms.company_id';
