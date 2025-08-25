# Database Setup Guide

## 🚀 **Step 1: Apply Database Schema**

1. **Go to your Supabase Dashboard**
   - Visit [https://supabase.com](https://supabase.com)
   - Open your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Schema**
   - Copy the entire contents of `database/schema.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the schema

## 🔧 **Step 2: Verify Tables Created**

After running the schema, you should see these tables in your Supabase dashboard:

### **Core Tables:**
- ✅ `users` - User accounts and roles
- ✅ `projects` - Project management
- ✅ `tasks` - Kanban board tasks
- ✅ `task_comments` - Task discussions
- ✅ `task_activities` - Activity tracking

### **Supporting Tables:**
- ✅ `messages` - Chat functionality
- ✅ `documents` - File management
- ✅ `appointments` - Booking system
- ✅ `services` - Service catalog
- ✅ `forms` - Dynamic forms
- ✅ `form_submissions` - Form responses
- ✅ `activity_logs` - Audit trail

## 🧪 **Step 3: Test the Connection**

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open the application:**
   - Go to `http://localhost:3000`
   - Sign in with any demo account
   - Navigate to the "Projects" tab

3. **Check the browser console:**
   - Open Developer Tools (F12)
   - Look for any error messages
   - You should see data being loaded from Supabase

## 🔍 **Step 4: Verify Real-time Updates**

1. **Open two browser windows**
2. **Sign in as different users in each window**
3. **Navigate to the same project in both windows**
4. **Drag a task in one window**
5. **Watch the task move in real-time in the other window**

## 🛠️ **Troubleshooting**

### **If you see "Supabase not configured" messages:**
- Check your `.env.local` file has the correct Supabase URL and anon key
- Restart the development server after updating environment variables

### **If you see database errors:**
- Verify the schema was applied correctly
- Check that Row Level Security (RLS) policies are enabled
- Ensure your Supabase project is active

### **If real-time updates aren't working:**
- Check that real-time is enabled in your Supabase project settings
- Verify the database functions are working correctly
- Check browser console for subscription errors

## 📊 **Expected Behavior**

### **With Real Database:**
- ✅ Projects load from Supabase
- ✅ Tasks display with real data
- ✅ Drag-and-drop updates database
- ✅ Real-time updates between users
- ✅ Activity logging for all changes

### **Without Database (Demo Mode):**
- ⚠️ Empty kanban board
- ⚠️ Console warnings about Supabase not configured
- ⚠️ No real-time functionality

## 🎯 **Next Steps**

Once the database is connected:

1. **Add sample data** through the Supabase dashboard
2. **Test user roles** (admin, manager, user)
3. **Create new projects and tasks**
4. **Test real-time collaboration**
5. **Deploy to production**

## 📞 **Need Help?**

If you encounter issues:

1. Check the browser console for error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are set correctly
4. Test the database connection in Supabase dashboard

The kanban board will work in demo mode without a database, but for full functionality with real-time updates, you'll need the Supabase connection properly configured. 