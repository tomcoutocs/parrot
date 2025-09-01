-- Test Internal User Setup
-- Run this to verify everything is working correctly

-- Test 1: Check if the table exists
SELECT 'Test 1: Table existence check' as test_name;
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_user_companies') 
        THEN 'PASS: internal_user_companies table exists' 
        ELSE 'FAIL: internal_user_companies table missing' 
    END as result;

-- Test 2: Check table structure
SELECT 'Test 2: Table structure check' as test_name;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'internal_user_companies' 
ORDER BY ordinal_position;

-- Test 3: Check RLS status
SELECT 'Test 3: RLS status check' as test_name;
SELECT 
    CASE 
        WHEN rowsecurity = true 
        THEN 'PASS: RLS is enabled' 
        ELSE 'FAIL: RLS is disabled' 
    END as result
FROM pg_tables 
WHERE tablename = 'internal_user_companies';

-- Test 4: Check policies
SELECT 'Test 4: RLS policies check' as test_name;
SELECT 
    policyname,
    permissive,
    cmd,
    CASE 
        WHEN policyname IS NOT NULL 
        THEN 'PASS: Policy exists' 
        ELSE 'FAIL: No policies found' 
    END as status
FROM pg_policies 
WHERE tablename = 'internal_user_companies';

-- Test 5: Check if we can insert a test record
SELECT 'Test 5: Insert permission check' as test_name;

-- Get sample user and company IDs
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
        RAISE NOTICE 'FAIL: No admin users found for testing';
        RETURN;
    END IF;
    
    IF test_company_id IS NULL THEN
        RAISE NOTICE 'FAIL: No companies found for testing';
        RETURN;
    END IF;
    
    -- Try to insert a test record
    BEGIN
        INSERT INTO internal_user_companies (user_id, company_id, is_primary, assigned_by)
        VALUES (test_user_id, test_company_id, true, test_admin_id)
        RETURNING * INTO insert_result;
        
        RAISE NOTICE 'PASS: Test insert successful, ID: %', insert_result.id;
        
        -- Clean up test record
        DELETE FROM internal_user_companies WHERE id = insert_result.id;
        RAISE NOTICE 'Test record cleaned up';
        
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'FAIL: Test insert failed with error: %', SQLERRM;
    END;
END $$;

-- Test 6: Show current data
SELECT 'Test 6: Current data check' as test_name;
SELECT 
    CASE 
        WHEN COUNT(*) > 0 
        THEN 'PASS: Table contains data' 
        ELSE 'PASS: Table is empty (expected for new setup)' 
    END as result,
    COUNT(*) as record_count
FROM internal_user_companies;

-- Summary
SELECT '=== SUMMARY ===' as summary;
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
    
    'Policies exist: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'internal_user_companies') 
        THEN 'YES' 
        ELSE 'NO' 
    END as policies_status;
