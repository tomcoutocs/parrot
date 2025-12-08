-- Step 5: Check RLS policies (simplified)
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'form_submissions'
ORDER BY policyname;
