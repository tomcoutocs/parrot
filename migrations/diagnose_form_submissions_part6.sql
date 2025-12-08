-- Step 6: Check if RLS is enabled
SELECT 
    relname,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'form_submissions'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
