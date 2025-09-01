-- Add Internal User Support (Safe Migration)
-- This migration safely adds support for internal users who can be assigned to multiple companies
-- It handles cases where some objects already exist

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

-- Step 4: Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view own company assignments" ON internal_user_companies;
DROP POLICY IF EXISTS "Admins can manage company assignments" ON internal_user_companies;
DROP POLICY IF EXISTS "Managers can manage company assignments for their company" ON internal_user_companies;

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
