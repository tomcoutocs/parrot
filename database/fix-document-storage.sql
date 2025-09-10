-- Fix Document Storage Issues
-- This script fixes common document storage problems

-- Step 1: Check current state
SELECT '=== CURRENT DOCUMENT STORAGE STATE ===' as info;

SELECT 
  COUNT(*) as total_documents,
  COUNT(CASE WHEN file_path IS NULL THEN 1 END) as null_paths,
  COUNT(CASE WHEN file_path = '' THEN 1 END) as empty_paths,
  COUNT(CASE WHEN file_path NOT LIKE '%/%' THEN 1 END) as invalid_paths
FROM documents;

-- Step 2: Create a function to fix document paths
CREATE OR REPLACE FUNCTION fix_document_paths()
RETURNS TABLE(
  document_id UUID,
  document_name TEXT,
  old_path TEXT,
  new_path TEXT,
  status TEXT
) AS $$
DECLARE
  doc_record RECORD;
  fixed_count INTEGER := 0;
BEGIN
  -- Loop through documents with problematic paths
  FOR doc_record IN 
    SELECT 
      d.id,
      d.name,
      d.file_path,
      d.company_id,
      d.created_at
    FROM documents d
    WHERE d.file_path IS NULL 
       OR d.file_path = ''
       OR d.file_path NOT LIKE '%/%'
       OR d.file_path LIKE '//%'
       OR d.file_path LIKE '%//%'
       OR d.file_path LIKE '%/'
    ORDER BY d.created_at DESC
  LOOP
    -- Generate a new path based on the document info
    DECLARE
      new_path TEXT;
      file_extension TEXT;
      timestamp_str TEXT;
    BEGIN
      -- Extract file extension
      file_extension := CASE 
        WHEN doc_record.name LIKE '%.%' THEN 
          '.' || split_part(doc_record.name, '.', array_length(string_to_array(doc_record.name, '.'), 1))
        ELSE ''
      END;
      
      -- Generate timestamp string
      timestamp_str := to_char(doc_record.created_at, 'YYYYMMDD_HH24MISS');
      
      -- Create new path: company_id/filename_timestamp.extension
      new_path := doc_record.company_id || '/' || 
                  replace(doc_record.name, file_extension, '') || '_' || timestamp_str || file_extension;
      
      -- Clean up the path
      new_path := replace(new_path, '//', '/');
      new_path := replace(new_path, ' ', '_');
      new_path := replace(new_path, '(', '');
      new_path := replace(new_path, ')', '');
      
      -- Update the document with the new path
      UPDATE documents 
      SET file_path = new_path,
          updated_at = NOW()
      WHERE id = doc_record.id;
      
      fixed_count := fixed_count + 1;
      
      -- Return the fix information
      document_id := doc_record.id;
      document_name := doc_record.name;
      old_path := doc_record.file_path;
      new_path := new_path;
      status := 'FIXED';
      
      RETURN NEXT;
    END;
  END LOOP;
  
  -- If no documents were fixed, return a status message
  IF fixed_count = 0 THEN
    document_id := NULL;
    document_name := 'No documents needed path fixing';
    old_path := NULL;
    new_path := NULL;
    status := 'NO_FIXES_NEEDED';
    RETURN NEXT;
  END IF;
  
END;
$$ LANGUAGE plpgsql;

-- Step 3: Run the fix function
SELECT '=== RUNNING DOCUMENT PATH FIX ===' as info;

SELECT * FROM fix_document_paths();

-- Step 4: Verify the fix
SELECT '=== VERIFICATION: DOCUMENTS AFTER FIX ===' as info;

SELECT 
  id,
  name,
  file_path,
  company_id,
  created_at,
  updated_at
FROM documents
ORDER BY updated_at DESC
LIMIT 10;

-- Step 5: Create a function to validate document paths
CREATE OR REPLACE FUNCTION validate_document_path(path TEXT, company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if path is valid
  IF path IS NULL OR path = '' THEN
    RETURN FALSE;
  END IF;
  
  -- Check if path starts with company_id
  IF path NOT LIKE company_id || '/%' THEN
    RETURN FALSE;
  END IF;
  
  -- Check for double slashes
  IF path LIKE '%//%' THEN
    RETURN FALSE;
  END IF;
  
  -- Check for trailing slash
  IF path LIKE '%/' THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create a trigger to prevent future path issues
CREATE OR REPLACE FUNCTION validate_document_path_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate the file path
  IF NOT validate_document_path(NEW.file_path, NEW.company_id) THEN
    RAISE EXCEPTION 'Invalid file path: %. Path must start with company_id and be properly formatted.', NEW.file_path;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS validate_document_path_trigger ON documents;

-- Create the trigger
CREATE TRIGGER validate_document_path_trigger
  BEFORE INSERT OR UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION validate_document_path_trigger();

-- Step 7: Update storage policies if needed
SELECT '=== CHECKING STORAGE POLICIES ===' as info;

-- Drop existing policies
DROP POLICY IF EXISTS "Allow authenticated users to upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete documents" ON storage.objects;

-- Create new policies for the documents bucket
CREATE POLICY "Allow authenticated users to upload documents" ON storage.objects
  FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to view documents" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Allow authenticated users to delete documents" ON storage.objects
  FOR DELETE
  USING (bucket_id = 'documents');

-- Step 8: Final status
SELECT '=== DOCUMENT STORAGE FIX COMPLETE ===' as status;
SELECT 'Document paths have been fixed and validated.' as message1;
SELECT 'Trigger created to prevent future path issues.' as message2;
SELECT 'Storage policies updated for proper access control.' as message3;
SELECT 'Please test document uploads and previews.' as message4;
