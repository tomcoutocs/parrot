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

