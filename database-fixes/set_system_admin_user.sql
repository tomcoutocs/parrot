-- Set user tomcouto@withparrot.co as system admin
-- Run this script in your Supabase SQL editor

-- First, verify the user exists
DO $$
DECLARE
    user_exists BOOLEAN;
    user_id_val UUID;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'tomcouto@withparrot.co') INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User with email tomcouto@withparrot.co does not exist';
    END IF;
    
    -- Get the user ID
    SELECT id INTO user_id_val FROM users WHERE email = 'tomcouto@withparrot.co';
    
    -- Update the user's role to system_admin
    UPDATE users
    SET 
        role = 'system_admin',
        updated_at = NOW()
    WHERE email = 'tomcouto@withparrot.co';
    
    RAISE NOTICE 'User % (ID: %) has been set as system admin', 'tomcouto@withparrot.co', user_id_val;
END $$;

-- Verify the update
SELECT 
    id,
    email,
    full_name,
    role,
    is_active,
    updated_at
FROM users
WHERE email = 'tomcouto@withparrot.co';

