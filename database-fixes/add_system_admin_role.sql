-- Add system_admin role support to the database
-- This script adds the system_admin role and updates RLS policies to allow system_admin authority over admins

-- First, update the users table to allow system_admin role
-- Check if the role column has a check constraint and update it
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add new check constraint that includes system_admin
    ALTER TABLE users ADD CONSTRAINT users_role_check 
        CHECK (role IN ('system_admin', 'admin', 'manager', 'user', 'internal'));
END $$;

-- Update user_invitations table if it exists
DO $$
BEGIN
    -- Drop existing check constraint if it exists
    ALTER TABLE user_invitations DROP CONSTRAINT IF EXISTS user_invitations_role_check;
    
    -- Add new check constraint that includes system_admin
    ALTER TABLE user_invitations ADD CONSTRAINT user_invitations_role_check 
        CHECK (role IN ('system_admin', 'admin', 'manager', 'user', 'internal'));
EXCEPTION
    WHEN undefined_table THEN
        -- Table doesn't exist, skip
        NULL;
END $$;

-- Create or replace helper function to check if user has admin privileges
CREATE OR REPLACE FUNCTION has_admin_privileges(user_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_role IN ('system_admin', 'admin');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create or replace helper function to check if user has system admin privileges
CREATE OR REPLACE FUNCTION has_system_admin_privileges(user_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN user_role = 'system_admin';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update set_user_context function to handle system_admin role
-- This function is used by RLS policies to check user permissions
CREATE OR REPLACE FUNCTION set_user_context(
    user_id UUID,
    user_role TEXT,
    company_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Set the user context variables for RLS policies
    PERFORM set_config('app.user_id', user_id::TEXT, false);
    PERFORM set_config('app.user_role', user_role, false);
    PERFORM set_config('app.company_id', COALESCE(company_id::TEXT, ''), false);
    
    -- Also set a flag for admin privileges (system_admin or admin)
    PERFORM set_config('app.has_admin_privileges', 
        CASE WHEN has_admin_privileges(user_role) THEN 'true' ELSE 'false' END, 
        false);
    
    -- Set a flag for system admin privileges
    PERFORM set_config('app.has_system_admin_privileges', 
        CASE WHEN has_system_admin_privileges(user_role) THEN 'true' ELSE 'false' END, 
        false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: RLS policies that check for 'admin' role should be updated to use:
-- current_setting('app.has_admin_privileges', true) = 'true'
-- This will automatically include both 'admin' and 'system_admin' roles
-- 
-- For policies that need to specifically check for system_admin authority over admins,
-- use: current_setting('app.has_system_admin_privileges', true) = 'true'
--
-- Example RLS policy update:
-- OLD: current_setting('app.user_role', true) = 'admin'
-- NEW: current_setting('app.has_admin_privileges', true) = 'true'
--
-- For system_admin only:
-- current_setting('app.has_system_admin_privileges', true) = 'true'

COMMENT ON FUNCTION has_admin_privileges(TEXT) IS 'Returns true if user role has admin privileges (system_admin or admin)';
COMMENT ON FUNCTION has_system_admin_privileges(TEXT) IS 'Returns true if user role is system_admin';
COMMENT ON FUNCTION set_user_context(UUID, TEXT, UUID) IS 'Sets user context for RLS policies, including admin privilege flags';

