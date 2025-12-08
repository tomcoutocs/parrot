# Company Delete Cascade Documentation

This document explains how company (space) deletion works and ensures all associated data is properly cleaned up.

## Overview

When a company (space) is deleted, all associated data should be removed from the database to maintain data integrity and prevent orphaned records.

## Database-Level Cascade Deletes

The migration `migrations/ensure_company_cascade_deletes.sql` ensures that foreign key constraints are set up with proper CASCADE behavior:

### Tables with CASCADE Delete (Data is Deleted)
- `company_services` - Junction table linking companies to services
- `internal_user_companies` - Junction table linking internal users to companies
- `projects` - All projects belonging to the company
- `documents` - All documents belonging to the company
- `space_bookmarks` - All bookmarks for the company
- `form_submissions` - All form submissions for the company
- `google_ads_metrics_cache` - Cached Google Ads metrics
- `meta_ads_metrics_cache` - Cached Meta Ads metrics
- `shopify_metrics_cache` - Cached Shopify metrics

### Tables with SET NULL (Data is Preserved, Reference is Cleared)
- `users` - User records are preserved, but `company_id` is set to NULL
- `activity_logs` - Audit trail is preserved, but `company_id` is set to NULL

## Application-Level Cleanup

The `deleteCompany()` function in `src/lib/database-functions.ts` performs explicit cleanup as a safety measure:

1. **Explicit Deletion**: Even though CASCADE should handle most deletions, the function explicitly deletes from:
   - `company_services`
   - `internal_user_companies`
   - Cache tables (Google Ads, Meta Ads, Shopify)
   - `space_bookmarks`
   - `projects`
   - `documents`
   - `form_submissions`

2. **Error Handling**: The function logs warnings for tables that don't exist or can't be accessed, but continues with the deletion process.

3. **Final Step**: After cleaning up related data, the company record itself is deleted.

## Setup Instructions

1. **Run the Migration**:
   ```sql
   -- Execute migrations/ensure_company_cascade_deletes.sql in Supabase SQL editor
   ```

2. **Verify Foreign Keys**:
   ```sql
   -- Check that foreign keys have CASCADE
   SELECT 
     tc.table_name, 
     kcu.column_name, 
     ccu.table_name AS foreign_table_name,
     rc.delete_rule
   FROM information_schema.table_constraints AS tc 
   JOIN information_schema.key_column_usage AS kcu
     ON tc.constraint_name = kcu.constraint_name
   JOIN information_schema.constraint_column_usage AS ccu
     ON ccu.constraint_name = tc.constraint_name
   JOIN information_schema.referential_constraints AS rc
     ON rc.constraint_name = tc.constraint_name
   WHERE ccu.table_name = 'companies'
   ORDER BY tc.table_name;
   ```

   Expected `delete_rule` values:
   - `CASCADE` for tables that should be deleted
   - `SET NULL` for tables that should preserve data

## What Gets Deleted

When a company is deleted, the following data is **permanently removed**:

- ✅ Company record
- ✅ Company-service associations
- ✅ Internal user-company assignments
- ✅ All projects and their associated tasks, comments, etc.
- ✅ All documents and folders
- ✅ All bookmarks
- ✅ All form submissions
- ✅ All cached API metrics (Google Ads, Meta Ads, Shopify)

## What Gets Preserved

The following data is **preserved** but references are cleared:

- ✅ User accounts (users table) - `company_id` set to NULL
- ✅ Activity logs (activity_logs table) - `company_id` set to NULL for audit trail

## Testing

To test the deletion:

1. Create a test company
2. Add some data (projects, documents, bookmarks, etc.)
3. Delete the company
4. Verify that:
   - Company record is gone
   - All related data is gone
   - User records still exist (if they were linked)
   - Activity logs still exist but show NULL for company_id

## Troubleshooting

### Foreign Key Constraint Errors

If you get foreign key constraint errors when deleting:

1. Check that the migration has been run
2. Verify foreign key constraints exist:
   ```sql
   SELECT constraint_name, table_name 
   FROM information_schema.table_constraints 
   WHERE constraint_name LIKE '%company_id%';
   ```

3. If constraints are missing, run the migration again

### Orphaned Records

If you find orphaned records after deletion:

1. Check if the foreign key constraint exists for that table
2. Verify the constraint has CASCADE behavior
3. Manually clean up orphaned records if needed

### Users Not Being Cleared

If users still show a company_id after deletion:

1. Check that the `users` table has a foreign key constraint
2. Verify it uses `ON DELETE SET NULL` (not CASCADE)
3. Users should persist but their `company_id` should be NULL

## Best Practices

1. **Always run the migration** before deleting companies in production
2. **Test deletion** in a development environment first
3. **Backup data** before bulk deletions
4. **Monitor logs** during deletion to catch any issues
5. **Verify cleanup** after deletion to ensure no orphaned records

## Related Files

- `migrations/ensure_company_cascade_deletes.sql` - Database migration
- `src/lib/database-functions.ts` - `deleteCompany()` function
- `src/components/modern-settings-tab.tsx` - UI for deleting companies

