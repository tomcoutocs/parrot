# Company Feature Setup Guide

## 🚀 Database Migration

To add company support to your Client Portal, run the following SQL migration in your Supabase SQL Editor:

### Step 1: Fix RLS Policies (If you have infinite recursion errors)
If you're seeing "infinite recursion detected in policy" errors, run this first:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `database/fix-rls-policies.sql`
5. Click "Run" to fix the RLS policies

### Step 2: Run the Company Migration
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `database/add-company-support-simple.sql`
5. Click "Run" to execute the migration

### Step 3: Verify the Migration
After running the migration, you should see:
- ✅ New `companies` table created
- ✅ `company_id` column added to `users` table
- ✅ Demo companies inserted
- ✅ Demo users updated with company assignments
- ✅ Simple RLS policies (no recursion issues)

### Step 4: Test the Feature
1. Start your development server: `npm run dev`
2. Sign in as admin: `admin@company.com` / `demo123`
3. Navigate to the "Companies" tab in the sidebar
4. You should see the demo companies listed
5. Navigate to the "Users" tab to see company assignments

## 🔧 Troubleshooting

### If you see "infinite recursion detected in policy":
- Run the `fix-rls-policies.sql` script first
- Then run the `add-company-support-simple.sql` script
- This creates simple, non-recursive RLS policies

### If you see "Table doesn't exist" errors:
- Make sure you ran the migration script completely
- Check that the `companies` table was created in your Supabase dashboard

### If company assignments don't show:
- Verify that the `company_id` column was added to the `users` table
- Check that the demo data was inserted correctly

### If the Companies tab doesn't appear:
- Make sure you're signed in as an admin user
- Check that the navigation was updated correctly
- Verify that the CompaniesTab component was imported

## 📋 What's Added

### Database Changes
- **Companies Table**: Stores company information (name, description, industry, contact details)
- **User-Company Relationship**: Users can now be assigned to companies
- **Demo Data**: Sample companies and user assignments for testing
- **Simple RLS Policies**: No recursion issues

### UI Features
- **Companies Tab**: Admin-only interface for managing companies
- **Company Assignment**: Users can be assigned to companies during creation/editing
- **Company Display**: User cards show assigned company information

### Admin Capabilities
- Create new companies
- Edit company information
- Delete companies
- Assign users to companies
- View company assignments

## 🎯 Next Steps

After setting up the company feature, you can:
1. Create real companies for your clients
2. Assign users to appropriate companies
3. Use company information for filtering and reporting
4. Extend the feature with additional company-related functionality

---

**Note**: This feature is admin-only. Regular users and managers will not see the Companies tab in their navigation. 