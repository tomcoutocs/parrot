-- Automation Reports Table
-- For reporting inappropriate or problematic marketplace automations

CREATE TABLE IF NOT EXISTS automation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  marketplace_id UUID REFERENCES automation_marketplace(id) ON DELETE CASCADE NOT NULL,
  automation_id UUID REFERENCES automations(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'reviewed', 'dismissed', 'resolved'
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_automation_reports_marketplace_id ON automation_reports(marketplace_id);
CREATE INDEX IF NOT EXISTS idx_automation_reports_automation_id ON automation_reports(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_reports_reported_by ON automation_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_automation_reports_status ON automation_reports(status);
CREATE INDEX IF NOT EXISTS idx_automation_reports_created_at ON automation_reports(created_at);

-- Unique constraint to prevent duplicate reports from same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_automation_reports_unique_user_marketplace 
ON automation_reports(marketplace_id, reported_by);

-- Update timestamp trigger
CREATE TRIGGER update_automation_reports_updated_at
  BEFORE UPDATE ON automation_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_automation_updated_at();

-- RLS Policy (disabled by default, enable as needed)
ALTER TABLE automation_reports DISABLE ROW LEVEL SECURITY;

