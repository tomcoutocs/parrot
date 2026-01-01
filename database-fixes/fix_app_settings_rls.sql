-- Fix RLS policy for app_settings table
-- This disables RLS since the application handles user filtering and settings are app-wide

-- Drop any existing RLS policies
DROP POLICY IF EXISTS "app_settings_select_policy" ON app_settings;
DROP POLICY IF EXISTS "app_settings_insert_policy" ON app_settings;
DROP POLICY IF EXISTS "app_settings_update_policy" ON app_settings;
DROP POLICY IF EXISTS "app_settings_delete_policy" ON app_settings;

-- Disable RLS
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

