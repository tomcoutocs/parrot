-- Lead Customization Settings Table (Global)
-- Dedicated table for lead generation app customization settings
-- Settings are global (app-level), not space-specific or user-specific

CREATE TABLE IF NOT EXISTS lead_customization_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Branding Settings
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  logo_url TEXT,
  company_name VARCHAR(255),
  
  -- Form Defaults
  default_thank_you_message TEXT,
  default_redirect_url TEXT,
  
  -- Pipeline Settings
  default_stages_template VARCHAR(50) DEFAULT 'standard' CHECK (default_stages_template IN ('standard', 'simple', 'custom')),
  
  -- Additional Settings (for future extensibility)
  additional_settings JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups (though we'll only have one record)
CREATE INDEX IF NOT EXISTS idx_lead_customization_settings_id ON lead_customization_settings(id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_lead_customization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists, then create it
DROP TRIGGER IF EXISTS update_lead_customization_settings_updated_at_trigger ON lead_customization_settings;
CREATE TRIGGER update_lead_customization_settings_updated_at_trigger
  BEFORE UPDATE ON lead_customization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_customization_settings_updated_at();

-- Add comment
COMMENT ON TABLE lead_customization_settings IS 'Global customization settings for the Lead Generation app (admin-controlled)';
