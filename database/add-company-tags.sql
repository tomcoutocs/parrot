-- Add tags column to companies table
-- This migration adds a tags array column to store company tags

-- Add the tags column as a text array
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- Update existing companies to have empty tags array if they don't have one
UPDATE companies 
SET tags = '{}' 
WHERE tags IS NULL;

-- Add a comment to document the column
COMMENT ON COLUMN companies.tags IS 'Array of tags associated with the company';

-- Example: Add some sample tags to existing companies
-- UPDATE companies 
-- SET tags = ARRAY['enterprise', 'technology'] 
-- WHERE name = 'TechCorp Inc.';

-- UPDATE companies 
-- SET tags = ARRAY['startup', 'healthcare'] 
-- WHERE name = 'HealthStart LLC';
