# Calendar System Setup Guide

## 🗓️ Overview

The Calendar System provides a comprehensive booking and scheduling solution for the Client Portal. It allows admins to block off unavailable times and users to request appointments with different duration options (15, 30, 45, or 60 minutes).

## 🚀 Quick Setup

### Step 1: Apply the Calendar Database Schema

1. **Go to your Supabase Dashboard**
   - Visit [https://supabase.com](https://supabase.com)
   - Open your project

2. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Complete Setup Script**
   - Copy the entire contents of `database/setup-calendar-complete.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the schema

### Step 2: Verify Calendar Tables Created

After running the script, you should see these new tables in your Supabase dashboard:

#### **Calendar Tables:**
- ✅ `admin_availability` - Admin time blocking
- ✅ `booking_requests` - User appointment requests
- ✅ `calendar_events` - Confirmed appointments

#### **Calendar Functions:**
- ✅ `check_time_slot_availability()` - Check if time slot is available
- ✅ `get_available_time_slots()` - Get available slots for a date
- ✅ `approve_booking_request()` - Approve request and create event
- ✅ `reject_booking_request()` - Reject booking request

## 🎯 Features Implemented

### **Admin Features:**
- ✅ Block time slots with reasons
- ✅ View pending booking requests
- ✅ Approve/reject booking requests
- ✅ Manage calendar events
- ✅ View calendar statistics

### **User Features:**
- ✅ Request appointments (15, 30, 45, 60 minutes)
- ✅ View calendar with events and blocked times
- ✅ See booking request status
- ✅ View confirmed appointments

### **Calendar Views:**
- ✅ Weekly calendar grid
- ✅ Color-coded events (confirmed, pending, blocked)
- ✅ Navigation between weeks
- ✅ Today highlighting

## 🔧 How It Works

### **Booking Flow:**
1. **User requests booking** → Creates entry in `booking_requests` table
2. **Admin reviews request** → Sees pending requests in calendar
3. **Admin approves/rejects** → Updates status and optionally creates calendar event
4. **Calendar event created** → Appears in calendar for both user and admin

### **Time Blocking:**
1. **Admin blocks time** → Creates entry in `admin_availability` with `is_available = false`
2. **Blocked time appears** → Shows as red in calendar
3. **Users cannot book** → System prevents booking in blocked slots

### **Availability Checking:**
- System checks for conflicts with:
  - Blocked time slots
  - Existing booking requests
  - Confirmed calendar events
- Business hours: 9 AM - 5 PM
- 30-minute slot increments

## 🧪 Testing the Calendar

### **Test as Admin:**
1. Sign in as `admin@company.com`
2. Navigate to Calendar tab
3. Click "Block Time" to block some time slots
4. View pending booking requests
5. Approve/reject requests

### **Test as User:**
1. Sign in as `user@company.com`
2. Navigate to Calendar tab
3. Click "Request Booking"
4. Fill out booking form with different durations
5. View calendar to see your requests

### **Demo Data Included:**
- Sample blocked time slots
- Sample pending booking requests
- Sample calendar events

## 📊 Calendar Statistics

The calendar shows real-time statistics:
- **Total Events**: Number of confirmed calendar events
- **Pending Requests**: Number of pending booking requests
- **Blocked Time Slots**: Number of admin-blocked time slots

## 🔐 Security & Permissions

### **Row Level Security (RLS):**
- Users can only see their own booking requests and events
- Admins can see all booking requests and manage events
- Users can read admin availability to see available slots
- Admins can manage their own availability

### **Role-Based Access:**
- **Admin**: Full calendar management, can block time, approve/reject requests
- **User**: Can request bookings, view own events and requests
- **Manager**: Can view calendar but limited management capabilities

## 🎨 UI Components

### **Calendar Grid:**
- Weekly view with day headers
- Color-coded event types:
  - 🔵 Blue: Confirmed events
  - 🟡 Yellow: Pending requests
  - 🔴 Red: Blocked times
- Today highlighting with blue ring

### **Modals:**
- **Block Time Modal**: For admins to block unavailable times
- **Request Booking Modal**: For users to request appointments
- **Event Details Modal**: For viewing event details

### **Statistics Cards:**
- Real-time counts of events, requests, and blocked slots
- Visual icons for each metric

## 🚨 Troubleshooting

### **Common Issues:**

1. **"No admin found" error**
   - Ensure demo users are created in database
   - Check that admin user exists with correct role

2. **Booking requests not showing**
   - Verify RLS policies are applied correctly
   - Check user permissions and role

3. **Calendar not loading**
   - Check Supabase connection
   - Verify environment variables are set
   - Check browser console for errors

4. **Time slots not available**
   - Check business hours (9 AM - 5 PM)
   - Verify no conflicts with existing events
   - Check admin availability settings

### **Database Queries for Debugging:**

```sql
-- Check admin availability
SELECT * FROM admin_availability WHERE admin_id = 'your-admin-id';

-- Check booking requests
SELECT * FROM booking_requests WHERE status = 'pending';

-- Check calendar events
SELECT * FROM calendar_events WHERE status = 'scheduled';

-- Test availability function
SELECT * FROM get_available_time_slots('admin-id', '2024-01-15', 30);
```

## 🔄 Next Steps

### **Enhancements to Consider:**
1. **Email Notifications**: Send confirmation emails for approved bookings
2. **Recurring Events**: Support for recurring appointments
3. **Calendar Integration**: Sync with external calendars (Google, Outlook)
4. **Video Conferencing**: Add meeting links for virtual appointments
5. **Reminder System**: Send reminders before appointments
6. **Mobile Optimization**: Improve mobile calendar experience

### **Integration Points:**
- **Notification System**: Integrate with existing notification system
- **User Management**: Connect with user roles and permissions
- **Project Management**: Link appointments to project tasks
- **Forms System**: Create appointment request forms

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are set correctly
4. Test the database connection in Supabase dashboard
5. Review the RLS policies for your user roles

The calendar system is now fully integrated with the existing Client Portal and ready for use! 