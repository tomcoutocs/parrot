-- Migration: Add is_internal column to documents and rich_documents tables
-- This migration adds the is_internal column to support internal/external document visibility

-- Add is_internal column to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN documents.is_internal IS 'Whether this document is internal (only visible to admins, managers, and internal users)';

-- Set existing documents to external (false) by default
UPDATE documents 
SET is_internal = FALSE 
WHERE is_internal IS NULL;

-- Add is_internal column to rich_documents table
ALTER TABLE rich_documents 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT FALSE;

-- Add comment to column
COMMENT ON COLUMN rich_documents.is_internal IS 'Whether this document is internal (only visible to admins, managers, and internal users)';

-- Set existing rich documents to external (false) by default
UPDATE rich_documents 
SET is_internal = FALSE 
WHERE is_internal IS NULL;

