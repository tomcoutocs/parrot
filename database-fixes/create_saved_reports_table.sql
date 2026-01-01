-- Create saved_reports table for storing user's saved analytics reports
-- This table stores report configurations that users can save and reuse

CREATE TABLE IF NOT EXISTS saved_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL DEFAULT 'report' CHECK (type IN ('dashboard', 'report', 'visualization')),
  date_range VARCHAR(50) NOT NULL DEFAULT 'last_30_days',
  chart_type VARCHAR(50) NOT NULL DEFAULT 'table' CHECK (chart_type IN ('bar', 'line', 'pie', 'table')),
  selected_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  schedule VARCHAR(50) CHECK (schedule IN ('daily', 'weekly', 'monthly')),
  last_run TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique report names per user
  UNIQUE(user_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_reports_user_id ON saved_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_reports_updated_at ON saved_reports(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_reports_type ON saved_reports(type);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_saved_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_saved_reports_updated_at_trigger
  BEFORE UPDATE ON saved_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_reports_updated_at();

-- Add RLS policies
-- Option 1: Disable RLS (default - simpler, application handles auth)
-- The application code already filters by user_id, so RLS is not strictly necessary
ALTER TABLE saved_reports DISABLE ROW LEVEL SECURITY;

-- Option 2: Enable RLS with context-based policies (uncomment if you want RLS)
-- ALTER TABLE saved_reports ENABLE ROW LEVEL SECURITY;
--
-- -- Users can only see their own saved reports
-- CREATE POLICY "Users can view their own saved reports"
--   ON saved_reports
--   FOR SELECT
--   USING (
--     current_setting('app.user_id', true)::uuid = user_id
--     OR current_setting('app.user_role', true) = 'admin'
--   );
--
-- -- Users can insert their own saved reports
-- CREATE POLICY "Users can create their own saved reports"
--   ON saved_reports
--   FOR INSERT
--   WITH CHECK (
--     current_setting('app.user_id', true)::uuid = user_id
--     OR current_setting('app.user_role', true) = 'admin'
--   );
--
-- -- Users can update their own saved reports
-- CREATE POLICY "Users can update their own saved reports"
--   ON saved_reports
--   FOR UPDATE
--   USING (
--     current_setting('app.user_id', true)::uuid = user_id
--     OR current_setting('app.user_role', true) = 'admin'
--   )
--   WITH CHECK (
--     current_setting('app.user_id', true)::uuid = user_id
--     OR current_setting('app.user_role', true) = 'admin'
--   );
--
-- -- Users can delete their own saved reports
-- CREATE POLICY "Users can delete their own saved reports"
--   ON saved_reports
--   FOR DELETE
--   USING (
--     current_setting('app.user_id', true)::uuid = user_id
--     OR current_setting('app.user_role', true) = 'admin'
--   );

