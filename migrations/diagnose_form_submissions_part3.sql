-- Step 3: Check for views that reference form_submissions
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%form_submissions%'
ORDER BY viewname;
