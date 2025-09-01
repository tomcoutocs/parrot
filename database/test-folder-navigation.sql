-- Test Folder Navigation
-- This script tests the folder navigation functionality

-- Step 1: Check current data
SELECT '=== CURRENT FOLDER DATA ===' as info;

SELECT 
  id,
  name,
  path,
  parent_folder_id,
  company_id
FROM document_folders
ORDER BY path;

-- Step 2: Create test folder structure
SELECT '=== CREATING TEST FOLDER STRUCTURE ===' as info;

-- Get the default company ID
DO $$
DECLARE
  company_id UUID;
  admin_user_id UUID;
  test_folder_id UUID;
  subfolder_id UUID;
BEGIN
  -- Get company ID
  SELECT id INTO company_id FROM companies WHERE name = 'Default Company' LIMIT 1;
  
  -- Get admin user ID
  SELECT id INTO admin_user_id FROM users WHERE email = 'admin@company.com' LIMIT 1;
  
  IF company_id IS NOT NULL AND admin_user_id IS NOT NULL THEN
    -- Create a test folder
    INSERT INTO document_folders (name, company_id, path, created_by) 
    VALUES ('Test Folder', company_id, '/Test Folder', admin_user_id)
    RETURNING id INTO test_folder_id;
    
    RAISE NOTICE 'Created test folder with ID: %', test_folder_id;
    
    -- Create a subfolder
    INSERT INTO document_folders (name, company_id, parent_folder_id, path, created_by) 
    VALUES ('Subfolder', company_id, test_folder_id, '/Test Folder/Subfolder', admin_user_id)
    RETURNING id INTO subfolder_id;
    
    RAISE NOTICE 'Created subfolder with ID: %', subfolder_id;
    
  ELSE
    RAISE NOTICE 'Could not find company or admin user';
  END IF;
END $$;

-- Step 3: Test path-based queries
SELECT '=== TESTING PATH-BASED QUERIES ===' as info;

-- Test 1: Get root folders
SELECT 'Root folders:' as test_name;
SELECT 
  id,
  name,
  path,
  parent_folder_id
FROM document_folders
WHERE company_id = (SELECT id FROM companies WHERE name = 'Default Company' LIMIT 1)
  AND parent_folder_id IS NULL
ORDER BY name;

-- Test 2: Get folders in "/Test Folder"
SELECT 'Folders in "/Test Folder":' as test_name;
DO $$
DECLARE
  company_id UUID;
  parent_folder_id UUID;
BEGIN
  -- Get company ID
  SELECT id INTO company_id FROM companies WHERE name = 'Default Company' LIMIT 1;
  
  -- Find the parent folder by path
  SELECT id INTO parent_folder_id FROM document_folders 
  WHERE company_id = company_id AND path = '/Test Folder' LIMIT 1;
  
  IF parent_folder_id IS NOT NULL THEN
    RAISE NOTICE 'Found parent folder ID: %', parent_folder_id;
    
    -- Get child folders
    RAISE NOTICE 'Child folders:';
    FOR folder_record IN 
      SELECT id, name, path, parent_folder_id
      FROM document_folders
      WHERE company_id = company_id AND parent_folder_id = parent_folder_id
      ORDER BY name
    LOOP
      RAISE NOTICE '  ID: %, Name: %, Path: %', folder_record.id, folder_record.name, folder_record.path;
    END LOOP;
  ELSE
    RAISE NOTICE 'Parent folder not found';
  END IF;
END $$;

-- Test 3: Test the exact query that the application uses
SELECT '=== TESTING APPLICATION QUERY ===' as info;

DO $$
DECLARE
  company_id UUID;
  parent_folder_id UUID;
  folder_count INTEGER;
BEGIN
  -- Get company ID
  SELECT id INTO company_id FROM companies WHERE name = 'Default Company' LIMIT 1;
  
  -- Simulate the application query for "/Test Folder"
  SELECT id INTO parent_folder_id FROM document_folders 
  WHERE company_id = company_id AND path = '/Test Folder' LIMIT 1;
  
  IF parent_folder_id IS NOT NULL THEN
    -- Count folders with this parent
    SELECT COUNT(*) INTO folder_count FROM document_folders 
    WHERE company_id = company_id AND parent_folder_id = parent_folder_id;
    
    RAISE NOTICE 'SUCCESS: Found % folders in "/Test Folder"', folder_count;
  ELSE
    RAISE NOTICE 'ERROR: Could not find parent folder "/Test Folder"';
  END IF;
  
  -- Test root level query
  SELECT COUNT(*) INTO folder_count FROM document_folders 
  WHERE company_id = company_id AND parent_folder_id IS NULL;
  
  RAISE NOTICE 'SUCCESS: Found % folders at root level', folder_count;
END $$;

-- Step 4: Clean up test data
SELECT '=== CLEANING UP TEST DATA ===' as info;

DELETE FROM document_folders WHERE name IN ('Test Folder', 'Subfolder');

-- Step 5: Final verification
SELECT '=== FINAL VERIFICATION ===' as info;

SELECT 
  'Remaining folders: ' || COUNT(*)::text as folder_count
FROM document_folders;

-- Final status
SELECT '=== FOLDER NAVIGATION TEST COMPLETE ===' as status;
SELECT 'Path-based folder queries should now work correctly.' as message;
