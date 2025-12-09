# Database Fixes

This directory contains SQL scripts to fix database issues.

## company_services_rls_fix.sql

This script fixes the Row-Level Security (RLS) policy for the `company_services` table to allow admins and managers to manage company services.

### How to Use

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `company_services_rls_fix.sql`
4. Review the script (especially if you want to disable RLS completely)
5. Run the script

### Options

The script provides two options:

**Option 1: Disable RLS completely** (commented out by default)
- Removes all row-level security from the table
- Only use if you want no restrictions at all
- Uncomment the line: `ALTER TABLE company_services DISABLE ROW LEVEL SECURITY;`

**Option 2: Update RLS Policies** (recommended)
- Keeps RLS enabled but allows admins and managers to manage services
- More secure approach
- This is the default option in the script

### What the Policies Do

- **SELECT**: Admins, managers, and users can view company services (with appropriate restrictions)
- **INSERT**: Admins and managers can add company services
- **UPDATE**: Admins and managers can update company services
- **DELETE**: Admins and managers can delete company services

### Notes

- The policies check the user role from the `set_user_context` function using `current_setting('app.user_role', true)`
- Make sure the `set_user_context` RPC function is properly setting these context variables
- After running the script, try saving company services again in the settings page

## company_events_rls_fix.sql

This script fixes the Row-Level Security (RLS) policy for the `company_events` table to allow admins and managers to create and manage calendar events.

### How to Use

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `company_events_rls_fix.sql`
4. Review the script
5. Run the script

### Options

The script provides two options:

**Option 1: Disable RLS completely** (default - active)
- Removes all row-level security from the table
- Allows admins and managers to freely create and manage events
- Simple solution - no need to call `set_user_context` before operations
- Currently active in the script

**Option 2: Create/Update RLS Policies** (commented out)
- Keeps RLS enabled but allows admins and managers to manage events
- More secure approach
- Requires calling `set_user_context` RPC before operations
- Uncomment the policy code and comment out Option 1 if you prefer this approach

### What the Policies Do (if using Option 2)

- **SELECT**: Admins, managers, and users can view company events (with appropriate restrictions)
- **INSERT**: Admins and managers can add company events
- **UPDATE**: Admins and managers can update company events
- **DELETE**: Admins and managers can delete company events

### Notes

- The default approach (Option 1) disables RLS completely, which is simpler and allows direct access
- If using Option 2, the policies check the user role from the `set_user_context` function using `current_setting('app.user_role', true)`
- Make sure the `set_user_context` RPC function is properly setting these context variables if using Option 2
- After running the script, try creating events again in the calendar

## add_event_type_column.sql

This script adds the `event_type` column to the `company_events` table. This column stores the type of event (launch, sale, event, or deadline) which determines the color displayed on the calendar.

### How to Use

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `add_event_type_column.sql`
4. Run the script

### What It Does

- Adds an `event_type` VARCHAR(50) column to `company_events` table if it doesn't already exist
- This column stores: "launch", "sale", "event", or "deadline"
- Events will now display with the correct colors:
  - **Purple** for Launch events
  - **Red** for Sale events
  - **Blue** for regular Events
  - **Orange** for Deadline events

### Notes

- Run this script before creating events if you want events to display with their selected colors
- Existing events without an event_type will have their type inferred from the title
- New events will save the event_type selected in the form

## space_bookmarks_rls_fix.sql

This script disables Row-Level Security (RLS) for the `space_bookmarks` table to allow custom admin access checks in the application code.

### How to Use

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `space_bookmarks_rls_fix.sql`
4. Review the script
5. Run the script

### What It Does

- **Disables RLS completely** on the `space_bookmarks` table
- Removes all row-level security restrictions
- Allows the application code to handle access control using custom admin checks

### Notes

- This script disables RLS to allow the application's custom admin access logic to work
- Access control is now handled in the application code (`createSpaceBookmark`, `updateSpaceBookmark`, `deleteSpaceBookmark` functions)
- Admins can manage bookmarks in any company
- Non-admin users can only manage bookmarks in their own company
- After running this script, try creating bookmarks again - the RLS error should be resolved

## create_activity_logs_table.sql

This script creates the `activity_logs` table for comprehensive user activity tracking across the system.

### How to Use

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `create_activity_logs_table.sql`
4. Review the script
5. Run the script

### What It Does

- **Creates the `activity_logs` table** with comprehensive tracking capabilities
- Tracks all user actions including:
  - Project actions (created, updated, deleted, archived)
  - Task actions (created, updated, completed, deleted, status changed)
  - Comment actions (added, updated, deleted)
  - User actions (created, updated, deleted, logged in/out)
  - Document actions (created, updated, deleted, viewed)
  - Form actions (created, updated, deleted, submitted)
  - Service actions (created, updated, deleted)
  - Company actions (created, updated, deleted)
  - Space/Manager assignment actions
- **Creates indexes** for optimal query performance
- **Migrates existing data** from projects, tasks, and comments (last 90 days)
- Stores metadata as JSONB for flexible data storage

### Table Structure

- `id`: UUID primary key
- `user_id`: Reference to the user who performed the action
- `action_type`: Type of action (e.g., 'project_created', 'task_completed')
- `entity_type`: Type of entity affected (e.g., 'project', 'task', 'user')
- `entity_id`: ID of the affected entity
- `description`: Human-readable description
- `metadata`: JSONB field for additional data
- `company_id`, `project_id`, `task_id`: References for filtering
- `created_at`: Timestamp of the action

### Notes

- The table includes a CHECK constraint to ensure valid action types
- Indexes are created for common query patterns (by user, date, action type, etc.)
- The migration script backfills existing data from the last 90 days
- After running this script, the application will automatically log all new activities
- Activity logs are retained indefinitely (no automatic cleanup)
- The activity feed can now show activities from any time period, not just 7 days

## add_profile_picture_to_users.sql

This script adds the `profile_picture` column to the `users` table to store user profile picture URLs.

### How to Use

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `add_profile_picture_to_users.sql`
4. Run the script

### What It Does

- **Adds a `profile_picture` TEXT column** to the `users` table if it doesn't already exist
- The column is nullable, so existing users won't be affected
- Stores the URL or path to the user's profile picture
- The script is idempotent - it checks if the column exists before adding it, so it's safe to run multiple times

### Notes

- This fixes the error: "Could not find the 'profile_picture' column of 'users' in the schema cache"
- After running this script, users will be able to upload and update their profile pictures
- Profile pictures are stored in Supabase Storage (in the `documents` bucket under `profile-pictures/`)
- The column stores the public URL to the profile picture
- Existing users will have `NULL` for `profile_picture` until they upload one

