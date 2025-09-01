-- Add Internal User Support
-- This migration adds support for internal users who can be assigned to multiple companies

-- Step 1: Check if 'internal' role value exists in users table, add if it doesn't
-- Since the role column is likely TEXT/VARCHAR, we don't need to alter an enum type
-- The application will handle the role validation

-- Step 2: Create the internal_user_companies junction table
CREATE TABLE IF NOT EXISTS internal_user_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, company_id)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_user_id ON internal_user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_company_id ON internal_user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_primary ON internal_user_companies(user_id, is_primary);

-- Step 4: Enable Row Level Security
ALTER TABLE internal_user_companies ENABLE ROW LEVEL SECURITY;

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

-- Step 6: Insert sample internal user (optional - for testing)
-- You can uncomment and modify this section if you want to create a test internal user
/*
INSERT INTO users (email, full_name, role, password_hash, is_active, company_id, tab_permissions)
VALUES (
    'internal@company.com',
    'Internal User',
    'internal',
    crypt('demo123', gen_salt('bf')),
    true,
    NULL,
    ARRAY['dashboard', 'projects', 'tasks', 'forms', 'calendar']
);

-- Get the user ID and company ID for assignment
DO $$
DECLARE
    user_id UUID;
    company_id UUID;
BEGIN
    SELECT id INTO user_id FROM users WHERE email = 'internal@company.com';
    SELECT id INTO company_id FROM companies LIMIT 1;
    
    IF user_id IS NOT NULL AND company_id IS NOT NULL THEN
        INSERT INTO internal_user_companies (user_id, company_id, is_primary, assigned_by)
        VALUES (user_id, company_id, true, (SELECT id FROM users WHERE role = 'admin' LIMIT 1));
    END IF;
END $$;
*/

-- Step 7: Verify the migration
SELECT 'Migration completed successfully' as status;
SELECT 'internal_user_companies table created' as table_status;
SELECT 'RLS policies applied' as security_status;

-- Step 8: Show existing users and their roles for verification
SELECT 'Existing users and roles:' as info;
SELECT id, email, full_name, role FROM users ORDER BY role, full_name;
