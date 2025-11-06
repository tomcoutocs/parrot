-- Fix notifications foreign key constraint
-- This ensures the foreign key exists properly for the created_by relationship

-- Check if constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'notifications' 
  AND constraint_name = 'notifications_created_by_user_id_fkey';

-- Drop constraint if exists (to recreate it properly)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_created_by_user_id_fkey;

-- Recreate the constraint
ALTER TABLE notifications 
ADD CONSTRAINT notifications_created_by_user_id_fkey 
FOREIGN KEY (created_by_user_id) 
REFERENCES users(id) ON DELETE SET NULL;

-- Verify it was created
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'notifications' 
  AND constraint_name = 'notifications_created_by_user_id_fkey';

