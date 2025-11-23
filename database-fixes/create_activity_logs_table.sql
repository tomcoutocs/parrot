-- Create activity_logs table for comprehensive user activity tracking
-- This table stores all user actions across the system for audit and activity feed purposes

-- Drop table if it exists (to ensure clean creation with correct schema)
-- Uncomment the line below if you want to recreate the table from scratch
DROP TABLE IF EXISTS activity_logs CASCADE;

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Check constraint for valid action types
  CONSTRAINT activity_logs_action_type_check CHECK (action_type IN (
    'project_created', 'project_updated', 'project_deleted', 'project_archived',
    'task_created', 'task_updated', 'task_completed', 'task_deleted', 'task_status_changed',
    'comment_added', 'comment_updated', 'comment_deleted',
    'user_created', 'user_updated', 'user_deleted', 'user_logged_in', 'user_logged_out',
    'document_created', 'document_updated', 'document_deleted', 'document_viewed',
    'form_created', 'form_updated', 'form_deleted', 'form_submitted',
    'service_created', 'service_updated', 'service_deleted',
    'company_created', 'company_updated', 'company_deleted',
    'space_assigned', 'space_unassigned',
    'manager_assigned', 'manager_unassigned'
  ))
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_task_id ON activity_logs(task_id);

-- Composite index for common queries (user activities, recent activities)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_created ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_created ON activity_logs(company_id, created_at DESC);

-- Add comment to table
COMMENT ON TABLE activity_logs IS 'Comprehensive activity log for tracking all user actions across the system';
COMMENT ON COLUMN activity_logs.action_type IS 'Type of action performed (e.g., project_created, task_completed)';
COMMENT ON COLUMN activity_logs.entity_type IS 'Type of entity affected (e.g., project, task, user)';
COMMENT ON COLUMN activity_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN activity_logs.metadata IS 'Additional JSON data about the action';
COMMENT ON COLUMN activity_logs.description IS 'Human-readable description of the action';

-- Optional: Disable RLS on activity_logs table (similar to other log tables)
-- Uncomment the line below if you want to disable RLS and handle access control in application code
-- ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

-- Migrate existing data from other tables (optional - can be run separately)
-- This will backfill activity logs from existing projects, tasks, and comments
-- Note: This only captures creation events, not updates or deletions

-- Migrate existing data from other tables (only insert if not already exists)
-- This will backfill activity logs from existing projects, tasks, and comments

INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description, company_id, project_id, created_at)
SELECT 
  created_by as user_id,
  'project_created' as action_type,
  'project' as entity_type,
  id as entity_id,
  'Created project ' || name as description,
  company_id,
  id as project_id,
  created_at
FROM projects
WHERE created_at > NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM activity_logs 
    WHERE activity_logs.entity_id = projects.id 
    AND activity_logs.action_type = 'project_created'
  );

INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description, project_id, task_id, created_at)
SELECT 
  created_by as user_id,
  'task_created' as action_type,
  'task' as entity_type,
  id as entity_id,
  'Created task ' || title as description,
  project_id,
  id as task_id,
  created_at
FROM tasks
WHERE created_at > NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM activity_logs 
    WHERE activity_logs.entity_id = tasks.id 
    AND activity_logs.action_type = 'task_created'
  );

INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description, task_id, created_at, metadata)
SELECT 
  user_id,
  'comment_added' as action_type,
  'comment' as entity_type,
  id as entity_id,
  'Added comment' as description,
  task_id,
  created_at,
  jsonb_build_object('content', LEFT(content, 100)) as metadata
FROM task_comments
WHERE created_at > NOW() - INTERVAL '90 days'
  AND NOT EXISTS (
    SELECT 1 FROM activity_logs 
    WHERE activity_logs.entity_id = task_comments.id 
    AND activity_logs.action_type = 'comment_added'
  );

-- Note: Task completions would need to be tracked separately based on status changes
-- This is handled by the application code when tasks are updated

