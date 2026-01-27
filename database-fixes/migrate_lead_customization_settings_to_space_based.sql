-- Migrate lead_customization_settings from user-based to space-based
-- This makes settings space-level (admin-controlled) instead of user-level

-- Step 1: Add space_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_customization_settings' 
        AND column_name = 'space_id'
    ) THEN
        ALTER TABLE lead_customization_settings ADD COLUMN space_id UUID;
    END IF;
END $$;

-- Step 2: Migrate existing user-based settings to space-based
-- For each user's settings, copy them to their space_id
-- If multiple users in the same space have settings, keep the most recent one
UPDATE lead_customization_settings lcs
SET space_id = u.company_id
FROM users u
WHERE lcs.user_id = u.id
  AND u.company_id IS NOT NULL
  AND lcs.space_id IS NULL;

-- Step 3: Remove duplicate settings (keep most recent per space)
DELETE FROM lead_customization_settings lcs1
WHERE EXISTS (
    SELECT 1 FROM lead_customization_settings lcs2
    WHERE lcs2.space_id = lcs1.space_id
      AND lcs2.space_id IS NOT NULL
      AND lcs2.id != lcs1.id
      AND lcs2.updated_at > lcs1.updated_at
);

-- Step 4: Drop the unique constraint on user_id
ALTER TABLE lead_customization_settings DROP CONSTRAINT IF EXISTS lead_customization_settings_user_id_key;

-- Step 5: Make space_id NOT NULL and add unique constraint
ALTER TABLE lead_customization_settings 
  ALTER COLUMN space_id SET NOT NULL;

-- Add unique constraint on space_id
ALTER TABLE lead_customization_settings 
  ADD CONSTRAINT lead_customization_settings_space_id_key UNIQUE (space_id);

-- Step 6: Drop user_id column (optional - comment out if you want to keep it for reference)
-- ALTER TABLE lead_customization_settings DROP COLUMN user_id;

-- Step 7: Update the comment
COMMENT ON TABLE lead_customization_settings IS 'Customization settings for the Lead Generation app, stored per space (admin-controlled)';

-- Step 8: Update index
DROP INDEX IF EXISTS idx_lead_customization_settings_user_id;
CREATE INDEX IF NOT EXISTS idx_lead_customization_settings_space_id ON lead_customization_settings(space_id);
