# Database Migration Instructions

## Adding Tab Permissions Column

The application now supports granular tab permissions for users, but the database schema needs to be updated first.

### Manual Migration Steps

1. **Access your Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to the SQL Editor

2. **Run the Migration SQL**
   - Copy the contents of `database/add-tab-permissions.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify the Migration**
   - The migration will:
     - Add a `tab_permissions` column to the `users` table
     - Set default permissions for existing users based on their roles
     - Add Row Level Security (RLS) policies for the new column

### What the Migration Does

- **Adds `tab_permissions` column**: A TEXT array that stores which tabs each user can access
- **Sets default permissions**:
  - **Admin users**: All tabs (`analytics`, `projects`, `forms`, `services`, `calendar`, `documents`, `chat`, `admin`, `companies`, `debug`)
  - **Manager users**: Most tabs except admin-specific ones (`analytics`, `projects`, `forms`, `services`, `calendar`, `documents`, `chat`)
  - **Regular users**: Basic tabs (`analytics`, `projects`, `forms`, `services`, `calendar`, `chat`)
- **Adds RLS policies**: Ensures users can only see their own permissions and admins can manage all permissions

### After Migration

Once the migration is complete:
1. The user management interface will show tab permission controls
2. Admins can assign specific tab access to users
3. The navigation will filter based on user permissions
4. Users will only see tabs they have permission to access

### Troubleshooting

If you encounter any issues:
1. Check that you have admin access to the Supabase project
2. Ensure the `users` table exists and has the expected structure
3. Verify that RLS is enabled on the `users` table
4. Check the Supabase logs for any error messages

### Rollback (if needed)

If you need to rollback the migration:
```sql
-- Remove the tab_permissions column
ALTER TABLE users DROP COLUMN IF EXISTS tab_permissions;

-- Remove the RLS policies
DROP POLICY IF EXISTS "Users can view own tab permissions" ON users;
DROP POLICY IF EXISTS "Admins can view all tab permissions" ON users;
DROP POLICY IF EXISTS "Admins can update tab permissions" ON users;
DROP POLICY IF EXISTS "Admins can insert tab permissions" ON users;
``` 