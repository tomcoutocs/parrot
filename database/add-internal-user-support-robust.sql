-- Add Internal User Support (Robust Migration)
-- This migration safely adds support for internal users who can be assigned to multiple companies
-- It handles ALL possible conflicts and existing objects

-- Step 1: Create the internal_user_companies junction table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS internal_user_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, company_id)
);

-- Step 2: Create indexes for performance (if they don't exist)
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_user_id ON internal_user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_company_id ON internal_user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_primary ON internal_user_companies(user_id, is_primary);

-- Step 3: Enable Row Level Security (if not already enabled)
ALTER TABLE internal_user_companies ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL existing policies with any name that might conflict
-- This is the most robust approach - drop everything and recreate
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop all existing policies on the table
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'internal_user_companies'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON internal_user_companies', policy_record.policyname);
        RAISE NOTICE 'Dropped existing policy: %', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE 'All existing policies dropped successfully';
END $$;

-- Step 5: Create RLS policies for internal_user_companies
-- Policy: Users can view their own company assignments
CREATE POLICY "Users can view own company assignments" ON internal_user_companies
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Admins can manage all company assignments
CREATE POLICY "Admins can manage company assignments" ON internal_user_companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )
    );

-- Policy: Managers can manage company assignments for their company users
CREATE POLICY "Managers can manage company assignments for their company" ON internal_user_companies
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'manager'
            AND users.company_id = internal_user_companies.company_id
        )
    );

-- Step 6: Verify the migration
SELECT 'Migration completed successfully' as status;
SELECT 'internal_user_companies table status:' as info, 
       CASE 
           WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_user_companies') 
           THEN 'Table exists' 
           ELSE 'Table missing' 
       END as table_status;

-- Step 7: Show existing users and their roles for verification
SELECT 'Existing users and roles:' as info;
SELECT id, email, full_name, role FROM users ORDER BY role, full_name;

-- Step 8: Check if any internal users already exist
SELECT 'Internal users check:' as info;
SELECT COUNT(*) as internal_user_count FROM users WHERE role = 'internal';

-- Step 9: Check internal_user_companies table structure
SELECT 'internal_user_companies table structure:' as info;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'internal_user_companies' 
ORDER BY ordinal_position;

-- Step 10: Verify RLS and policies
SELECT 'RLS and policies verification:' as info;
SELECT 
    'RLS enabled: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'internal_user_companies' AND rowsecurity = true
        ) 
        THEN 'YES' 
        ELSE 'NO' 
    END as rls_status,
    
    'Policies count: ' || 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'internal_user_companies') as policies_count;

-- Step 11: Test insert capability
SELECT 'Testing insert capability...' as info;
DO $$
DECLARE
    test_user_id UUID;
    test_company_id UUID;
    test_admin_id UUID;
    insert_result RECORD;
BEGIN
    -- Get a test user
    SELECT id INTO test_user_id FROM users WHERE role = 'admin' LIMIT 1;
    
    -- Get a test company
    SELECT id INTO test_company_id FROM companies LIMIT 1;
    
    -- Get an admin user for assigned_by
    SELECT id INTO test_admin_id FROM users WHERE role = 'admin' LIMIT 1;
    
    IF test_user_id IS NULL THEN
        RAISE NOTICE 'WARNING: No admin users found for testing';
        RETURN;
    END IF;
    
    IF test_company_id IS NULL THEN
        RAISE NOTICE 'WARNING: No companies found for testing';
        RETURN;
    END IF;
    
    -- Try to insert a test record
    BEGIN
        INSERT INTO internal_user_companies (user_id, company_id, is_primary, assigned_by)
        VALUES (test_user_id, test_company_id, true, test_admin_id)
        RETURNING * INTO insert_result;
        
        RAISE NOTICE 'SUCCESS: Test insert successful, ID: %', insert_result.id;
        
        -- Clean up test record
        DELETE FROM internal_user_companies WHERE id = insert_result.id;
        RAISE NOTICE 'Test record cleaned up successfully';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: Test insert failed with error: %', SQLERRM;
    END;
END $$;
