-- Debug Company Data for Internal Users
-- This script helps diagnose why company names are showing as "Unknown"

-- Check if the table exists and has data
SELECT '=== TABLE STATUS ===' as info;
SELECT 
    'Table exists: ' || 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'internal_user_companies') 
        THEN 'YES' 
        ELSE 'NO' 
    END as table_status,
    
    'Record count: ' || 
    (SELECT COUNT(*) FROM internal_user_companies) as record_count;

-- Check the actual data in internal_user_companies
SELECT '=== INTERNAL USER COMPANIES DATA ===' as info;
SELECT 
    iuc.id,
    iuc.user_id,
    iuc.company_id,
    iuc.is_primary,
    iuc.assigned_at,
    iuc.assigned_by
FROM internal_user_companies iuc
ORDER BY iuc.user_id, iuc.is_primary DESC;

-- Check if the companies referenced actually exist
SELECT '=== COMPANY REFERENCES VALIDATION ===' as info;
SELECT 
    iuc.company_id,
    CASE 
        WHEN c.id IS NOT NULL THEN 'EXISTS: ' || c.name
        ELSE 'MISSING: ' || iuc.company_id
    END as company_status
FROM internal_user_companies iuc
LEFT JOIN companies c ON iuc.company_id = c.id
ORDER BY iuc.company_id;

-- Check the users who should have company assignments
SELECT '=== USERS WITH INTERNAL ROLE ===' as info;
SELECT 
    u.id,
    u.email,
    u.full_name,
    u.role,
    u.company_id
FROM users u
WHERE u.role = 'internal'
ORDER BY u.full_name;

-- Test the join query that the application is trying to use
SELECT '=== TESTING JOIN QUERY ===' as info;
SELECT 
    iuc.id,
    iuc.user_id,
    iuc.company_id,
    iuc.is_primary,
    c.name as company_name,
    c.id as company_id_from_join
FROM internal_user_companies iuc
LEFT JOIN companies c ON iuc.company_id = c.id
ORDER BY iuc.user_id, iuc.is_primary DESC;

-- Check if there are any data type mismatches
SELECT '=== DATA TYPE CHECK ===' as info;
SELECT 
    'internal_user_companies.company_id type: ' || 
    (SELECT data_type FROM information_schema.columns 
     WHERE table_name = 'internal_user_companies' AND column_name = 'company_id') as company_id_type,
    
    'companies.id type: ' || 
    (SELECT data_type FROM information_schema.columns 
     WHERE table_name = 'companies' AND column_name = 'id') as companies_id_type;

-- Show sample data for debugging
SELECT '=== SAMPLE DATA FOR DEBUGGING ===' as info;
SELECT 
    'User: ' || u.full_name || ' (' || u.email || ')' as user_info,
    'Role: ' || u.role as user_role,
    'Company assignments: ' || 
    (SELECT COUNT(*) FROM internal_user_companies WHERE user_id = u.id) as assignment_count
FROM users u
WHERE u.role = 'internal'
LIMIT 5;
