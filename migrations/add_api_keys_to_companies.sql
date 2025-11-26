-- Add API key columns to companies table
-- These columns will store encrypted API keys

ALTER TABLE companies
ADD COLUMN IF NOT EXISTS meta_api_key TEXT,
ADD COLUMN IF NOT EXISTS google_api_key TEXT,
ADD COLUMN IF NOT EXISTS shopify_api_key TEXT,
ADD COLUMN IF NOT EXISTS klaviyo_api_key TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN companies.meta_api_key IS 'Encrypted Meta (Facebook/Instagram) API key';
COMMENT ON COLUMN companies.google_api_key IS 'Encrypted Google API key';
COMMENT ON COLUMN companies.shopify_api_key IS 'Encrypted Shopify API key';
COMMENT ON COLUMN companies.klaviyo_api_key IS 'Encrypted Klaviyo API key';

