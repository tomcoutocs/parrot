-- Add comprehensive API credential columns to companies table
-- This expands the simple API key fields to include all required credentials for each API

ALTER TABLE companies
-- Google Ads API credentials
ADD COLUMN IF NOT EXISTS google_ads_developer_token TEXT,
ADD COLUMN IF NOT EXISTS google_ads_client_id TEXT,
ADD COLUMN IF NOT EXISTS google_ads_client_secret TEXT,
ADD COLUMN IF NOT EXISTS google_ads_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS google_ads_customer_id TEXT,

-- Meta Ads API credentials
ADD COLUMN IF NOT EXISTS meta_ads_app_id TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_app_secret TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_access_token TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_ad_account_id TEXT,
ADD COLUMN IF NOT EXISTS meta_ads_system_user_token TEXT,

-- Shopify API credentials
ADD COLUMN IF NOT EXISTS shopify_store_domain TEXT,
ADD COLUMN IF NOT EXISTS shopify_api_secret_key TEXT,
ADD COLUMN IF NOT EXISTS shopify_access_token TEXT,
ADD COLUMN IF NOT EXISTS shopify_scopes TEXT,

-- Klaviyo API credentials
ADD COLUMN IF NOT EXISTS klaviyo_public_api_key TEXT,
ADD COLUMN IF NOT EXISTS klaviyo_private_api_key TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN companies.google_ads_developer_token IS 'Encrypted Google Ads Developer Token';
COMMENT ON COLUMN companies.google_ads_client_id IS 'Google Ads OAuth Client ID';
COMMENT ON COLUMN companies.google_ads_client_secret IS 'Encrypted Google Ads OAuth Client Secret';
COMMENT ON COLUMN companies.google_ads_refresh_token IS 'Encrypted Google Ads Refresh Token';
COMMENT ON COLUMN companies.google_ads_customer_id IS 'Google Ads Customer ID (account ID)';

COMMENT ON COLUMN companies.meta_ads_app_id IS 'Meta Ads App ID';
COMMENT ON COLUMN companies.meta_ads_app_secret IS 'Encrypted Meta Ads App Secret';
COMMENT ON COLUMN companies.meta_ads_access_token IS 'Encrypted Meta Ads Access Token';
COMMENT ON COLUMN companies.meta_ads_ad_account_id IS 'Meta Ads Account ID';
COMMENT ON COLUMN companies.meta_ads_system_user_token IS 'Encrypted Meta Ads System User Token';

COMMENT ON COLUMN companies.shopify_store_domain IS 'Shopify Store Domain';
COMMENT ON COLUMN companies.shopify_api_secret_key IS 'Encrypted Shopify API Secret Key';
COMMENT ON COLUMN companies.shopify_access_token IS 'Encrypted Shopify Access Token';
COMMENT ON COLUMN companies.shopify_scopes IS 'Shopify API Scopes';

COMMENT ON COLUMN companies.klaviyo_public_api_key IS 'Klaviyo Public API Key (Site ID)';
COMMENT ON COLUMN companies.klaviyo_private_api_key IS 'Encrypted Klaviyo Private API Key';

