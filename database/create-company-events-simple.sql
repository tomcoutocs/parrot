-- Create Company Events Table (Simple Setup)
-- This script creates just the basic table structure needed for company calendars

-- Create companies table if it doesn't exist
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create company_events table if it doesn't exist
CREATE TABLE IF NOT EXISTS company_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_by UUID NOT NULL,
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_events_company_id ON company_events(company_id);
CREATE INDEX IF NOT EXISTS idx_company_events_start_date ON company_events(start_date);
CREATE INDEX IF NOT EXISTS idx_company_events_created_by ON company_events(created_by);

-- Add company_id column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id UUID;
  END IF;
END $$;

-- Insert some sample companies for testing
INSERT INTO companies (id, name) VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', 'Acme Corporation'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Tech Solutions Inc'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Global Industries')
ON CONFLICT (id) DO NOTHING;

-- Update existing users to have a company_id if they don't have one
UPDATE users 
SET company_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE company_id IS NULL;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_events TO authenticated;

COMMENT ON TABLE companies IS 'Stores company information for multi-tenant calendar system';
COMMENT ON TABLE company_events IS 'Stores calendar events for each company';
COMMENT ON COLUMN users.company_id IS 'References the company this user belongs to';
