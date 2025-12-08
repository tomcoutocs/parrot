-- Migration: Find and remove triggers that reference forms.company_id
-- This should resolve the "column f.company_id does not exist" error

-- Step 1: List all triggers on form_submissions and check their definitions
DO $$
DECLARE
  trigger_record RECORD;
  trigger_def TEXT;
BEGIN
  RAISE NOTICE '=== Checking triggers on form_submissions ===';
  
  FOR trigger_record IN
    SELECT 
      tgname AS trigger_name,
      oid
    FROM pg_trigger
    WHERE tgrelid = 'form_submissions'::regclass
    AND tgisinternal = false
  LOOP
    -- Get the full trigger definition
    SELECT pg_get_triggerdef(trigger_record.oid) INTO trigger_def;
    
    RAISE NOTICE 'Found trigger: %', trigger_record.trigger_name;
    RAISE NOTICE 'Definition: %', trigger_def;
    
    -- Check if trigger references forms.company_id or f.company_id
    IF trigger_def LIKE '%forms%company_id%' 
       OR trigger_def LIKE '%f.company_id%'
       OR trigger_def LIKE '%forms%' THEN
      RAISE NOTICE '*** Trigger % references forms table - DROPPING ***', trigger_record.trigger_name;
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON form_submissions CASCADE', trigger_record.trigger_name);
    END IF;
  END LOOP;
  
  -- Check if any triggers remain
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'form_submissions'::regclass
    AND tgisinternal = false
  ) THEN
    RAISE NOTICE 'No triggers found on form_submissions';
  END IF;
END $$;

-- Step 2: Check for triggers on forms table that might affect form_submissions
DO $$
DECLARE
  trigger_record RECORD;
  trigger_def TEXT;
BEGIN
  RAISE NOTICE '=== Checking triggers on forms table ===';
  
  FOR trigger_record IN
    SELECT 
      tgname AS trigger_name,
      oid
    FROM pg_trigger
    WHERE tgrelid = 'forms'::regclass
    AND tgisinternal = false
  LOOP
    SELECT pg_get_triggerdef(trigger_record.oid) INTO trigger_def;
    
    -- Check if trigger references form_submissions and company_id
    IF trigger_def LIKE '%form_submissions%' AND trigger_def LIKE '%company_id%' THEN
      RAISE NOTICE 'Found trigger on forms that references form_submissions: %', trigger_record.trigger_name;
      RAISE NOTICE 'Definition: %', trigger_def;
    END IF;
  END LOOP;
END $$;

-- Step 3: Temporarily disable all triggers on form_submissions for testing
-- (Comment out if you want to keep triggers, but this will help identify the issue)
-- ALTER TABLE form_submissions DISABLE TRIGGER ALL;

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
