-- Make space_id nullable in user_invitations table
-- This allows internal/admin users to be invited without a space assignment

DO $$
BEGIN
    -- Check if the table and column exist
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_invitations' AND column_name = 'space_id'
    ) THEN
        -- Make space_id nullable
        ALTER TABLE user_invitations 
        ALTER COLUMN space_id DROP NOT NULL;
        
        RAISE NOTICE 'Made space_id nullable in user_invitations table';
    ELSE
        RAISE NOTICE 'user_invitations table or space_id column does not exist';
    END IF;
END $$;

