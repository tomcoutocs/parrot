# Internal User Company Assignment Error Fix

## 🚨 Issue Description

**Error**: `Error creating company assignments: {}`

**Location**: When trying to assign multiple companies to one user (internal user role)

**Call Stack**: 
- `updateUser` function in `database-functions.ts`
- `handleEditUser` in `users-tab.tsx`

## 🔍 Root Cause

The error occurs because the `internal_user_companies` table does not exist in the database. This table is required for:

1. **Storing company assignments** for internal users
2. **Managing many-to-many relationships** between users and companies
3. **Tracking primary company designation** for internal users

## ✅ Solution

### Step 1: Run Database Migration

Execute the SQL migration file: `database/add-internal-user-support.sql`

This migration will:
- Add 'internal' role to the user role enum
- Create the `internal_user_companies` table
- Set up necessary indexes and RLS policies
- Enable the internal user functionality

### Step 2: Verify Migration

After running the migration, verify:
- ✅ `internal_user_companies` table exists
- ✅ 'internal' role appears in user creation/editing forms
- ✅ Company assignment checkboxes work for internal users

### Step 3: Test Functionality

1. Create a new internal user with multiple company assignments
2. Edit an existing user to change their role to internal
3. Assign multiple companies to an internal user
4. Verify company assignments are saved correctly

## 🔧 Code Changes Made

### 1. Database Migration
- Created `database/add-internal-user-support.sql`
- Added table creation, indexes, and RLS policies

### 2. Error Handling Improvements
- Enhanced error logging in `database-functions.ts`
- Added detailed error information for debugging
- Improved frontend error messages for users

### 3. Setup Documentation
- Created `database/SETUP-INTERNAL-USERS.md`
- Added troubleshooting guide
- Included technical implementation details

## 🚀 How to Apply the Fix

### Option 1: Run Migration in Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy contents of `database/add-internal-user-support.sql`
4. Click "Run"

### Option 2: Run Migration via CLI (if available)
```bash
# If you have Supabase CLI configured
supabase db push
```

## 🧪 Testing After Fix

### Test Case 1: Create Internal User
1. Navigate to Users tab
2. Click "Create User"
3. Select "Internal" role
4. Choose multiple companies
5. Set primary company
6. Save user
7. Verify companies are assigned

### Test Case 2: Edit Internal User
1. Edit an existing internal user
2. Change company assignments
3. Update primary company
4. Save changes
5. Verify updates are applied

### Test Case 3: Company Display
1. View internal users in the users list
2. Verify all assigned companies are displayed
3. Check primary company is highlighted
4. Confirm company badges show correctly

## 🔒 Security Considerations

The migration includes RLS policies that ensure:
- Users can only view their own company assignments
- Admins can manage all company assignments
- Managers can manage assignments for their company users
- Company data is properly isolated

## 🚨 If Issues Persist

### Check Database Schema
```sql
-- Verify table exists
SELECT * FROM information_schema.tables 
WHERE table_name = 'internal_user_companies';

-- Check table structure
\d internal_user_companies;

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'internal_user_companies';
```

### Check Browser Console
Look for detailed error messages that include:
- Error code
- Error details
- Error hint
- Full error object

### Verify User Permissions
Ensure the user running the migration has:
- CREATE TABLE permissions
- ALTER TYPE permissions
- CREATE POLICY permissions

## 📚 Additional Resources

- `database/SETUP-INTERNAL-USERS.md` - Complete setup guide
- `INTERNAL_USER_IMPLEMENTATION.md` - Feature overview
- `database/add-internal-user-support.sql` - Migration file

## 🔮 Future Improvements

Consider implementing:
- Better error handling with user-friendly messages
- Migration rollback functionality
- Automated migration verification
- Company assignment validation rules
