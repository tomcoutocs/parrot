-- Add Favorites Support
-- This migration adds support for users to favorite folders and documents
-- Favorites will be stored in a separate table to allow for user-specific favorites

-- Create favorites table to track user favorites
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  item_id UUID NOT NULL,
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('folder', 'document')),
  company_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, item_id, item_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_item_id ON user_favorites(item_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_item_type ON user_favorites(item_type);
CREATE INDEX IF NOT EXISTS idx_user_favorites_company_id ON user_favorites(company_id);

-- Grant permissions to authenticated users
GRANT ALL ON user_favorites TO authenticated;

-- Add comments
COMMENT ON TABLE user_favorites IS 'Stores user favorites for folders and documents';
COMMENT ON COLUMN user_favorites.item_type IS 'Type of favorited item: folder or document';
COMMENT ON COLUMN user_favorites.item_id IS 'ID of the favorited folder or document';

-- Success message
SELECT 'Favorites support added successfully! (No RLS - simplified access)' as status;
