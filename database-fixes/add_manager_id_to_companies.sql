-- SQL Script to Add manager_id Column to companies Table
-- This allows companies/spaces to have an assigned manager.
-- Run this in your Supabase SQL Editor.

DO $$
BEGIN
    -- Check if the column doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'companies'
        AND column_name = 'manager_id'
    ) THEN
        -- Add the manager_id column as nullable foreign key to users table
        ALTER TABLE companies
        ADD COLUMN manager_id UUID REFERENCES users(id) ON DELETE SET NULL;

        -- Add a comment to the column
        COMMENT ON COLUMN companies.manager_id IS 'ID of the user assigned as manager for this company/space. Must be an admin or manager role.';

        -- Create an index for better query performance
        CREATE INDEX IF NOT EXISTS idx_companies_manager_id ON companies(manager_id);
    END IF;
END $$;

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'companies'
AND column_name = 'manager_id';

