-- Add profile_picture column to users table
-- This column stores the URL/path to the user's profile picture

-- Check if column exists before adding (idempotent)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'profile_picture'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN profile_picture TEXT;
        
        COMMENT ON COLUMN users.profile_picture IS 'URL or path to the user profile picture';
    END IF;
END $$;

