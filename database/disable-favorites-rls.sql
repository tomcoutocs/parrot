-- Disable RLS on user_favorites table
-- This migration removes Row Level Security from the favorites table to simplify access

-- Drop all existing RLS policies on user_favorites
DROP POLICY IF EXISTS "Users can view their own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can create their own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON user_favorites;
DROP POLICY IF EXISTS "Admins can manage all favorites" ON user_favorites;

-- Disable Row Level Security on user_favorites table
ALTER TABLE user_favorites DISABLE ROW LEVEL SECURITY;

-- Ensure permissions are granted
GRANT ALL ON user_favorites TO authenticated;

-- Success message
SELECT 'RLS disabled on user_favorites table successfully!' as status;
