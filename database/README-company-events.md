# Company Events Table Setup

## Quick Setup

To fix the "relation 'company_events' does not exist" error, run the SQL script in your Supabase database:

### Step 1: Go to Supabase Dashboard
1. Visit [https://supabase.com](https://supabase.com)
2. Open your project
3. Click on "SQL Editor" in the left sidebar

### Step 2: Run the Setup Script
1. Click "New Query"
2. Copy the entire contents of `create-company-events-simple.sql`
3. Paste it into the SQL editor
4. Click "Run" to execute the script

### Step 3: Verify Setup
After running the script, you should see:
- ✅ `companies` table created
- ✅ `company_events` table created
- ✅ `company_id` column added to `users` table
- ✅ Sample companies inserted
- ✅ Users updated with company assignments

## What This Script Does

1. **Creates the `companies` table** - Stores company information
2. **Creates the `company_events` table** - Stores calendar events
3. **Adds `company_id` to users** - Links users to companies
4. **Inserts sample data** - Provides test companies and assigns users
5. **Sets up permissions** - Allows authenticated users to access the tables

## After Running the Script

Once you've run the script, the Company Calendars tab should work properly:
- Users will be able to see their company's calendar
- Admins can switch between different company calendars
- Events can be created, viewed, and deleted
- No more "table does not exist" errors

## Troubleshooting

If you still see errors after running the script:
1. **Refresh your browser** - The changes might take a moment to propagate
2. **Check the SQL Editor** - Make sure the script ran without errors
3. **Verify tables exist** - Go to "Table Editor" in Supabase to see the new tables
4. **Check user assignments** - Verify users have a `company_id` value
