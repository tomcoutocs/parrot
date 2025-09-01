-- Document Management System Setup - CLEAN VERSION
-- This script creates the necessary tables and policies for document management
-- Run this in a fresh SQL editor session

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables and functions if they exist (clean slate approach)
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_folders CASCADE;
DROP FUNCTION IF EXISTS get_folder_hierarchy(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_folder_contents(UUID, VARCHAR) CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create companies table if it doesn't exist (simplified version)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_folders table
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company_id UUID NOT NULL,
  parent_folder_id UUID,
  path VARCHAR(500) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  folder_path VARCHAR(500) NOT NULL DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_document_folders_company_id ON document_folders(company_id);
CREATE INDEX idx_document_folders_parent_id ON document_folders(parent_folder_id);
CREATE INDEX idx_document_folders_path ON document_folders(path);
CREATE INDEX idx_documents_company_id ON documents(company_id);
CREATE INDEX idx_documents_folder_path ON documents(folder_path);
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_document_folders_updated_at 
  BEFORE UPDATE ON document_folders 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_folders

-- Users can view folders from their company
CREATE POLICY "Users can view company folders" ON document_folders
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Users can create folders in their company
CREATE POLICY "Users can create company folders" ON document_folders
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Users can update folders they created
CREATE POLICY "Users can update folders they created" ON document_folders
  FOR UPDATE USING (
    created_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Users can delete folders they created
CREATE POLICY "Users can delete folders they created" ON document_folders
  FOR DELETE USING (
    created_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- RLS Policies for documents

-- Users can view documents from their company
CREATE POLICY "Users can view company documents" ON documents
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Users can create documents in their company
CREATE POLICY "Users can create company documents" ON documents
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Users can update documents they uploaded
CREATE POLICY "Users can update documents they uploaded" ON documents
  FOR UPDATE USING (
    uploaded_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Users can delete documents they uploaded
CREATE POLICY "Users can delete documents they uploaded" ON documents
  FOR DELETE USING (
    uploaded_by = auth.uid() AND
    company_id IN (
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Admin override policies (admins can see and manage all documents)
CREATE POLICY "Admins can view all folders" ON document_folders
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all folders" ON document_folders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all documents" ON documents
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Insert sample data for testing (only if companies table has data)
DO $$
DECLARE
  first_company_id UUID;
BEGIN
  -- Check if we have any companies to work with
  SELECT id INTO first_company_id FROM companies LIMIT 1;
  
  IF first_company_id IS NOT NULL THEN
    -- Insert sample folders
    INSERT INTO document_folders (id, name, company_id, path, created_by) VALUES
      ('550e8400-e29b-41d4-a716-446655440001', 'General', first_company_id, '/General', '550e8400-e29b-41d4-a716-446655440001'),
      ('550e8400-e29b-41d4-a716-446655440002', 'Contracts', first_company_id, '/Contracts', '550e8400-e29b-41d4-a716-446655440001'),
      ('550e8400-e29b-41d4-a716-446655440003', 'Invoices', first_company_id, '/Invoices', '550e8400-e29b-41d4-a716-446655440001')
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Create a function to get folder hierarchy
CREATE OR REPLACE FUNCTION get_folder_hierarchy(company_uuid UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR(255),
  parent_folder_id UUID,
  path VARCHAR(500),
  level INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE folder_tree AS (
    -- Base case: root folders
    SELECT 
      df.id,
      df.name,
      df.parent_folder_id,
      df.path,
      0 as level
    FROM document_folders df
    WHERE df.company_id = company_uuid AND df.parent_folder_id IS NULL
    
    UNION ALL
    
    -- Recursive case: child folders
    SELECT 
      df.id,
      df.name,
      df.parent_folder_id,
      df.path,
      ft.level + 1
    FROM document_folders df
    INNER JOIN folder_tree ft ON df.parent_folder_id = ft.id
    WHERE df.company_id = company_uuid
  )
  SELECT * FROM folder_tree
  ORDER BY level, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get folder contents
CREATE OR REPLACE FUNCTION get_folder_contents(
  company_uuid UUID,
  folder_path VARCHAR(500) DEFAULT '/'
)
RETURNS TABLE (
  type TEXT,
  id UUID,
  name VARCHAR(255),
  size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE,
  created_by UUID
) AS $$
BEGIN
  RETURN QUERY
  
  -- Get folders in this path
  SELECT 
    'folder'::TEXT as type,
    df.id,
    df.name,
    NULL::BIGINT as size,
    df.created_at,
    df.created_by
  FROM document_folders df
  WHERE df.company_id = company_uuid 
    AND df.parent_folder_id = CASE 
      WHEN folder_path = '/' THEN NULL 
      ELSE (SELECT id FROM document_folders WHERE company_id = company_uuid AND path = folder_path LIMIT 1)
    END
  
  UNION ALL
  
  -- Get documents in this path
  SELECT 
    'document'::TEXT as type,
    d.id,
    d.name,
    d.file_size as size,
    d.created_at,
    d.uploaded_by as created_by
  FROM documents d
  WHERE d.company_id = company_uuid AND d.folder_path = folder_path
  
  ORDER BY type DESC, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON document_folders TO authenticated;
GRANT ALL ON documents TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_hierarchy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_folder_contents(UUID, VARCHAR) TO authenticated;

-- Add comments
COMMENT ON TABLE document_folders IS 'Stores folder structure for company documents';
COMMENT ON TABLE documents IS 'Stores metadata for uploaded company documents';
COMMENT ON FUNCTION get_folder_hierarchy(UUID) IS 'Returns hierarchical folder structure for a company';
COMMENT ON FUNCTION get_folder_contents(UUID, VARCHAR) IS 'Returns contents of a specific folder';

-- Success message
SELECT 'Document Management System setup completed successfully!' as status;
