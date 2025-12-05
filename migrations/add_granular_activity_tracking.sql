-- Migration to add granular activity tracking action types
-- This adds new action types for file uploads, document moves, task moves, and folder creation

-- First, drop the existing constraint
ALTER TABLE activity_logs DROP CONSTRAINT IF EXISTS activity_logs_action_type_check;

-- Recreate the constraint with new action types
ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_action_type_check CHECK (action_type IN (
  'project_created', 'project_updated', 'project_deleted', 'project_archived',
  'task_created', 'task_updated', 'task_completed', 'task_deleted', 'task_status_changed', 'task_moved',
  'comment_added', 'comment_updated', 'comment_deleted',
  'user_created', 'user_updated', 'user_deleted', 'user_logged_in', 'user_logged_out',
  'document_created', 'document_updated', 'document_deleted', 'document_viewed', 'document_moved', 'file_uploaded',
  'folder_created', 'folder_updated', 'folder_deleted',
  'rich_document_created', 'rich_document_updated', 'rich_document_deleted',
  'form_created', 'form_updated', 'form_deleted', 'form_submitted',
  'service_created', 'service_updated', 'service_deleted',
  'company_created', 'company_updated', 'company_deleted',
  'space_assigned', 'space_unassigned',
  'manager_assigned', 'manager_unassigned'
));

-- Add comment explaining the new action types
COMMENT ON CONSTRAINT activity_logs_action_type_check ON activity_logs IS 
  'Validates action types including new granular tracking: file_uploaded, document_moved, task_moved, folder_created, etc.';

