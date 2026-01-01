-- Enhance analytics_sessions table with better session tracking metrics
-- This migration adds new columns for detailed session analytics

-- Add new columns for enhanced session tracking
ALTER TABLE analytics_sessions 
  ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scroll_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS form_submit_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS browser_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS os_version VARCHAR(50),
  ADD COLUMN IF NOT EXISTS viewport_size VARCHAR(50),
  ADD COLUMN IF NOT EXISTS language VARCHAR(10),
  ADD COLUMN IF NOT EXISTS timezone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS referrer VARCHAR(500),
  ADD COLUMN IF NOT EXISTS entry_page VARCHAR(500),
  ADD COLUMN IF NOT EXISTS exit_page VARCHAR(500),
  ADD COLUMN IF NOT EXISTS page_flow JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS avg_time_per_page DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS is_bounce BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS engagement_score DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS connection_type VARCHAR(50);

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sessions_entry_page ON analytics_sessions(entry_page);
CREATE INDEX IF NOT EXISTS idx_sessions_exit_page ON analytics_sessions(exit_page);
CREATE INDEX IF NOT EXISTS idx_sessions_bounce ON analytics_sessions(is_bounce);
CREATE INDEX IF NOT EXISTS idx_sessions_engagement ON analytics_sessions(engagement_score);
CREATE INDEX IF NOT EXISTS idx_sessions_browser_version ON analytics_sessions(browser_version);

