-- Create API metrics cache tables to store the last 30 days of data
-- This reduces API calls by caching data and updating once per day

-- Google Ads metrics cache
CREATE TABLE IF NOT EXISTS google_ads_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend DECIMAL(10, 2) DEFAULT 0,
  conversions DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  ctr DECIMAL(5, 4) DEFAULT 0,
  cpc DECIMAL(10, 2) DEFAULT 0,
  cpa DECIMAL(10, 2) DEFAULT 0,
  roas DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, date)
);

-- Meta Ads metrics cache
CREATE TABLE IF NOT EXISTS meta_ads_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  spend DECIMAL(10, 2) DEFAULT 0,
  conversions DECIMAL(10, 2) DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  revenue DECIMAL(10, 2) DEFAULT 0,
  ctr DECIMAL(5, 4) DEFAULT 0,
  cpc DECIMAL(10, 2) DEFAULT 0,
  cpa DECIMAL(10, 2) DEFAULT 0,
  roas DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, date)
);

-- Shopify metrics cache
CREATE TABLE IF NOT EXISTS shopify_metrics_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  revenue DECIMAL(10, 2) DEFAULT 0,
  orders INTEGER DEFAULT 0,
  average_order_value DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(company_id, date)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_google_ads_cache_company_date ON google_ads_metrics_cache(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_meta_ads_cache_company_date ON meta_ads_metrics_cache(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_shopify_cache_company_date ON shopify_metrics_cache(company_id, date DESC);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update updated_at
CREATE TRIGGER update_google_ads_cache_updated_at
  BEFORE UPDATE ON google_ads_metrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meta_ads_cache_updated_at
  BEFORE UPDATE ON meta_ads_metrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopify_cache_updated_at
  BEFORE UPDATE ON shopify_metrics_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE google_ads_metrics_cache IS 'Cached Google Ads metrics for the last 30 days';
COMMENT ON TABLE meta_ads_metrics_cache IS 'Cached Meta Ads metrics for the last 30 days';
COMMENT ON TABLE shopify_metrics_cache IS 'Cached Shopify metrics for the last 30 days';

