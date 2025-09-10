-- Fix Document Ownership Issue
-- This script fixes the document ownership problem where documents are assigned to wrong users

-- Step 1: Check current state
SELECT '=== CURRENT DOCUMENT OWNERSHIP STATE ===' as info;

SELECT 
  d.id,
  d.name,
  d.uploaded_by,
  u.full_name as current_owner,
  u.email as owner_email,
  d.created_at
FROM documents d
LEFT JOIN users u ON d.uploaded_by = u.id
ORDER BY d.created_at DESC
LIMIT 10;

-- Step 2: Create a function to fix document ownership
CREATE OR REPLACE FUNCTION fix_document_ownership()
RETURNS TABLE(
  document_id UUID,
  document_name TEXT,
  old_owner_id UUID,
  old_owner_name TEXT,
  new_owner_id UUID,
  new_owner_name TEXT,
  status TEXT
) AS $$
DECLARE
  doc_record RECORD;
  admin_user_id UUID;
  fix_count INTEGER := 0;
BEGIN
  -- Get the admin user ID (assuming first admin user)
  SELECT id INTO admin_user_id
  FROM users
  WHERE role = 'admin'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF admin_user_id IS NULL THEN
    RAISE EXCEPTION 'No admin user found';
  END IF;
  
  -- Loop through documents with problematic ownership
  FOR doc_record IN 
    SELECT d.id, d.name, d.uploaded_by, u.full_name as owner_name
    FROM documents d
    LEFT JOIN users u ON d.uploaded_by = u.id
    WHERE d.uploaded_by IS NULL 
       OR u.id IS NULL
       OR u.full_name ILIKE '%tom%'
       OR d.uploaded_by = ''
  LOOP
    -- Update the document ownership
    UPDATE documents 
    SET uploaded_by = admin_user_id,
        updated_at = NOW()
    WHERE id = doc_record.id;
    
    fix_count := fix_count + 1;
    
    -- Return the fix information
    document_id := doc_record.id;
    document_name := doc_record.name;
    old_owner_id := doc_record.uploaded_by;
    old_owner_name := doc_record.owner_name;
    new_owner_id := admin_user_id;
    new_owner_name := (SELECT full_name FROM users WHERE id = admin_user_id);
    status := 'FIXED';
    
    RETURN NEXT;
  END LOOP;
  
  -- If no documents were fixed, return a status message
  IF fix_count = 0 THEN
    document_id := NULL;
    document_name := 'No documents needed fixing';
    old_owner_id := NULL;
    old_owner_name := NULL;
    new_owner_id := NULL;
    new_owner_name := NULL;
    status := 'NO_FIXES_NEEDED';
    RETURN NEXT;
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- Step 3: Run the fix function
SELECT '=== RUNNING DOCUMENT OWNERSHIP FIX ===' as info;

SELECT * FROM fix_document_ownership();

-- Step 4: Verify the fix
SELECT '=== VERIFICATION: DOCUMENTS AFTER FIX ===' as info;

SELECT 
  d.id,
  d.name,
  d.uploaded_by,
  u.full_name as owner_name,
  u.email as owner_email,
  d.created_at,
  d.updated_at
FROM documents d
LEFT JOIN users u ON d.uploaded_by = u.id
ORDER BY d.updated_at DESC
LIMIT 10;

-- Step 5: Create a trigger to prevent future issues
CREATE OR REPLACE FUNCTION validate_document_upload()
RETURNS TRIGGER AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if the uploaded_by user exists
  SELECT EXISTS(
    SELECT 1 FROM users WHERE id = NEW.uploaded_by AND is_active = true
  ) INTO user_exists;
  
  IF NOT user_exists THEN
    RAISE EXCEPTION 'Invalid user ID for document upload: %', NEW.uploaded_by;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_document_upload_trigger ON documents;

-- Create the trigger
CREATE TRIGGER validate_document_upload_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_upload();

-- Step 6: Update RLS policies to ensure proper user context
SELECT '=== UPDATING RLS POLICIES ===' as info;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow access based on custom auth" ON documents;

-- Create new policy that ensures proper user context
CREATE POLICY "Allow access based on custom auth" ON documents
  FOR ALL
  USING (
    -- Allow if user is admin
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      AND role = 'admin'
    )
    OR
    -- Allow if user owns the document
    uploaded_by = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
    OR
    -- Allow if user is in the same company as the document
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = COALESCE(current_setting('app.current_user_id', true)::uuid, '00000000-0000-0000-0000-000000000000'::uuid)
      AND is_active = true
    )
  );

-- Step 7: Final status
SELECT '=== DOCUMENT OWNERSHIP FIX COMPLETE ===' as status;
SELECT 'Documents have been reassigned to admin user.' as message1;
SELECT 'Trigger created to prevent future ownership issues.' as message2;
SELECT 'RLS policies updated for proper access control.' as message3;
SELECT 'Please test document uploads to ensure proper ownership.' as message4;
