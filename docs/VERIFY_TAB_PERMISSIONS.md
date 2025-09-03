# Verify Tab Permissions Setup

## Step 1: Check Database Migration

1. Go to your Supabase Dashboard
2. Navigate to the SQL Editor
3. Run the verification script: `database/verify-tab-permissions.sql`

This will show you:
- Whether the `tab_permissions` column exists
- Current data in the column
- Any users with NULL permissions

## Step 2: Run the Migration (if needed)

If the column doesn't exist, run the migration:
1. In Supabase SQL Editor, run: `database/add-tab-permissions.sql`

## Step 3: Test the Application

1. Start the development server: `npm run dev`
2. Log in as an admin user
3. Go to the Users tab
4. Try to create a new user with specific tab permissions
5. Check the browser console for debug messages
6. Try to edit an existing user's tab permissions

## Step 4: Check Console Logs

Look for these debug messages in the browser console:
- "Tab permissions to save: [...]" - when creating/updating users
- "Created user tab permissions: [...]" - after successful creation
- "Updated user tab permissions: [...]" - after successful update
- "Sample user tab permissions: [...]" - when fetching users

## Step 5: Verify the Fix

The main issue was that the `fetchUsers` function wasn't selecting the `tab_permissions` column from the database. This has been fixed to:

1. First try to fetch with `tab_permissions` column
2. Fall back to fetch without it if the column doesn't exist
3. Always ensure `tab_permissions` is an array in the returned data

## Expected Behavior

- When you create a user with specific tab permissions, they should be saved to the database
- When you edit a user's tab permissions, the changes should persist
- When you view the users list, you should see the tab permissions displayed
- The tab permissions should control which tabs are visible to each user

## Troubleshooting

If tab permissions still aren't saving:

1. Check if the `tab_permissions` column exists in your database
2. Verify that the migration script was run successfully
3. Check browser console for any error messages
4. Ensure you're logged in as an admin user
5. Try refreshing the page after making changes 