-- Recreate RLS Policies for Internal User Companies
-- This script creates the RLS policies from scratch since they were dropped

-- Step 1: Verify current status
SELECT '=== CURRENT STATUS ===' as info;

SELECT 
    'Table exists: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_user_companies') 
        THEN 'YES' 
        ELSE 'NO' 
    END as table_status,
    
    'RLS enabled: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'internal_user_companies' AND rowsecurity = true
        ) 
        THEN 'YES' 
        ELSE 'NO' 
    END as rls_status,
    
    'Existing policies: ' || 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'internal_user_companies') as policies_count;

-- Step 2: Ensure RLS is enabled
ALTER TABLE internal_user_companies ENABLE ROW LEVEL SECURITY;

-- Step 3: Create robust RLS policies
SELECT '=== CREATING RLS POLICIES ===' as info;

-- Policy 1: Users can view own company assignments
CREATE POLICY "Users can view own company assignments" ON internal_user_companies
    FOR SELECT USING (
        -- Allow if user is viewing their own assignments
        (auth.uid() IS NOT NULL AND user_id = auth.uid()) OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Policy 2: Admins can manage all company assignments
CREATE POLICY "Admins can manage company assignments" ON internal_user_companies
    FOR ALL USING (
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Policy 3: Managers can manage company assignments for their company users
CREATE POLICY "Managers can manage company assignments for their company" ON internal_user_companies
    FOR ALL USING (
        -- Allow if user is manager for the company
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'manager'
            AND users.company_id = internal_user_companies.company_id
        )) OR
        -- Allow if user is admin
        (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role = 'admin'
        )) OR
        -- Allow if no auth context (for service role operations)
        auth.uid() IS NULL
    );

-- Step 4: Verify policies were created
SELECT '=== VERIFYING POLICIES ===' as info;
SELECT 
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'USING: ' || qual
        ELSE 'No USING clause'
    END as policy_logic
FROM pg_policies 
WHERE tablename = 'internal_user_companies'
ORDER BY policyname;

-- Step 5: Test insert capability
SELECT '=== TESTING INSERT CAPABILITY ===' as info;
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

-- Step 6: Final status check
SELECT '=== FINAL STATUS ===' as info;
SELECT 
    'Table exists: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_user_companies') 
        THEN 'YES' 
        ELSE 'NO' 
    END as table_status,
    
    'RLS enabled: ' || 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE tablename = 'internal_user_companies' AND rowsecurity = true
        ) 
        THEN 'YES' 
        ELSE 'NO' 
    END as rls_status,
    
    'Policies created: ' || 
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'internal_user_companies') as policies_count;

-- Step 7: Show policy details for verification
SELECT '=== POLICY DETAILS ===' as info;
SELECT 
    policyname,
    permissive,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'internal_user_companies'
ORDER BY policyname;
