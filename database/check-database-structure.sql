-- Check Database Structure
-- Run this first to understand your current database setup

-- Check if users table exists and its structure
SELECT 'Checking users table structure...' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;

-- Check if companies table exists
SELECT 'Checking companies table...' as info;

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'companies' 
ORDER BY ordinal_position;

-- Check existing users and their roles
SELECT 'Existing users:' as info;
SELECT id, email, full_name, role, company_id, is_active 
FROM users 
ORDER BY role, full_name;

-- Check existing companies
SELECT 'Existing companies:' as info;
SELECT id, name, description, industry, is_active 
FROM companies 
ORDER BY name;

-- Check if internal_user_companies table already exists
SELECT 'Checking if internal_user_companies table exists...' as info;
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'internal_user_companies';

-- Check RLS status on users table
SELECT 'RLS status on users table:' as info;
SELECT 
    schemaname, 
    tablename, 
    rowsecurity 
FROM pg_tables 
WHERE tablename = 'users';
