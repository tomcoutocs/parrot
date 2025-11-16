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

