-- Migration: Add is_internal column to document_folders table
-- This migration adds the is_internal column to support internal/external folder visibility

-- Add is_internal column to document_folders table
ALTER TABLE document_folders 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN document_folders.is_internal IS 'Whether this folder is internal (only visible to admins, managers, and internal users)';

-- Set existing folders to external (false) by default
UPDATE document_folders 
SET is_internal = FALSE 
WHERE is_internal IS NULL;

-- Make sure system folders are always external
UPDATE document_folders 
SET is_internal = FALSE 
WHERE is_system_folder = TRUE;

