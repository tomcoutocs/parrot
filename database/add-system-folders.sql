-- Add system folder support to document_folders table
-- This allows creating folders that are visible to all companies

-- Add columns for system folders
ALTER TABLE document_folders 
ADD COLUMN IF NOT EXISTS is_system_folder BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_readonly BOOLEAN DEFAULT FALSE;

-- Allow company_id to be null for system folders
ALTER TABLE document_folders ALTER COLUMN company_id DROP NOT NULL;

-- Create index for system folders
CREATE INDEX IF NOT EXISTS idx_document_folders_system ON document_folders(is_system_folder);

-- Update RLS policies to allow access to system folders
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view folders in their company" ON document_folders;
DROP POLICY IF EXISTS "Users can create folders in their company" ON document_folders;
DROP POLICY IF EXISTS "Users can update folders in their company" ON document_folders;
DROP POLICY IF EXISTS "Users can delete folders in their company" ON document_folders;

-- Create new policies that include system folders
CREATE POLICY "Users can view folders in their company and system folders" ON document_folders
    FOR SELECT USING (
        company_id = auth.jwt() ->> 'company_id'::text 
        OR is_system_folder = true
    );

CREATE POLICY "Users can create folders in their company" ON document_folders
    FOR INSERT WITH CHECK (
        company_id = auth.jwt() ->> 'company_id'::text
        AND is_system_folder = false
    );

CREATE POLICY "Users can update folders in their company" ON document_folders
    FOR UPDATE USING (
        company_id = auth.jwt() ->> 'company_id'::text
        AND is_system_folder = false
    );

CREATE POLICY "Users can delete folders in their company" ON document_folders
    FOR DELETE USING (
        company_id = auth.jwt() ->> 'company_id'::text
        AND is_system_folder = false
    );

-- Create the "Setup Instructions" system folder
INSERT INTO document_folders (
    id,
    name,
    company_id,
    parent_folder_id,
    path,
    created_by,
    created_at,
    updated_at,
    is_system_folder,
    is_readonly
) VALUES (
    gen_random_uuid(),
    'Setup Instructions',
    NULL,
    NULL,
    '/Setup Instructions',
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
    NOW(),
    NOW(),
    true,
    true
) ON CONFLICT (name, is_system_folder) DO NOTHING;

-- Add comments
COMMENT ON COLUMN document_folders.is_system_folder IS 'Indicates if this is a system-wide folder visible to all companies';
COMMENT ON COLUMN document_folders.is_readonly IS 'Indicates if this folder is read-only and cannot be modified';

-- Success message
SELECT 'System folders support added successfully! Setup Instructions folder created.' as status;
