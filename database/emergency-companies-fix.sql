-- Emergency Fix: Disable RLS on Companies Table
-- This script disables RLS on the companies table completely

-- Step 1: Disable RLS on companies table completely
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on companies table
DROP POLICY IF EXISTS "Allow all authenticated users to access companies" ON companies;
DROP POLICY IF EXISTS "Admin users see all companies, others see own company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can perform all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON companies;

-- Step 3: Create a simple policy that allows all access to companies table
CREATE POLICY "Allow all access to companies" ON companies
FOR ALL USING (true);

-- Step 4: Verify the fix
SELECT '=== VERIFYING COMPANIES FIX ===' as info;
SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'companies';

-- Step 5: Test access to companies
SELECT '=== TESTING COMPANIES ACCESS ===' as info;
SELECT COUNT(*) as company_count FROM companies;
SELECT id, name FROM companies LIMIT 5;

SELECT 'EMERGENCY COMPANIES FIX COMPLETE! Companies should now be accessible.' as final_status;
