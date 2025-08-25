# Setup Guide: Company-Based Project Filtering

This guide explains how to implement company-based filtering for projects so users can only see projects from their own company.

## 🎯 Overview

The goal is to ensure that:
- **Admin users** can see all projects across all companies
- **Manager users** can see all projects from their assigned company
- **Regular users** can only see projects from their assigned company
- **Database-level security** via RLS policies prevents unauthorized access
- **Application-level filtering** provides additional security

## 📋 Implementation Steps

### Step 1: Run the Database Migration

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `database/update-projects-with-company.sql`
5. Click "Run" to execute the migration

This migration will:
- Add `company_id` column to the `projects` table
- Create necessary indexes for performance
- Update RLS policies for company-based filtering
- Insert sample projects with company assignments

### Step 2: Verify the Changes

After running the migration, you should see:

1. **Projects table** now has a `company_id` column
2. **RLS policies** are updated to filter by company
3. **Sample projects** are created with company assignments
4. **Sample tasks** are added to the projects

### Step 3: Test the Implementation

#### Test as Admin User
1. Sign in as `admin@company.com` / `demo123`
2. Navigate to the Projects tab
3. You should see all projects (can see projects from all companies)

#### Test as Manager User
1. Sign in as `manager@company.com` / `demo123`
2. Navigate to the Projects tab
3. You should see all projects from your company (can see all company projects)

#### Test as Regular User
1. Sign in as `user@company.com` / `demo123`
2. Navigate to the Projects tab
3. You should only see projects from your company

## 🔧 Technical Implementation Details

### Database Changes

#### 1. Projects Table Schema
```sql
ALTER TABLE projects ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
```

#### 2. RLS Policies
The new RLS policies ensure:
- **Admins** can see all projects from all companies
- **Managers** can see all projects from their company
- **Regular users** can only see projects from their company

```sql
CREATE POLICY "Allow company-based project access" ON projects
FOR ALL USING (
  -- Admins can see all projects
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
  OR
  -- Managers can see all projects from their company
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'manager'
    AND users.company_id = projects.company_id
  )
  OR
  -- Regular users can only see projects from their company
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'user'
    AND users.company_id = projects.company_id
  )
);
```

### Application Changes

#### 1. Updated Interfaces
- `Project` interface now includes `company_id?: string`
- `AuthUser` interface includes `companyId?: string`

#### 2. Database Functions
- `fetchProjects()` now accepts optional `companyId` parameter
- Projects are filtered by company at the application level

#### 3. Component Updates
- Projects tab filters projects based on user's company
- Create project modal includes company_id when creating projects

## 🚀 How It Works

### 1. User Authentication
When a user signs in, their `company_id` is loaded and stored in the session.

### 2. Project Loading
When the Projects tab loads:
- **Admin users**: No company filter applied (can see all projects from all companies)
- **Manager users**: No company filter applied (can see all projects from their company)
- **Regular users**: Company filter applied (only see their company's projects)

### 3. Database Security
RLS policies provide database-level security:
- Prevents unauthorized access even if application logic fails
- Ensures data isolation between companies

### 4. Real-time Updates
Real-time subscriptions respect the same company filtering rules.

## 🧪 Testing Scenarios

### Scenario 1: Admin Access
- **User**: Admin
- **Expected**: Can see all projects from all companies
- **Test**: Create projects for different companies, verify admin can see all

### Scenario 2: Manager Access
- **User**: Manager
- **Expected**: Can see all projects from their assigned company
- **Test**: Verify manager can see all projects from their company

### Scenario 3: User Access
- **User**: Regular user
- **Expected**: Can only see projects from their assigned company
- **Test**: Verify user cannot see projects from other companies

### Scenario 4: Cross-Company Security
- **Test**: Try to access project URLs directly from different company users
- **Expected**: RLS policies should prevent unauthorized access

## 🔍 Troubleshooting

### Issue: Users can see projects from other companies
**Solution**: 
1. Check that RLS policies are properly applied
2. Verify that users have the correct `company_id` assigned
3. Ensure the migration ran successfully

### Issue: Projects not showing up
**Solution**:
1. Check that projects have `company_id` assigned
2. Verify user's `company_id` is set correctly
3. Check application-level filtering logic

### Issue: RLS policy errors
**Solution**:
1. Run the migration script again
2. Check for any conflicting policies
3. Verify table structure matches expectations

## 📊 Monitoring

### Key Metrics to Monitor
- **Project visibility**: Ensure users only see appropriate projects
- **Performance**: Monitor query performance with company filtering
- **Security**: Regular audits of RLS policies

### Logs to Check
- Database query logs for RLS policy enforcement
- Application logs for company filtering logic
- Error logs for any access denied scenarios

## 🔄 Future Enhancements

### Potential Improvements
1. **Multi-company admin**: Allow admins to manage multiple companies
2. **Company switching**: Allow users to switch between companies they belong to
3. **Cross-company projects**: Support projects that span multiple companies
4. **Audit logging**: Track company-based access patterns

### Performance Optimizations
1. **Caching**: Cache company-based project lists
2. **Indexing**: Optimize database indexes for company queries
3. **Pagination**: Implement efficient pagination for large project lists

---

**Last Updated**: Current Sprint
**Next Review**: After initial deployment and testing 