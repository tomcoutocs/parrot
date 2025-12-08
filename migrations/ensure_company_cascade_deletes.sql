-- Ensure all tables with foreign keys to companies have proper CASCADE behavior
-- This ensures that when a company (space) is deleted, all associated data is also deleted

-- STEP 1: Clean up orphaned records (records with company_id that doesn't exist in companies table)
-- This must be done before adding foreign key constraints
-- All cleanup operations check if the table and column exist before attempting cleanup

-- Clean up orphaned company_services records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_services' AND column_name = 'company_id'
  ) THEN
    DELETE FROM company_services 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned internal_user_companies records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'internal_user_companies' AND column_name = 'company_id'
  ) THEN
    DELETE FROM internal_user_companies 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned projects (delete orphaned projects)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'company_id'
  ) THEN
    DELETE FROM projects 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned documents (delete orphaned documents)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'company_id'
  ) THEN
    DELETE FROM documents 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned space_bookmarks
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'space_bookmarks' AND column_name = 'company_id'
  ) THEN
    DELETE FROM space_bookmarks 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned form_submissions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'company_id'
  ) THEN
    DELETE FROM form_submissions 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned cache records
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'google_ads_metrics_cache' AND column_name = 'company_id'
  ) THEN
    DELETE FROM google_ads_metrics_cache 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'meta_ads_metrics_cache' AND column_name = 'company_id'
  ) THEN
    DELETE FROM meta_ads_metrics_cache 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopify_metrics_cache' AND column_name = 'company_id'
  ) THEN
    DELETE FROM shopify_metrics_cache 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned users (set company_id to NULL instead of deleting users)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    UPDATE users 
    SET company_id = NULL 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- Clean up orphaned activity_logs (set company_id to NULL to preserve audit trail)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activity_logs' AND column_name = 'company_id'
  ) THEN
    UPDATE activity_logs 
    SET company_id = NULL 
    WHERE company_id IS NOT NULL 
    AND company_id NOT IN (SELECT id FROM companies);
  END IF;
END $$;

-- STEP 2: Add/Update foreign key constraints with proper CASCADE behavior

-- Update company_services junction table
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'company_services_company_id_fkey' 
    AND table_name = 'company_services'
  ) THEN
    ALTER TABLE company_services 
    DROP CONSTRAINT company_services_company_id_fkey;
  END IF;
  
  -- Add constraint with CASCADE (only if table exists and has company_id column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'company_services' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE company_services
    ADD CONSTRAINT company_services_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update internal_user_companies junction table
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'internal_user_companies_company_id_fkey' 
    AND table_name = 'internal_user_companies'
  ) THEN
    ALTER TABLE internal_user_companies 
    DROP CONSTRAINT internal_user_companies_company_id_fkey;
  END IF;
  
  -- Add constraint with CASCADE (only if table exists and has company_id column)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'internal_user_companies' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE internal_user_companies
    ADD CONSTRAINT internal_user_companies_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update projects table (if it exists)
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'company_id'
  ) THEN
    -- Find and drop existing constraint
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints 
    WHERE table_name = 'projects' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%company_id%'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
      EXECUTE 'ALTER TABLE projects DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
    
    -- Add constraint with CASCADE
    ALTER TABLE projects
    ADD CONSTRAINT projects_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update documents table (if it exists)
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'company_id'
  ) THEN
    -- Find and drop existing constraint
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints 
    WHERE table_name = 'documents' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%company_id%'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
      EXECUTE 'ALTER TABLE documents DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
    
    -- Add constraint with CASCADE
    ALTER TABLE documents
    ADD CONSTRAINT documents_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update space_bookmarks table (if it exists)
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'space_bookmarks' AND column_name = 'company_id'
  ) THEN
    -- Find and drop existing constraint
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints 
    WHERE table_name = 'space_bookmarks' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%company_id%'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
      EXECUTE 'ALTER TABLE space_bookmarks DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
    
    -- Add constraint with CASCADE
    ALTER TABLE space_bookmarks
    ADD CONSTRAINT space_bookmarks_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update form_submissions table (if it exists)
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'form_submissions' AND column_name = 'company_id'
  ) THEN
    -- Find and drop existing constraint
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints 
    WHERE table_name = 'form_submissions' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%company_id%'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
      EXECUTE 'ALTER TABLE form_submissions DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
    
    -- Add constraint with CASCADE
    ALTER TABLE form_submissions
    ADD CONSTRAINT form_submissions_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Update users table - SET NULL instead of CASCADE (users should persist)
DO $$
DECLARE
  constraint_name_var TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    -- Find and drop existing constraint
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints 
    WHERE table_name = 'users' 
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE '%company_id%'
    LIMIT 1;
    
    IF constraint_name_var IS NOT NULL THEN
      EXECUTE 'ALTER TABLE users DROP CONSTRAINT ' || quote_ident(constraint_name_var);
    END IF;
    
    -- Add constraint with SET NULL
    ALTER TABLE users
    ADD CONSTRAINT users_company_id_fkey 
    FOREIGN KEY (company_id) 
    REFERENCES companies(id) 
    ON DELETE SET NULL;
  END IF;
END $$;

-- Note: activity_logs already has ON DELETE SET NULL (preserves audit trail)
-- Note: Cache tables already have ON DELETE CASCADE (created in create_api_metrics_cache.sql)

