-- Add 'space_update' notification type to existing notifications table
-- Run this if you already have the notifications table created

-- Update the CHECK constraint to include 'space_update'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('task_assigned', 'task_updated', 'task_commented', 'project_assigned', 'project_updated', 'comment_mention', 'system', 'space_update'));

-- Verify the constraint was updated
SELECT 
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
WHERE rel.relname = 'notifications' AND con.contype = 'c';

