-- Migration: Comprehensive diagnosis of form_submissions table
-- Run each query separately if needed

-- Step 1: Check the actual table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'form_submissions'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Step 2: Check for foreign key constraints
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'form_submissions'
AND tc.table_schema = 'public'
AND tc.constraint_type = 'FOREIGN KEY';

-- Step 3: Check for views (simplified)
SELECT 
    schemaname,
    viewname
FROM pg_views
WHERE schemaname = 'public'
AND definition LIKE '%form_submissions%'
ORDER BY viewname;

-- Step 4: Check all triggers on form_submissions
SELECT 
    tgname AS trigger_name,
    CASE WHEN tgenabled = 'O' THEN 'enabled' ELSE 'disabled' END AS status
FROM pg_trigger
WHERE tgrelid = 'form_submissions'::regclass
AND tgisinternal = false
ORDER BY tgname;

-- Step 5: Check if RLS is enabled
SELECT 
    relname,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'form_submissions'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
