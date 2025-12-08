-- Migration: Remove any triggers on form_submissions that might reference forms.company_id
-- This helps resolve the "column f.company_id does not exist" error

-- Step 1: List all triggers on form_submissions
DO $$
DECLARE
  trigger_record RECORD;
BEGIN
  RAISE NOTICE 'Checking for triggers on form_submissions...';
  FOR trigger_record IN
    SELECT 
      tgname AS trigger_name,
      pg_get_triggerdef(oid) AS trigger_definition
    FROM pg_trigger
    WHERE tgrelid = 'form_submissions'::regclass
    AND tgisinternal = false
  LOOP
    RAISE NOTICE 'Found trigger: %', trigger_record.trigger_name;
    RAISE NOTICE 'Definition: %', trigger_record.trigger_definition;
    
    -- Drop trigger if it references forms.company_id
    IF trigger_record.trigger_definition LIKE '%forms%company_id%' 
       OR trigger_record.trigger_definition LIKE '%f.company_id%' THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON form_submissions', trigger_record.trigger_name);
      RAISE NOTICE 'Dropped trigger: % (references forms.company_id)', trigger_record.trigger_name;
    END IF;
  END LOOP;
  
  -- If no triggers found, report that
  IF NOT FOUND THEN
    RAISE NOTICE 'No triggers found on form_submissions';
  END IF;
END $$;

-- Step 2: Check for views that might be causing issues
DO $$
DECLARE
  view_record RECORD;
BEGIN
  RAISE NOTICE 'Checking for views that reference form_submissions and company_id...';
  FOR view_record IN
    SELECT 
      schemaname,
      viewname,
      definition
    FROM pg_views
    WHERE definition LIKE '%form_submissions%'
    AND (definition LIKE '%company_id%' OR definition LIKE '%forms%')
  LOOP
    RAISE NOTICE 'Found view: %.%', view_record.schemaname, view_record.viewname;
    RAISE NOTICE 'Definition contains form_submissions and company_id/forms';
  END LOOP;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No problematic views found';
  END IF;
END $$;

-- Step 3: Ensure RLS is disabled (re-run in case it was re-enabled)
ALTER TABLE form_submissions DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is disabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'form_submissions'
  AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
  
  IF rls_enabled = false THEN
    RAISE NOTICE 'RLS is disabled on form_submissions ✓';
  ELSE
    RAISE WARNING 'RLS is still enabled on form_submissions';
  END IF;
END $$;
