-- Migration script to convert lead_customization_settings from space-based to user-based
-- Run this if the table already exists with space_id

-- Drop the old trigger if it exists
DROP TRIGGER IF EXISTS update_lead_customization_settings_updated_at_trigger ON lead_customization_settings;

-- Drop old index if it exists
DROP INDEX IF EXISTS idx_lead_customization_settings_space_id;

-- If space_id column exists, we need to migrate data
-- First, check if space_id column exists and migrate data if needed
DO $$
BEGIN
  -- Check if space_id column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lead_customization_settings' 
    AND column_name = 'space_id'
  ) THEN
    -- Migrate: Keep settings for each user (if multiple spaces per user, keep the most recent)
    -- Delete duplicates, keeping the one with the latest updated_at
    DELETE FROM lead_customization_settings a
    USING lead_customization_settings b
    WHERE a.user_id = b.user_id
      AND a.id < b.id
      AND a.space_id IS NOT NULL
      AND b.space_id IS NOT NULL;
    
    -- Drop the space_id column
    ALTER TABLE lead_customization_settings DROP COLUMN IF EXISTS space_id;
    
    -- Drop the old unique constraint on space_id if it exists
    ALTER TABLE lead_customization_settings DROP CONSTRAINT IF EXISTS lead_customization_settings_space_id_key;
  END IF;
END $$;

-- Ensure user_id unique constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'lead_customization_settings_user_id_key'
  ) THEN
    ALTER TABLE lead_customization_settings ADD CONSTRAINT lead_customization_settings_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Recreate the trigger
CREATE TRIGGER update_lead_customization_settings_updated_at_trigger
  BEFORE UPDATE ON lead_customization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_customization_settings_updated_at();

-- Update comment
COMMENT ON TABLE lead_customization_settings IS 'Customization settings for the Lead Generation app, stored per user';
