-- Create tables for analytics tracking data
-- These tables store tracked user behavior, page views, sessions, and IP data

-- Page View Tracking Table
CREATE TABLE IF NOT EXISTS analytics_page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  page_path VARCHAR(500) NOT NULL,
  page_title VARCHAR(500),
  referrer VARCHAR(500),
  user_agent TEXT,
  view_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_id UUID,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_user ON analytics_page_views(user_id);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON analytics_page_views(view_timestamp);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON analytics_page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_session ON analytics_page_views(session_id);

-- User Behavior Tracking Table (clicks, scrolls, interactions)
CREATE TABLE IF NOT EXISTS analytics_user_behaviors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL, -- 'click', 'scroll', 'interaction', 'form_submit', etc.
  element_type VARCHAR(100), -- 'button', 'link', 'input', etc.
  element_id VARCHAR(255),
  element_text TEXT,
  page_path VARCHAR(500) NOT NULL,
  coordinates JSONB, -- {x: number, y: number}
  metadata JSONB DEFAULT '{}'::jsonb,
  session_id UUID,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_behaviors_user ON analytics_user_behaviors(user_id);
CREATE INDEX IF NOT EXISTS idx_behaviors_type ON analytics_user_behaviors(event_type);
CREATE INDEX IF NOT EXISTS idx_behaviors_timestamp ON analytics_user_behaviors(created_at);
CREATE INDEX IF NOT EXISTS idx_behaviors_session ON analytics_user_behaviors(session_id);

-- Session Recording Table (session metadata)
CREATE TABLE IF NOT EXISTS analytics_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  page_count INTEGER DEFAULT 0,
  interaction_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  scroll_count INTEGER DEFAULT 0,
  form_submit_count INTEGER DEFAULT 0,
  device_type VARCHAR(50), -- 'desktop', 'mobile', 'tablet'
  browser VARCHAR(100),
  browser_version VARCHAR(50),
  os VARCHAR(100),
  os_version VARCHAR(50),
  screen_resolution VARCHAR(50),
  viewport_size VARCHAR(50), -- '1920x1080'
  language VARCHAR(10), -- 'en-US'
  timezone VARCHAR(50), -- 'America/New_York'
  referrer VARCHAR(500),
  entry_page VARCHAR(500), -- First page visited
  exit_page VARCHAR(500), -- Last page visited
  page_flow JSONB DEFAULT '[]'::jsonb, -- Array of page paths in order
  avg_time_per_page DECIMAL(10, 2), -- Average seconds per page
  is_bounce BOOLEAN DEFAULT false, -- Single page session
  engagement_score DECIMAL(5, 2), -- Calculated engagement score (0-100)
  connection_type VARCHAR(50), -- '4g', 'wifi', 'ethernet', etc. (if available)
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON analytics_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_start ON analytics_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_sessions_space ON analytics_sessions(space_id);

-- IP Address Tracking Table
CREATE TABLE IF NOT EXISTS analytics_ip_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL, -- IPv6 can be up to 45 chars
  country VARCHAR(100),
  region VARCHAR(100),
  city VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  isp VARCHAR(255),
  page_path VARCHAR(500),
  session_id UUID,
  space_id UUID REFERENCES spaces(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ip_user ON analytics_ip_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ip_address ON analytics_ip_tracking(ip_address);
CREATE INDEX IF NOT EXISTS idx_ip_timestamp ON analytics_ip_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_ip_country ON analytics_ip_tracking(country);

-- Disable RLS on all tracking tables (application handles access control)
ALTER TABLE analytics_page_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_user_behaviors DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_ip_tracking DISABLE ROW LEVEL SECURITY;

