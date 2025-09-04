-- Fix RLS on Companies Table for Custom Auth
-- This script fixes RLS specifically on the companies table

-- Step 1: Drop all existing policies on companies table
DROP POLICY IF EXISTS "Allow all authenticated users to access companies" ON companies;
DROP POLICY IF EXISTS "Admin users see all companies, others see own company" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Admins can perform all operations on companies" ON companies;
DROP POLICY IF EXISTS "Allow access based on custom auth" ON companies;

-- Step 2: Create a simple policy that allows all authenticated users
-- Since we're using custom auth, we'll allow all authenticated users
CREATE POLICY "Allow all authenticated users to access companies" ON companies
FOR ALL USING (auth.role() = 'authenticated');

-- Step 3: Verify the policy was created
SELECT '=== VERIFYING COMPANIES POLICY ===' as info;
SELECT 
  tablename,
  policyname,
  permissive,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual
    ELSE 'No USING clause'
  END as policy_logic
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY policyname;

-- Step 4: Test access to companies
SELECT '=== TESTING COMPANIES ACCESS ===' as info;
SELECT COUNT(*) as company_count FROM companies;
SELECT id, name FROM companies LIMIT 5;

SELECT 'COMPANIES RLS FIXED! Should now be accessible.' as final_status;
