-- SQL Script to Create space_bookmarks Table
-- This allows each space (company) to have shared bookmarks that all users in the space can see.
-- Run this in your Supabase SQL Editor.

DO $$
BEGIN
    -- Check if the table doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'space_bookmarks'
    ) THEN
        -- Create the space_bookmarks table
        CREATE TABLE space_bookmarks (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            name VARCHAR(255) NOT NULL,
            url TEXT NOT NULL,
            icon_name VARCHAR(50) NOT NULL DEFAULT 'ExternalLink',
            color VARCHAR(7) NOT NULL DEFAULT '#6b7280',
            favicon_url TEXT,
            position INTEGER NOT NULL DEFAULT 0,
            created_by UUID REFERENCES users(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Add a comment to the table
        COMMENT ON TABLE space_bookmarks IS 'Shared bookmarks for each space/company. All users in a space can view and manage these bookmarks.';

        -- Create indexes for better query performance
        CREATE INDEX idx_space_bookmarks_company_id ON space_bookmarks(company_id);
        CREATE INDEX idx_space_bookmarks_position ON space_bookmarks(company_id, position);
    END IF;
END $$;

-- Create a function to update the updated_at timestamp (must be outside DO block due to delimiter conflicts)
CREATE OR REPLACE FUNCTION update_space_bookmarks_updated_at()
RETURNS TRIGGER AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_space_bookmarks_updated_at ON space_bookmarks;
CREATE TRIGGER trigger_update_space_bookmarks_updated_at
    BEFORE UPDATE ON space_bookmarks
    FOR EACH ROW
    EXECUTE FUNCTION update_space_bookmarks_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE space_bookmarks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view bookmarks for their company" ON space_bookmarks;
DROP POLICY IF EXISTS "Users can insert bookmarks for their company" ON space_bookmarks;
DROP POLICY IF EXISTS "Users can update bookmarks for their company" ON space_bookmarks;
DROP POLICY IF EXISTS "Users can delete bookmarks for their company" ON space_bookmarks;

-- Create RLS policies
-- Policy: Users can view bookmarks for companies they belong to
CREATE POLICY "Users can view bookmarks for their company"
    ON space_bookmarks
    FOR SELECT
    USING (
        company_id IN (
            -- Get user's company_id (for regular users)
            SELECT company_id FROM users WHERE id = auth.uid() AND company_id IS NOT NULL
            UNION
            -- Get companies assigned to internal users
            SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
            UNION
            -- Admins can see all
            SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can insert bookmarks for companies they belong to
CREATE POLICY "Users can insert bookmarks for their company"
    ON space_bookmarks
    FOR INSERT
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND company_id IS NOT NULL
            UNION
            SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
            UNION
            SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can update bookmarks for companies they belong to
CREATE POLICY "Users can update bookmarks for their company"
    ON space_bookmarks
    FOR UPDATE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND company_id IS NOT NULL
            UNION
            SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
            UNION
            SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Policy: Users can delete bookmarks for companies they belong to
CREATE POLICY "Users can delete bookmarks for their company"
    ON space_bookmarks
    FOR DELETE
    USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid() AND company_id IS NOT NULL
            UNION
            SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
            UNION
            SELECT id FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Verify the table was created
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'space_bookmarks'
ORDER BY ordinal_position;

