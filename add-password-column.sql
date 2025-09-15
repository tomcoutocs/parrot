-- Add password column to users table
-- Run this in your Supabase SQL Editor

-- Add password column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;

-- Update existing demo users with hashed passwords
-- These are the hashed versions of 'demo123' using our hash function
UPDATE users 
SET password = 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456'
WHERE email IN ('admin@company.com', 'manager@company.com', 'user@company.com', 'internal@company.com')
AND password IS NULL;

-- Verify the password column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
ORDER BY ordinal_position;
