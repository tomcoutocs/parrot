-- Create system_metrics table for storing historical system performance data
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  active_users INTEGER NOT NULL DEFAULT 0,
  memory_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
  cpu_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
  request_count INTEGER NOT NULL DEFAULT 0,
  disk_usage DECIMAL(5,2) NOT NULL DEFAULT 0,
  network_latency DECIMAL(8,2) NOT NULL DEFAULT 0,
  error_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  response_time DECIMAL(8,2) NOT NULL DEFAULT 0,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  subscription_count INTEGER NOT NULL DEFAULT 0,
  total_projects INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  overdue_tasks INTEGER NOT NULL DEFAULT 0,
  user_engagement DECIMAL(5,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create performance_metrics table for storing cache and database performance data
CREATE TABLE IF NOT EXISTS performance_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  cache_hits INTEGER NOT NULL DEFAULT 0,
  cache_misses INTEGER NOT NULL DEFAULT 0,
  total_requests INTEGER NOT NULL DEFAULT 0,
  request_deduplications INTEGER NOT NULL DEFAULT 0,
  subscription_count INTEGER NOT NULL DEFAULT 0,
  active_subscriptions TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at DESC);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp_active_users ON system_metrics(timestamp DESC, active_users);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp_memory ON system_metrics(timestamp DESC, memory_usage);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp_cache ON performance_metrics(timestamp DESC, cache_hits, cache_misses);

-- Enable Row Level Security (RLS)
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access only
CREATE POLICY "Admins can view all system metrics" ON system_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert system metrics" ON system_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can view all performance metrics" ON performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Create a function to automatically clean up old metrics (optional)
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS void AS $$
BEGIN
  -- Delete system metrics older than 30 days
  DELETE FROM system_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Delete performance metrics older than 30 days
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- Uncomment the following line if you have pg_cron installed:
-- SELECT cron.schedule('cleanup-metrics', '0 2 * * *', 'SELECT cleanup_old_metrics();');

-- Grant necessary permissions
GRANT SELECT, INSERT ON system_metrics TO authenticated;
GRANT SELECT, INSERT ON performance_metrics TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
