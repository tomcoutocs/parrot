-- Step 4: Check all triggers on form_submissions
SELECT 
    tgname AS trigger_name,
    CASE WHEN tgenabled = 'O' THEN 'enabled' ELSE 'disabled' END AS status
FROM pg_trigger
WHERE tgrelid = 'form_submissions'::regclass
AND tgisinternal = false
ORDER BY tgname;
