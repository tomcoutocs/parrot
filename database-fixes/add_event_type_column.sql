-- SQL Script to Add event_type Column to company_events Table
-- Run this in your Supabase SQL Editor

-- Add event_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'company_events' 
        AND column_name = 'event_type'
    ) THEN
        ALTER TABLE company_events 
        ADD COLUMN event_type VARCHAR(50);
        
        -- Add a comment to the column
        COMMENT ON COLUMN company_events.event_type IS 'Type of event: launch, sale, event, or deadline';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'company_events'
AND column_name = 'event_type';

