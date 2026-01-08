-- Automations System Tables
-- Comprehensive automation platform similar to Zapier

-- Main automations table
CREATE TABLE IF NOT EXISTS automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false, -- For marketplace sharing
  marketplace_id UUID, -- Reference to marketplace entry if shared
  trigger_type VARCHAR(100) NOT NULL, -- 'webhook', 'schedule', 'event', 'api', 'manual'
  trigger_config JSONB, -- Configuration for the trigger
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE,
  run_count INTEGER DEFAULT 0,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  category VARCHAR(100), -- 'marketing', 'sales', 'support', 'operations', etc.
  icon VARCHAR(50) -- Icon identifier for UI
);

-- Automation nodes (steps in the workflow)
CREATE TABLE IF NOT EXISTS automation_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  node_type VARCHAR(50) NOT NULL, -- 'trigger', 'action', 'condition', 'filter', 'delay', 'webhook'
  node_subtype VARCHAR(100), -- Specific type like 'send_email', 'create_task', etc.
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  title VARCHAR(255),
  description TEXT,
  config JSONB, -- Node-specific configuration
  order_index INTEGER NOT NULL DEFAULT 0, -- Order in workflow
  is_enabled BOOLEAN DEFAULT true,
  error_handling JSONB, -- Error handling configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Connections between nodes
CREATE TABLE IF NOT EXISTS automation_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  source_node_id UUID REFERENCES automation_nodes(id) ON DELETE CASCADE NOT NULL,
  target_node_id UUID REFERENCES automation_nodes(id) ON DELETE CASCADE NOT NULL,
  condition_type VARCHAR(50), -- 'always', 'if', 'unless', 'switch'
  condition_config JSONB, -- Condition-specific configuration
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Automation execution logs
CREATE TABLE IF NOT EXISTS automation_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  trigger_data JSONB, -- Data that triggered the automation
  status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed', 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  execution_data JSONB, -- Full execution context and results
  execution_time_ms INTEGER, -- Execution duration in milliseconds
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Node execution logs (for debugging)
CREATE TABLE IF NOT EXISTS automation_node_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES automation_executions(id) ON DELETE CASCADE NOT NULL,
  node_id UUID REFERENCES automation_nodes(id) ON DELETE CASCADE NOT NULL,
  status VARCHAR(50) NOT NULL, -- 'pending', 'running', 'completed', 'failed', 'skipped'
  input_data JSONB,
  output_data JSONB,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Marketplace for shared automations
CREATE TABLE IF NOT EXISTS automation_marketplace (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  short_description VARCHAR(500), -- For preview cards
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  icon VARCHAR(50),
  preview_image_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false, -- Verified by platform admins
  download_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  rating_average DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'published', -- 'draft', 'published', 'archived', 'rejected'
  rejection_reason TEXT,
  version VARCHAR(50) DEFAULT '1.0.0',
  changelog TEXT,
  requirements JSONB, -- Required integrations, permissions, etc.
  pricing_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'premium', 'enterprise'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE
);

-- User likes for marketplace automations
CREATE TABLE IF NOT EXISTS automation_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  marketplace_id UUID REFERENCES automation_marketplace(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, marketplace_id)
);

-- User ratings for marketplace automations
CREATE TABLE IF NOT EXISTS automation_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  marketplace_id UUID REFERENCES automation_marketplace(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, marketplace_id)
);

-- User's installed automations from marketplace
CREATE TABLE IF NOT EXISTS automation_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  marketplace_id UUID REFERENCES automation_marketplace(id) ON DELETE CASCADE NOT NULL,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL, -- The installed automation instance
  installed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  customizations JSONB, -- User's customizations to the automation
  UNIQUE(user_id, space_id, marketplace_id)
);

-- External integrations/connectors
CREATE TABLE IF NOT EXISTS automation_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(100),
  icon_url TEXT,
  auth_type VARCHAR(50), -- 'oauth', 'api_key', 'basic', 'custom'
  auth_config JSONB, -- Authentication configuration
  api_base_url TEXT,
  documentation_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User's connected integrations
CREATE TABLE IF NOT EXISTS user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES automation_integrations(id) ON DELETE CASCADE NOT NULL,
  credentials JSONB, -- Encrypted credentials
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, space_id, integration_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_automations_space_id ON automations(space_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_is_active ON automations(is_active);
CREATE INDEX IF NOT EXISTS idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX IF NOT EXISTS idx_automation_nodes_automation_id ON automation_nodes(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_connections_automation_id ON automation_connections(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_automation_id ON automation_executions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_started_at ON automation_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_automation_marketplace_status ON automation_marketplace(status);
CREATE INDEX IF NOT EXISTS idx_automation_marketplace_category ON automation_marketplace(category);
CREATE INDEX IF NOT EXISTS idx_automation_likes_user_id ON automation_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_likes_marketplace_id ON automation_likes(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_automation_ratings_marketplace_id ON automation_ratings(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_integrations_integration_id ON user_integrations(integration_id);

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER update_automation_nodes_updated_at
  BEFORE UPDATE ON automation_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER update_automation_marketplace_updated_at
  BEFORE UPDATE ON automation_marketplace
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER update_automation_ratings_updated_at
  BEFORE UPDATE ON automation_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

-- Function to update marketplace stats
CREATE OR REPLACE FUNCTION update_marketplace_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'automation_likes' THEN
    UPDATE automation_marketplace
    SET like_count = (
      SELECT COUNT(*) FROM automation_likes
      WHERE marketplace_id = NEW.marketplace_id
    )
    WHERE id = NEW.marketplace_id;
  ELSIF TG_OP = 'DELETE' AND TG_TABLE_NAME = 'automation_likes' THEN
    UPDATE automation_marketplace
    SET like_count = (
      SELECT COUNT(*) FROM automation_likes
      WHERE marketplace_id = OLD.marketplace_id
    )
    WHERE id = OLD.marketplace_id;
  ELSIF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') AND TG_TABLE_NAME = 'automation_ratings' THEN
    UPDATE automation_marketplace
    SET 
      rating_average = (
        SELECT COALESCE(AVG(rating), 0) FROM automation_ratings
        WHERE marketplace_id = COALESCE(NEW.marketplace_id, OLD.marketplace_id)
      ),
      rating_count = (
        SELECT COUNT(*) FROM automation_ratings
        WHERE marketplace_id = COALESCE(NEW.marketplace_id, OLD.marketplace_id)
      )
    WHERE id = COALESCE(NEW.marketplace_id, OLD.marketplace_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_marketplace_like_count
  AFTER INSERT OR DELETE ON automation_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_stats();

CREATE TRIGGER update_marketplace_rating_stats
  AFTER INSERT OR UPDATE OR DELETE ON automation_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_marketplace_stats();

-- RLS Policies (disabled by default, enable as needed)
ALTER TABLE automations DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_nodes DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_connections DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_node_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_marketplace DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_installations DISABLE ROW LEVEL SECURITY;
ALTER TABLE automation_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations DISABLE ROW LEVEL SECURITY;

