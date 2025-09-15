-- Fix Database Trigger Issues
-- Run this in your Supabase SQL Editor

-- Remove any triggers on projects table that reference due_date
DO $$ 
DECLARE
    trigger_record RECORD;
BEGIN
    -- Find and drop any triggers on projects table
    FOR trigger_record IN 
        SELECT trigger_name 
        FROM information_schema.triggers 
        WHERE event_object_table = 'projects'
    LOOP
        EXECUTE 'DROP TRIGGER IF EXISTS ' || trigger_record.trigger_name || ' ON projects CASCADE';
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- Test that projects table works
SELECT 'Projects table test' as test, COUNT(*) as count FROM projects;
