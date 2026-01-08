-- Platform Customization & Branding Studio Database Schema
-- This creates the table for storing space-level customizations

CREATE TABLE IF NOT EXISTS space_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Branding & Identity
  logo_url TEXT,
  favicon_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#6366f1', -- Indigo default
  secondary_color VARCHAR(7) DEFAULT '#8b5cf6', -- Purple default
  accent_color VARCHAR(7) DEFAULT '#ec4899', -- Pink default
  font_family VARCHAR(100) DEFAULT 'Inter',
  font_size_base VARCHAR(10) DEFAULT '16px',
  
  -- Theme Configuration
  theme_mode VARCHAR(20) DEFAULT 'auto' CHECK (theme_mode IN ('light', 'dark', 'auto')),
  custom_css TEXT,
  custom_theme JSONB DEFAULT '{}'::jsonb, -- Store full theme config as JSON
  
  -- Layout Customization
  sidebar_position VARCHAR(10) DEFAULT 'left' CHECK (sidebar_position IN ('left', 'right', 'hidden')),
  sidebar_width VARCHAR(10) DEFAULT '240px',
  layout_config JSONB DEFAULT '{}'::jsonb, -- Dashboard widget positions, navigation items, etc.
  header_height VARCHAR(10) DEFAULT '64px',
  
  -- White-Label Options
  custom_domain VARCHAR(255),
  hide_parrot_branding BOOLEAN DEFAULT FALSE,
  custom_login_branding JSONB DEFAULT '{}'::jsonb, -- Login page customization
  custom_favicon_url TEXT,
  custom_app_name VARCHAR(100), -- Custom name instead of "Parrot Platform"
  
  -- Email & Communication Branding
  email_template_config JSONB DEFAULT '{}'::jsonb, -- Email template customization
  email_signature TEXT,
  email_header_color VARCHAR(7),
  email_footer_text TEXT,
  
  -- Additional Customization
  custom_metadata JSONB DEFAULT '{}'::jsonb, -- For future extensibility
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_space_customizations_space_id ON space_customizations(space_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_space_customizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_space_customizations_updated_at
  BEFORE UPDATE ON space_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_space_customizations_updated_at();

-- Enable RLS
ALTER TABLE space_customizations ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's space ID (handles both space_id and company_id columns)
-- Reuse if it already exists, otherwise create it
CREATE OR REPLACE FUNCTION get_user_space_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  result UUID;
  has_space_id BOOLEAN;
  has_company_id BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'space_id'
  ) INTO has_space_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) INTO has_company_id;
  
  -- Get the value from the appropriate column(s)
  IF has_space_id AND has_company_id THEN
    -- Both exist, prefer space_id
    SELECT COALESCE(space_id, company_id) INTO result FROM users WHERE id = user_uuid;
  ELSIF has_space_id THEN
    -- Only space_id exists
    SELECT space_id INTO result FROM users WHERE id = user_uuid;
  ELSIF has_company_id THEN
    -- Only company_id exists
    SELECT company_id INTO result FROM users WHERE id = user_uuid;
  ELSE
    -- Neither exists
    RETURN NULL;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- RLS Policies
-- Users can view customizations for their space
CREATE POLICY "Users can view customizations for their space"
  ON space_customizations
  FOR SELECT
  USING (
    space_id = get_user_space_id(auth.uid())
  );

-- Admins can manage customizations for their space
CREATE POLICY "Admins can manage customizations for their space"
  ON space_customizations
  FOR ALL
  USING (
    space_id = get_user_space_id(auth.uid())
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'system_admin')
    )
  );

-- System admins can view all customizations
CREATE POLICY "System admins can view all customizations"
  ON space_customizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'system_admin'
    )
  );

