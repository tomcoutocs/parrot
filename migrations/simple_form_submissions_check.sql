-- Simple check of form_submissions table structure
-- This avoids system views that might cause array_agg errors

-- Check table columns
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'form_submissions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if table exists and RLS status
SELECT 
    c.relname AS table_name,
    c.relrowsecurity AS rls_enabled,
    COUNT(t.tgname) AS trigger_count
FROM pg_class c
LEFT JOIN pg_trigger t ON t.tgrelid = c.oid AND t.tgisinternal = false
WHERE c.relname = 'form_submissions'
AND c.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
GROUP BY c.relname, c.relrowsecurity;

-- Check foreign keys
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS references_table
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'form_submissions'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';
