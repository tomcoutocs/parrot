-- Migration: Check for triggers, views, or functions that might reference forms.company_id
-- This helps identify what's causing the "column f.company_id does not exist" error

-- Check for triggers on form_submissions
SELECT 
    tgname AS trigger_name,
    pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'form_submissions'::regclass
AND tgisinternal = false;

-- Check for views that reference form_submissions
SELECT 
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE definition LIKE '%form_submissions%'
AND definition LIKE '%company_id%';

-- Check for functions that might be called
SELECT 
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid) LIKE '%form_submissions%'
AND pg_get_functiondef(p.oid) LIKE '%company_id%';

-- List all RLS policies on form_submissions with their full definitions
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'form_submissions';
