# Complete Database Setup Guide

## 🚨 **Important: Fix for Services Error**

If you're seeing the error `Error adding company services: {}`, this means the database schema is not properly set up for the services functionality. Follow these steps to fix it.

## 🚀 **Step 1: Run Complete Database Setup**

1. **Go to your Supabase Dashboard**
   - Visit [https://supabase.com](https://supabase.com)
   - Open your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Complete Setup**
   - Copy the entire contents of `database/setup-complete.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the complete setup

## 🔧 **What This Setup Does**

The `setup-complete.sql` script:

1. **Creates all core tables** (users, projects, tasks, etc.)
2. **Adds company support** (companies table, company_id columns)
3. **Adds services support** (services table with categories, company_services junction table)
4. **Enables Row Level Security (RLS)** on all tables
5. **Creates proper RLS policies** for secure access
6. **Inserts demo data** including companies and services
7. **Sets up proper relationships** between companies, users, and services

## 🧪 **Step 2: Test the Services Functionality**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   - Go to `http://localhost:3000`
   - Sign in with an admin account (e.g., `admin@company.com`)
   - Navigate to the "Services" tab

3. **Test the services management:**
   - Click "Manage Company Services"
   - Select/deselect services
   - Click "Update Services"
   - Check that the operation completes without errors

## 🔍 **Step 3: Verify Database Tables**

After running the setup, you should see these additional tables in your Supabase dashboard:

### **New Tables:**
- ✅ `companies` - Company information
- ✅ `company_services` - Junction table linking companies to services
- ✅ `services` - Service catalog (with category and subcategory columns)

### **Updated Tables:**
- ✅ `users` - Now has `company_id` column
- ✅ `projects` - Now has `company_id` column
- ✅ `services` - Now has `category`, `subcategory`, and `updated_at` columns

## 🛠️ **Troubleshooting**

### **If you still see the error:**
1. **Check the browser console** for more detailed error messages
2. **Verify the database tables exist** in your Supabase dashboard
3. **Check that RLS policies are enabled** on the `company_services` table
4. **Ensure your user has a `company_id`** assigned

### **If tables don't exist:**
- Make sure you ran the complete `setup-complete.sql` script
- Check that the script executed without errors
- Try running it again (it's idempotent, so it's safe to run multiple times)

### **If RLS policies are missing:**
- The setup script should create all necessary policies
- Check the "Authentication" > "Policies" section in your Supabase dashboard
- You should see policies for `company_services`, `services`, and `companies` tables

## 📊 **Expected Behavior After Setup**

### **Services Tab:**
- ✅ Services load with categories (Paid Media, Organic, Creative)
- ✅ Each service shows its subcategory
- ✅ Admin users can click "Manage Company Services"
- ✅ Services can be selected/deselected
- ✅ Updates complete without errors
- ✅ Changes persist in the database

### **Database:**
- ✅ `company_services` table contains relationships
- ✅ RLS policies allow proper access
- ✅ Foreign key constraints work correctly

## 🎯 **Next Steps**

Once the services functionality is working:

1. **Test with different user roles** (admin, manager, user)
2. **Create new companies** and assign services to them
3. **Test the services filtering** and search functionality
4. **Verify real-time updates** work correctly

## 📞 **Need Help?**

If you encounter issues:

1. Check the browser console for detailed error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are set correctly
4. Test the database connection in Supabase dashboard
5. Check that the `setup-complete.sql` script ran successfully

The services functionality requires the complete database schema to be properly set up. The `setup-complete.sql` script ensures all necessary tables, relationships, and policies are in place. 