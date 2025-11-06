-- Dashboard Customization Tables
-- This migration creates tables for customizable dashboards per space

-- Dashboard widgets table - defines available widget types
CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  default_enabled BOOLEAN DEFAULT false,
  default_config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Space dashboard configuration - stores which widgets are enabled for each space
CREATE TABLE IF NOT EXISTS space_dashboard_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  widget_key TEXT NOT NULL REFERENCES dashboard_widgets(widget_key) ON DELETE CASCADE,
  enabled BOOLEAN DEFAULT true,
  position INTEGER DEFAULT 0,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, widget_key)
);

-- Dashboard notes - admin messages/notes for each space
CREATE TABLE IF NOT EXISTS dashboard_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dashboard links - hyperlinks for each space
CREATE TABLE IF NOT EXISTS dashboard_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  icon_name TEXT,
  display_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_space_dashboard_config_company ON space_dashboard_config(company_id);
CREATE INDEX IF NOT EXISTS idx_space_dashboard_config_widget ON space_dashboard_config(widget_key);
CREATE INDEX IF NOT EXISTS idx_dashboard_notes_company ON dashboard_notes(company_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_links_company ON dashboard_links(company_id);

-- Insert default widget types
INSERT INTO dashboard_widgets (widget_key, name, description, icon_name, default_enabled, default_config) VALUES
  ('notes', 'Notes', 'Display admin messages and notes for this space', 'FileText', true, '{"maxHeight": "400px"}'),
  ('links', 'Quick Links', 'Display important hyperlinks and resources', 'Link', true, '{"maxLinks": 10}'),
  ('projects_summary', 'Projects Summary', 'Overview of active projects', 'FolderOpen', true, '{"showCount": 5}'),
  ('tasks_summary', 'Tasks Summary', 'Overview of tasks and assignments', 'Kanban', true, '{"showUpcoming": true, "daysAhead": 7}'),
  ('recent_activity', 'Recent Activity', 'Recent updates and changes', 'Activity', false, '{"maxItems": 10}'),
  ('team_members', 'Team Members', 'List of team members in this space', 'Users', false, '{"showAvatars": true}'),
  ('forms_summary', 'Forms Summary', 'Overview of forms and submissions', 'FileText', false, '{"showRecent": 5}'),
  ('calendar_upcoming', 'Upcoming Events', 'Upcoming calendar events and meetings', 'Calendar', false, '{"daysAhead": 14}'),
  ('statistics', 'Statistics', 'Key metrics and statistics', 'BarChart', false, '{"metrics": ["projects", "tasks", "team"]}')
ON CONFLICT (widget_key) DO NOTHING;

-- RLS Policies
ALTER TABLE dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE space_dashboard_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_links ENABLE ROW LEVEL SECURITY;

-- Widgets are readable by all authenticated users
CREATE POLICY "Users can view widgets" ON dashboard_widgets
  FOR SELECT USING (true);

-- Dashboard config policies
CREATE POLICY "Users can view dashboard config for their company" ON space_dashboard_config
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins bypass RLS completely
CREATE POLICY "Admins bypass RLS for dashboard config" ON space_dashboard_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers can manage dashboard config for any company
CREATE POLICY "Managers can manage dashboard config" ON space_dashboard_config
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- Notes policies
CREATE POLICY "Users can view notes for their company" ON dashboard_notes
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins bypass RLS completely for notes
CREATE POLICY "Admins bypass RLS for notes" ON dashboard_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers can manage notes
CREATE POLICY "Managers can manage notes" ON dashboard_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- Links policies
CREATE POLICY "Users can view links for their company" ON dashboard_links
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
      UNION
      SELECT company_id FROM internal_user_companies WHERE user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins bypass RLS completely for links
CREATE POLICY "Admins bypass RLS for links" ON dashboard_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Managers can manage links
CREATE POLICY "Managers can manage links" ON dashboard_links
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
  );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_dashboard_widgets_updated_at
  BEFORE UPDATE ON dashboard_widgets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_space_dashboard_config_updated_at
  BEFORE UPDATE ON space_dashboard_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_notes_updated_at
  BEFORE UPDATE ON dashboard_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dashboard_links_updated_at
  BEFORE UPDATE ON dashboard_links
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

