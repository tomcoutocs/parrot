-- Notifications Table Migration
-- This migration creates the notifications table for user notifications
-- Compatible with custom authentication setup

-- Drop existing table and related objects if they exist (to ensure clean migration)
-- CASCADE will automatically drop indexes, triggers, and policies
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table
-- Note: Foreign keys to tasks/projects/task_comments are optional and can be added later if those tables exist
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
         type TEXT NOT NULL CHECK (type IN ('task_assigned', 'task_updated', 'task_commented', 'project_assigned', 'project_updated', 'comment_mention', 'system', 'space_update')),
  "read" BOOLEAN DEFAULT false NOT NULL,
  related_task_id UUID,
  related_project_id UUID,
  related_comment_id UUID,
  created_by_user_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add foreign key constraints if the referenced tables exist
-- These will only be created if the tables exist
DO $$
BEGIN
  -- Add foreign key to users table (should exist)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE notifications ADD CONSTRAINT notifications_created_by_user_id_fkey 
      FOREIGN KEY (created_by_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add foreign keys to other tables if they exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_related_task_id_fkey 
      FOREIGN KEY (related_task_id) REFERENCES tasks(id) ON DELETE SET NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projects') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_related_project_id_fkey 
      FOREIGN KEY (related_project_id) REFERENCES projects(id) ON DELETE SET NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'task_comments') THEN
    ALTER TABLE notifications ADD CONSTRAINT notifications_related_comment_id_fkey 
      FOREIGN KEY (related_comment_id) REFERENCES task_comments(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, "read");
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_related_task_id ON notifications(related_task_id) WHERE related_task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_related_project_id ON notifications(related_project_id) WHERE related_project_id IS NOT NULL;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Custom Authentication
-- Since you're using custom auth, we'll create permissive policies that work with your app layer security

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (true); -- Your app layer filters by user_id, so we allow all SELECT

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (true) -- Your app layer ensures users only update their own
  WITH CHECK (true);

-- System/admins can insert notifications (handled by app layer)
CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- Your app layer controls who can create notifications

-- Note: For a more secure setup with RLS enabled, you could use:
-- Using user context RPC function or disable RLS completely
-- See below for alternative approaches

-- ============================================
-- ALTERNATIVE: Disable RLS (Recommended for Custom Auth)
-- ============================================
-- If you prefer to handle all security in your application layer (like dashboard tables),
-- uncomment the following line and comment out the RLS policies above:
--
-- ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
--
-- This matches the pattern used in your dashboard tables where security is handled
-- entirely in the application code rather than database RLS policies.

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE notifications IS 'Stores user notifications for task assignments, comments, project updates, etc.';
COMMENT ON COLUMN notifications.user_id IS 'The user who should receive this notification';
COMMENT ON COLUMN notifications.type IS 'Type of notification: task_assigned, task_updated, task_commented, project_assigned, project_updated, comment_mention, or system';
COMMENT ON COLUMN notifications."read" IS 'Whether the notification has been read by the user';
COMMENT ON COLUMN notifications.metadata IS 'Additional JSON data for the notification (e.g., task title, project name)';

