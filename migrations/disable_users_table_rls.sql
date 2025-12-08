-- Migration: Disable RLS on users table
-- Authorization will be handled at the application level via admin checks in deleteUser function

-- Step 1: Drop all existing RLS policies on users table
DO $$
DECLARE
  policy_name TEXT;
BEGIN
  -- Get all policy names and drop them
  FOR policy_name IN
    SELECT policyname
    FROM pg_policies
    WHERE tablename = 'users'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON users CASCADE', policy_name);
      RAISE NOTICE 'Dropped policy: %', policy_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policy %: %', policy_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 2: Also try dropping policies directly from pg_policy system catalog
DO $$
DECLARE
  pol_name TEXT;
BEGIN
  FOR pol_name IN
    SELECT pol.polname
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    WHERE cls.relname = 'users'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON users', pol_name);
      RAISE NOTICE 'Dropped policy from pg_policy: %', pol_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error dropping policy %: %', pol_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- Step 3: Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Step 4: Verify RLS is disabled
DO $$
DECLARE
  rls_enabled BOOLEAN;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'users';
  
  IF rls_enabled THEN
    RAISE WARNING 'RLS is still enabled on users table. Manual intervention may be required.';
  ELSE
    RAISE NOTICE 'RLS successfully disabled on users table ✓';
  END IF;
END $$;

-- Note: User deletion authorization is now handled in the application code
-- The deleteUser() function in src/lib/database-functions.ts checks:
-- 1. Current user is an admin
-- 2. User is not deleting themselves
-- 3. Proper cleanup of related data before deletion
