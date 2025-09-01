-- Setup Company Calendars Database Tables
-- This script creates the necessary tables for company calendar functionality

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
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_events_company_id ON company_events(company_id);
CREATE INDEX IF NOT EXISTS idx_company_events_start_date ON company_events(start_date);
CREATE INDEX IF NOT EXISTS idx_company_events_created_by ON company_events(created_by);
CREATE INDEX IF NOT EXISTS idx_company_events_company_date ON company_events(company_id, start_date);

-- Add company_id column to users table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id);
  END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies table
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    auth.uid() IN (
      SELECT id FROM users WHERE company_id = companies.id
    )
  );

DROP POLICY IF EXISTS "Admins can view all companies" ON companies;
CREATE POLICY "Admins can view all companies" ON companies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for company_events table
DROP POLICY IF EXISTS "Users can view events from their company" ON company_events;
CREATE POLICY "Users can view events from their company" ON company_events
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create events in their company" ON company_events;
CREATE POLICY "Users can create events in their company" ON company_events
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update their own events" ON company_events;
CREATE POLICY "Users can update their own events" ON company_events
  FOR UPDATE USING (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Users can delete their own events" ON company_events;
CREATE POLICY "Users can delete their own events" ON company_events
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- Admins can perform all operations
DROP POLICY IF EXISTS "Admins can perform all operations on companies" ON companies;
CREATE POLICY "Admins can perform all operations on companies" ON companies
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can perform all operations on company_events" ON company_events;
CREATE POLICY "Admins can perform all operations on company_events" ON company_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

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

-- Insert some sample events for testing
INSERT INTO company_events (title, description, start_date, end_date, start_time, end_time, created_by, company_id) VALUES 
  ('Team Meeting', 'Weekly team sync meeting', '2025-01-27', '2025-01-27', '09:00:00', '10:00:00', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'),
  ('Client Presentation', 'Present quarterly results to client', '2025-01-28', '2025-01-28', '14:00:00', '15:30:00', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000'),
  ('Training Session', 'New software training for team', '2025-01-29', '2025-01-29', '13:00:00', '16:00:00', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT DO NOTHING;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_events_updated_at ON company_events;
CREATE TRIGGER update_company_events_updated_at
  BEFORE UPDATE ON company_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_events TO authenticated;
GRANT USAGE ON SEQUENCE companies_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE company_events_id_seq TO authenticated;

COMMENT ON TABLE companies IS 'Stores company information for multi-tenant calendar system';
COMMENT ON TABLE company_events IS 'Stores calendar events for each company';
COMMENT ON COLUMN users.company_id IS 'References the company this user belongs to';
