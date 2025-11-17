-- SQL Script to Make company_id Nullable in company_events Table
-- This allows admins to create events without a company/space
-- Run this in your Supabase SQL Editor

-- Check current constraint status
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'company_events'
AND column_name = 'company_id';

-- Make company_id nullable
-- First, drop any NOT NULL constraint if it exists
ALTER TABLE company_events 
ALTER COLUMN company_id DROP NOT NULL;

-- Add a comment explaining why company_id can be null
COMMENT ON COLUMN company_events.company_id IS 'Company ID for the event. NULL for admin-created events that are not associated with a specific company/space.';

-- Verify the change
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'company_events'
AND column_name = 'company_id';

-- Note: You may also want to update RLS policies to handle NULL company_id
-- The existing policies should already allow admins to insert/select events with NULL company_id
-- since they check for admin role first

