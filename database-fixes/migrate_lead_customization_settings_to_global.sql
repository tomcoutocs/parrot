-- Migrate lead_customization_settings to global (remove space_id and user_id)
-- This makes settings app-level (single global settings)

-- Step 1: Drop space_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_customization_settings' 
        AND column_name = 'space_id'
    ) THEN
        ALTER TABLE lead_customization_settings DROP COLUMN space_id;
    END IF;
END $$;

-- Step 2: Drop user_id column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_customization_settings' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE lead_customization_settings DROP COLUMN user_id;
    END IF;
END $$;

-- Step 3: Drop unique constraints on space_id or user_id if they exist
ALTER TABLE lead_customization_settings DROP CONSTRAINT IF EXISTS lead_customization_settings_space_id_key;
ALTER TABLE lead_customization_settings DROP CONSTRAINT IF EXISTS lead_customization_settings_user_id_key;

-- Step 4: Keep only the most recent settings record (if multiple exist)
-- Delete all but the most recently updated record
DELETE FROM lead_customization_settings lcs1
WHERE EXISTS (
    SELECT 1 FROM lead_customization_settings lcs2
    WHERE lcs2.id != lcs1.id
      AND lcs2.updated_at > lcs1.updated_at
);

-- Step 5: Update the comment
COMMENT ON TABLE lead_customization_settings IS 'Global customization settings for the Lead Generation app (admin-controlled)';

-- Step 6: Update indexes
DROP INDEX IF EXISTS idx_lead_customization_settings_space_id;
DROP INDEX IF EXISTS idx_lead_customization_settings_user_id;
CREATE INDEX IF NOT EXISTS idx_lead_customization_settings_id ON lead_customization_settings(id);
