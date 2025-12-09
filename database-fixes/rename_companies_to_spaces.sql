-- Migration: Rename companies table to spaces and company_id columns to space_id
-- This migration updates the database schema to use "space" terminology instead of "company"
-- Run this migration in your Supabase SQL editor

BEGIN;

-- Step 1: Rename the main companies table to spaces
ALTER TABLE IF EXISTS companies RENAME TO spaces;

-- Step 2: Rename company_services table to space_services
ALTER TABLE IF EXISTS company_services RENAME TO space_services;

-- Step 3: Rename company_id columns to space_id in all tables
-- Note: We'll handle foreign key constraints after renaming columns

-- Users table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE users RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Projects table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE projects RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Documents table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'documents' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE documents RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Rich documents table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'rich_documents' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE rich_documents RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Space bookmarks table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'space_bookmarks' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE space_bookmarks RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Form submissions table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_submissions' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE form_submissions RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Activity logs table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_logs' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE activity_logs RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Internal user companies table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'internal_user_companies' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE internal_user_companies RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Space services table (formerly company_services)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'space_services' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE space_services RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Google Ads metrics cache table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'google_ads_metrics_cache' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE google_ads_metrics_cache RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Meta Ads metrics cache table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'meta_ads_metrics_cache' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE meta_ads_metrics_cache RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Shopify metrics cache table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'shopify_metrics_cache' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE shopify_metrics_cache RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- User invitations table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_invitations' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE user_invitations RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Space dashboard config table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'space_dashboard_config' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE space_dashboard_config RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Dashboard notes table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dashboard_notes' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE dashboard_notes RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Dashboard links table (if it exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'dashboard_links' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE dashboard_links RENAME COLUMN company_id TO space_id;
    END IF;
END $$;

-- Step 4: Drop and recreate foreign key constraints with new names
-- This ensures all foreign keys point to the renamed tables/columns

-- Drop existing foreign key constraints (we'll recreate them)
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop foreign keys that reference companies table
    FOR r IN (
        SELECT constraint_name, table_name
        FROM information_schema.table_constraints
        WHERE constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%company%'
    ) LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', r.table_name, r.constraint_name);
    END LOOP;
END $$;

-- Recreate foreign key constraints pointing to spaces table
-- Users -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Projects -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE projects 
        ADD CONSTRAINT projects_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Documents -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE documents 
        ADD CONSTRAINT documents_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Rich documents -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rich_documents') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rich_documents' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE rich_documents 
        ADD CONSTRAINT rich_documents_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Space bookmarks -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'space_bookmarks') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_bookmarks' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE space_bookmarks 
        ADD CONSTRAINT space_bookmarks_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Form submissions -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'form_submissions') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'form_submissions' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE form_submissions 
        ADD CONSTRAINT form_submissions_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Activity logs -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_logs') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_logs' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE activity_logs 
        ADD CONSTRAINT activity_logs_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Internal user companies -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_user_companies') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'internal_user_companies' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE internal_user_companies 
        ADD CONSTRAINT internal_user_companies_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Space services -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'space_services') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_services' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE space_services 
        ADD CONSTRAINT space_services_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Google Ads metrics cache -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'google_ads_metrics_cache') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'google_ads_metrics_cache' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE google_ads_metrics_cache 
        ADD CONSTRAINT google_ads_metrics_cache_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Meta Ads metrics cache -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'meta_ads_metrics_cache') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'meta_ads_metrics_cache' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE meta_ads_metrics_cache 
        ADD CONSTRAINT meta_ads_metrics_cache_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Shopify metrics cache -> spaces
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shopify_metrics_cache') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopify_metrics_cache' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE shopify_metrics_cache 
        ADD CONSTRAINT shopify_metrics_cache_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- User invitations -> spaces (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_invitations') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_invitations' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE user_invitations 
        ADD CONSTRAINT user_invitations_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Space dashboard config -> spaces (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'space_dashboard_config') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'space_dashboard_config' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE space_dashboard_config 
        ADD CONSTRAINT space_dashboard_config_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Dashboard notes -> spaces (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_notes') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_notes' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE dashboard_notes 
        ADD CONSTRAINT dashboard_notes_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Dashboard links -> spaces (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dashboard_links') 
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dashboard_links' AND column_name = 'space_id')
    AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
        ALTER TABLE dashboard_links 
        ADD CONSTRAINT dashboard_links_space_id_fkey 
        FOREIGN KEY (space_id) REFERENCES spaces(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 5: Update unique constraint on space_services table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'space_services') THEN
        -- Drop old unique constraint if it exists
        ALTER TABLE space_services DROP CONSTRAINT IF EXISTS company_services_company_id_service_id_key;
        ALTER TABLE space_services DROP CONSTRAINT IF EXISTS space_services_company_id_service_id_key;
        
        -- Add new unique constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'space_services_space_id_service_id_key'
        ) THEN
            ALTER TABLE space_services 
            ADD CONSTRAINT space_services_space_id_service_id_key 
            UNIQUE (space_id, service_id);
        END IF;
    END IF;
END $$;

-- Step 6: Update indexes (rename if they reference company_id)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE indexname LIKE '%company%'
        AND schemaname = 'public'
    ) LOOP
        -- Rename index to use space terminology
        EXECUTE format('ALTER INDEX IF EXISTS %I RENAME TO %I', 
            r.indexname, 
            replace(r.indexname, 'company', 'space')
        );
    END LOOP;
END $$;

-- Step 7: Update RLS policies (this is a simplified version - you may need to adjust based on your specific policies)
-- Note: RLS policies are typically managed through Supabase dashboard or separate migration files
-- This section provides a template for updating policy names

COMMENT ON TABLE spaces IS 'Spaces table (formerly companies) - represents client workspaces';
COMMENT ON TABLE space_services IS 'Junction table linking spaces to services (formerly company_services)';
COMMENT ON COLUMN users.space_id IS 'Reference to space (formerly company_id)';
COMMENT ON COLUMN projects.space_id IS 'Reference to space (formerly company_id)';
COMMENT ON COLUMN documents.space_id IS 'Reference to space (formerly company_id)';
COMMENT ON COLUMN form_submissions.space_id IS 'Reference to space (formerly company_id)';
COMMENT ON COLUMN activity_logs.space_id IS 'Reference to space (formerly company_id)';

COMMIT;

-- Verification queries (run these after migration to verify):
-- SELECT table_name, column_name FROM information_schema.columns WHERE column_name = 'space_id' ORDER BY table_name;
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('spaces', 'space_services');
-- SELECT constraint_name, table_name FROM information_schema.table_constraints WHERE constraint_name LIKE '%space%';

