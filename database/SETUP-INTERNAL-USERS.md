# Setup Guide: Internal User Support

This guide explains how to set up internal user support, which allows users to be assigned to multiple companies.

## 🎯 Overview

The internal user feature enables:
- **Multi-company access**: Users can be assigned to multiple companies
- **Primary company designation**: One company can be marked as primary
- **Same permissions**: Internal users have the same tab permissions as regular users
- **Company filtering**: Data is automatically filtered based on company assignments

## 📋 Implementation Steps

### Step 1: Check Your Database Structure (Recommended)

First, run the diagnostic script to understand your current database setup:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `database/check-database-structure.sql`
5. Click "Run" to see your current database structure
6. Review the results to understand your setup

### Step 2: Run the Database Migration

**Use the safe migration script** to avoid errors with existing objects:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `database/add-internal-user-support-safe.sql`
5. Click "Run" to execute the migration

**Note**: If you've already run the migration before and got policy errors, use this safe version instead.

This migration will:
- Add 'internal' to the user role enum
- Create the `internal_user_companies` junction table
- Set up necessary indexes for performance
- Apply RLS policies for security
- Enable company assignment management

### Step 2: Verify the Migration

After running the migration, you should see:
1. **New role**: 'internal' added to user role options
2. **New table**: `internal_user_companies` created
3. **Indexes**: Performance indexes created
4. **RLS policies**: Security policies applied

### Step 3: Test the Implementation

#### Test as Admin User
1. Sign in as `admin@company.com` / `demo123`
2. Navigate to the Users tab
3. Click "Create User"
4. Select "Internal" as the role
5. Choose multiple companies from the checkbox list
6. Designate one company as primary (optional)
7. Set tab permissions
8. Save the user

#### Test Company Assignments
1. Edit an internal user
2. Change their company assignments
3. Verify the changes are saved correctly
4. Check that the user can see data from all assigned companies

## 🔧 Technical Implementation Details

### Database Changes

#### 1. User Role Enum
```sql
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'internal';
```

#### 2. Internal User Companies Table
```sql
CREATE TABLE internal_user_companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(user_id, company_id)
);
```

#### 3. RLS Policies
The RLS policies ensure:
- **Users** can view their own company assignments
- **Admins** can manage all company assignments
- **Managers** can manage assignments for their company users

### Application Changes

#### 1. Updated Interfaces
- `User` interface now includes 'internal' role
- `InternalUserCompany`: For company assignments
- `UserWithCompanies`: Extended user interface with company data

#### 2. Database Functions
- `getInternalUserCompanies()`: Fetch companies for an internal user
- `assignCompanyToInternalUser()`: Assign a company to an internal user
- `removeCompanyFromInternalUser()`: Remove a company from an internal user
- `fetchUsersWithCompanies()`: Fetch all users with their company data

#### 3. UI Components
- **Users Tab**: Updated to support internal users
- **Company Selection**: Multi-select for internal users with primary company designation
- **User Display**: Shows all assigned companies for internal users

## 🚀 How It Works

### 1. User Creation/Update
When creating or updating an internal user:
1. User record is created/updated in the `users` table
2. Company assignments are managed in the `internal_user_companies` table
3. One company can be designated as primary

### 2. Company Access
Internal users can:
- Access data from all their assigned companies
- Have a primary company for default operations
- Switch between companies as needed

### 3. Data Filtering
- Company-specific data is automatically filtered based on assignments
- Internal users see aggregated data from all assigned companies
- Primary company is used for default operations

## 🔒 Security

- RLS policies ensure users can only access their assigned companies
- Internal users can only see data from companies they're assigned to
- Admin users can manage all company assignments
- Company assignments are validated at the database level

## 🧪 Testing

1. Run the database migration
2. Create an internal user with multiple company assignments
3. Verify the user can access data from all assigned companies
4. Test the UI displays companies correctly
5. Verify role-based filtering works
6. Test company assignment updates

## 🚨 Troubleshooting

### If you see "Error creating company assignments: {}":
- The `internal_user_companies` table may not exist
- Run the database migration first
- Check the browser console for detailed error information

### If company assignments don't save:
- Verify the RLS policies are correctly applied
- Check that the user has admin or manager permissions
- Ensure the companies exist in the database

### If the internal role doesn't appear:
- Make sure the migration ran successfully
- Check that the user role column accepts text values
- Verify the migration completed without errors

### If you see "type 'user_role' does not exist":
- This means your users table uses a TEXT/VARCHAR column for roles, not an enum
- The updated migration handles this automatically
- Run the migration again with the updated script

### If you see "policy already exists" errors:
- This means the migration was partially run before
- Use the safe migration script: `database/add-internal-user-support-safe.sql`
- This script will drop existing policies and recreate them safely

## 🔮 Future Enhancements

- Company switching interface for internal users
- Bulk company assignment operations
- Company-specific permissions for internal users
- Audit logging for company assignments
- Company hierarchy support
