-- Check RLS policies on forms table that might reference company_id
-- This could be causing PostgREST to try to access forms.company_id during validation

-- Check if forms table has RLS enabled
SELECT 
    relname,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'forms'
AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- List all policies on forms table (simplified to avoid array_agg issues)
DO $$
DECLARE
    policy_rec RECORD;
BEGIN
    RAISE NOTICE '=== RLS Policies on forms table ===';
    FOR policy_rec IN
        SELECT 
            pol.polname AS policy_name,
            pol.polcmd AS command,
            pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
            pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
        FROM pg_policy pol
        JOIN pg_class cls ON pol.polrelid = cls.oid
        WHERE cls.relname = 'forms'
    LOOP
        RAISE NOTICE 'Policy: %', policy_rec.policy_name;
        RAISE NOTICE 'Command: %', policy_rec.command;
        IF policy_rec.using_expression IS NOT NULL THEN
            RAISE NOTICE 'USING: %', policy_rec.using_expression;
        END IF;
        IF policy_rec.with_check_expression IS NOT NULL THEN
            RAISE NOTICE 'WITH CHECK: %', policy_rec.with_check_expression;
        END IF;
        RAISE NOTICE '---';
    END LOOP;
END $$;

-- Check if forms table has a company_id column (it shouldn't)
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'forms'
AND table_schema = 'public'
AND column_name LIKE '%company%'
ORDER BY column_name;
