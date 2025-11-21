-- SQL Script to Add position Column to projects Table
-- This allows projects to be reordered via drag and drop.
-- Run this in your Supabase SQL Editor.

DO $$
BEGIN
    -- Check if the column doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
        AND column_name = 'position'
    ) THEN
        -- Add the position column as an integer with default value
        ALTER TABLE projects
        ADD COLUMN position INTEGER NOT NULL DEFAULT 0;

        -- Add a comment to the column
        COMMENT ON COLUMN projects.position IS 'Display order for projects. Lower numbers appear first. Used for drag and drop reordering.';

        -- Create an index for better query performance
        CREATE INDEX IF NOT EXISTS idx_projects_position ON projects(company_id, position);

        -- Update existing projects to have sequential positions based on creation date
        WITH numbered_projects AS (
            SELECT 
                id,
                ROW_NUMBER() OVER (PARTITION BY company_id ORDER BY created_at ASC) as row_num
            FROM projects
        )
        UPDATE projects
        SET position = numbered_projects.row_num - 1
        FROM numbered_projects
        WHERE projects.id = numbered_projects.id;
    END IF;
END $$;

-- Verify the column was added
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'projects'
AND column_name = 'position';

