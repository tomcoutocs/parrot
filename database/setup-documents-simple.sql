-- Simplified Document Management System Setup
-- This script creates the basic tables and policies without complex features

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS document_folders CASCADE;

-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document_folders table (simplified)
CREATE TABLE document_folders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  company_id UUID NOT NULL,
  parent_folder_id UUID,
  path VARCHAR(500) NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create documents table (simplified)
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  folder_path VARCHAR(500) NOT NULL DEFAULT '/',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create basic indexes
CREATE INDEX idx_document_folders_company_id ON document_folders(company_id);
CREATE INDEX idx_documents_company_id ON documents(company_id);

-- Enable RLS
ALTER TABLE document_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE RLS;

-- Simple RLS policies that should work
-- Allow all authenticated users to view folders and documents
CREATE POLICY "Allow authenticated users to view folders" ON document_folders
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create folders" ON document_folders
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update folders" ON document_folders
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete folders" ON document_folders
  FOR DELETE USING (auth.role() = 'authenticated');

-- Similar policies for documents
CREATE POLICY "Allow authenticated users to view documents" ON documents
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to create documents" ON documents
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update documents" ON documents
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete documents" ON documents
  FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON document_folders TO authenticated;
GRANT ALL ON documents TO authenticated;

-- Insert a test company if none exists
INSERT INTO companies (id, name) 
VALUES ('550e8400-e29b-41d4-a716-446655440000', 'Test Company')
ON CONFLICT (id) DO NOTHING;

-- Success message
SELECT 'Simplified Document Management System setup completed!' as status;
