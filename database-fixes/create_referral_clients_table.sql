-- Create referral_clients table for managing referral clients
-- These are clients/partners who refer leads to your business

CREATE TABLE IF NOT EXISTS referral_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID, -- Space/company this referral belongs to
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company_name VARCHAR(255),
  contact_person VARCHAR(255),
  notes TEXT,
  commission_rate DECIMAL(5, 2), -- Optional commission percentage
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add referral_id to leads table
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referral_clients(id) ON DELETE SET NULL;

-- Add referral_id to clients table (for invoicing app)
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS referral_id UUID REFERENCES referral_clients(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_referral_id ON leads(referral_id);
CREATE INDEX IF NOT EXISTS idx_clients_referral_id ON clients(referral_id);
CREATE INDEX IF NOT EXISTS idx_referral_clients_space_id ON referral_clients(space_id);

-- Add RLS policies for referral_clients
ALTER TABLE referral_clients ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view referral clients in their space
CREATE POLICY "Users can view referral clients in their space"
  ON referral_clients FOR SELECT
  USING (
    space_id IS NULL OR 
    space_id = get_user_space_id(auth.uid())
  );

-- Policy: Users can create referral clients in their space
CREATE POLICY "Users can create referral clients in their space"
  ON referral_clients FOR INSERT
  WITH CHECK (
    space_id IS NULL OR 
    space_id = get_user_space_id(auth.uid())
  );

-- Policy: Users can update referral clients in their space
CREATE POLICY "Users can update referral clients in their space"
  ON referral_clients FOR UPDATE
  USING (
    space_id IS NULL OR 
    space_id = get_user_space_id(auth.uid())
  )
  WITH CHECK (
    space_id IS NULL OR 
    space_id = get_user_space_id(auth.uid())
  );

-- Policy: Users can delete referral clients in their space
CREATE POLICY "Users can delete referral clients in their space"
  ON referral_clients FOR DELETE
  USING (
    space_id IS NULL OR 
    space_id = get_user_space_id(auth.uid())
  );
