# Internal User Implementation

## Overview

This implementation adds support for a new user role called "internal" that allows users to be assigned to multiple companies while having the same permissions as regular users.

## Key Features

### 1. Database Changes

- **New Role**: Added 'internal' to the user role enum
- **Junction Table**: Created `internal_user_companies` table for many-to-many relationships
- **Functions**: Added database functions to manage company assignments
- **RLS Policies**: Updated security policies for the new table

### 2. TypeScript Interfaces

- **Updated User Interface**: Added 'internal' to role types
- **New Interfaces**: 
  - `InternalUserCompany`: For company assignments
  - `UserWithCompanies`: Extended user interface with company data

### 3. Database Functions

- `getInternalUserCompanies()`: Fetch companies for an internal user
- `assignCompanyToInternalUser()`: Assign a company to an internal user
- `removeCompanyFromInternalUser()`: Remove a company from an internal user
- `fetchUsersWithCompanies()`: Fetch all users with their company data

### 4. UI Components

- **Users Tab**: Updated to support internal users
- **Company Selection**: Multi-select for internal users with primary company designation
- **User Display**: Shows all assigned companies for internal users
- **Role Filtering**: Added internal role to filters

## Database Migration

Run the following SQL migration to add internal user support:

```sql
-- Run the contents of database/add-internal-user-support.sql
```

## Usage

### Creating Internal Users

1. Navigate to the Users tab (admin only)
2. Click "Create User"
3. Select "Internal" as the role
4. Choose multiple companies from the checkbox list
5. Designate one company as primary (optional)
6. Set tab permissions (same as regular users)
7. Save the user

### Managing Internal Users

- Internal users can be assigned to multiple companies
- One company can be designated as "primary"
- Internal users have the same permissions as regular users
- They can access data from all their assigned companies

### Company Access

- Internal users see data from all their assigned companies
- The primary company is used as the default when needed
- Company filtering is handled automatically based on assignments

## Security

- RLS policies ensure users can only access their assigned companies
- Internal users can only see data from companies they're assigned to
- Admin users can manage all company assignments

## Testing

1. Run the database migration
2. Create an internal user with multiple company assignments
3. Verify the user can access data from all assigned companies
4. Test the UI displays companies correctly
5. Verify role-based filtering works

## Future Enhancements

- Company switching interface for internal users
- Bulk company assignment operations
- Company-specific permissions for internal users
- Audit logging for company assignments 