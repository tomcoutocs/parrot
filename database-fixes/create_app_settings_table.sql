-- Create app_settings table for storing application-wide settings
-- This table stores key-value pairs for various app configurations

CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on setting_key for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(setting_key);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_app_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_app_settings_updated_at_trigger
  BEFORE UPDATE ON app_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_app_settings_updated_at();

-- Insert default user management settings if they don't exist
INSERT INTO app_settings (setting_key, setting_value)
VALUES (
  'user_management',
  '{
    "invitation_expiry_days": 7,
    "require_email_verification": true,
    "auto_assign_default_permissions": true,
    "default_permissions": {
      "crm": false,
      "invoicing": false,
      "leadGeneration": false,
      "analytics": false
    },
    "require_strong_passwords": true,
    "enable_two_factor_auth": false,
    "session_timeout_minutes": 60
  }'::jsonb
)
ON CONFLICT (setting_key) DO NOTHING;

