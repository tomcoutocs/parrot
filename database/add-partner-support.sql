-- Add Partner Support to Companies
-- This script adds an is_partner column to the companies table

-- Step 1: Add the is_partner column
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS is_partner BOOLEAN DEFAULT FALSE;

-- Step 2: Update existing companies to set is_partner = false
UPDATE companies 
SET is_partner = FALSE 
WHERE is_partner IS NULL;

-- Step 3: Make the column NOT NULL after setting default values
ALTER TABLE companies 
ALTER COLUMN is_partner SET NOT NULL;

-- Step 4: Add an index for better query performance on partner filtering
CREATE INDEX IF NOT EXISTS idx_companies_is_partner ON companies(is_partner);

-- Step 5: Verify the changes
SELECT '=== VERIFICATION ===' as info;

SELECT 
    'Column added: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'is_partner'
        ) 
        THEN 'YES' 
        ELSE 'NO' 
    END as column_status,
    
    'Default value: ' || 
    (SELECT column_default FROM information_schema.columns 
     WHERE table_name = 'companies' AND column_name = 'is_partner') as default_value,
    
    'Index created: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE tablename = 'companies' AND indexname = 'idx_companies_is_partner'
        ) 
        THEN 'YES' 
        ELSE 'NO' 
    END as index_status;

-- Step 6: Show sample data
SELECT '=== SAMPLE DATA ===' as info;
SELECT 
    name,
    industry,
    is_active,
    is_partner,
    created_at
FROM companies 
ORDER BY created_at DESC 
LIMIT 5;
