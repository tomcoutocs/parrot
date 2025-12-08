-- Find any views, functions, or triggers that reference forms.company_id
-- This will help identify what's causing the "column f.company_id does not exist" error

-- Check for views that join form_submissions with forms and reference company_id
SELECT 
    schemaname,
    viewname,
    CASE 
        WHEN definition LIKE '%f.company_id%' THEN 'Uses f.company_id'
        WHEN definition LIKE '%forms.company_id%' THEN 'Uses forms.company_id'
        WHEN definition LIKE '%form_submissions%' AND definition LIKE '%forms%' AND definition LIKE '%company_id%' THEN 'Joins form_submissions with forms and references company_id'
        ELSE 'Other'
    END AS issue_type
FROM pg_views
WHERE schemaname = 'public'
AND (
    definition LIKE '%form_submissions%'
    AND definition LIKE '%forms%'
    AND definition LIKE '%company_id%'
)
ORDER BY viewname;

-- Check the actual definition of any problematic views
DO $$
DECLARE
    view_rec RECORD;
BEGIN
    FOR view_rec IN
        SELECT viewname, definition
        FROM pg_views
        WHERE schemaname = 'public'
        AND definition LIKE '%form_submissions%'
        AND definition LIKE '%forms%'
        AND definition LIKE '%company_id%'
    LOOP
        RAISE NOTICE 'View: %', view_rec.viewname;
        RAISE NOTICE 'Definition: %', view_rec.definition;
        RAISE NOTICE '---';
    END LOOP;
END $$;

-- Check if there's a default value or check constraint that might be causing issues
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'form_submissions'::regclass
AND contype IN ('c', 'f')
ORDER BY conname;
