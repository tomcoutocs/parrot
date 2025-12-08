-- Test direct INSERT into form_submissions to see if the error occurs
-- Replace the UUIDs with actual values from your database

-- First, get a valid form_id and user_id
-- SELECT id FROM forms LIMIT 1;
-- SELECT id FROM users LIMIT 1;

-- Then try a direct insert (uncomment and replace UUIDs):
/*
INSERT INTO form_submissions (
    form_id,
    user_id,
    submission_data,
    company_id
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Replace with actual form_id
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Replace with actual user_id
    '{"test": "data"}'::jsonb,
    NULL
);
*/

-- Or test with a company_id:
/*
INSERT INTO form_submissions (
    form_id,
    user_id,
    submission_data,
    company_id
) VALUES (
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Replace with actual form_id
    '00000000-0000-0000-0000-000000000001'::uuid,  -- Replace with actual user_id
    '{"test": "data"}'::jsonb,
    '00000000-0000-0000-0000-000000000001'::uuid   -- Replace with actual company_id
);
*/

-- Check what error we get
-- This will help determine if it's a PostgREST issue or a database-level issue
