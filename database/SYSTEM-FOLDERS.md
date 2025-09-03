# System Folders Feature

## Overview

The system folders feature allows for creating special folders that are visible to all companies but cannot be modified or deleted by regular users. This is useful for providing important documentation or setup instructions that should be available to everyone.

## Implementation

### Database Changes

1. **New Columns Added:**
   - `is_system_folder` (BOOLEAN): Indicates if this is a system-wide folder
   - `is_readonly` (BOOLEAN): Indicates if this folder is read-only

2. **RLS Policies Updated:**
   - Users can view system folders regardless of company
   - Users cannot create, update, or delete system folders
   - Admins retain full access to system folders

### Current System Folder

**Setup Instructions**
- ID: `550e8400-e29b-41d4-a716-446655440010`
- Path: `/Setup Instructions`
- Visible to: All companies
- Actions: Read-only (no upload, no delete, no subfolder creation)

## Usage

### For Users
- System folders appear with a yellow background and "System" badge
- Checkboxes are disabled for system folders
- No action menu (three dots) is shown for system folders
- Cannot upload files or create subfolders in system folders

### For Admins
- Full access to system folders
- Can modify system folder contents if needed
- Can delete system folders (though not recommended)

## Adding New System Folders

To add a new system folder, run a SQL command like:

```sql
INSERT INTO document_folders (
  id,
  name,
  company_id,
  parent_folder_id,
  path,
  created_by,
  is_system_folder,
  is_readonly
) VALUES (
  'your-uuid-here',
  'Your Folder Name',
  NULL,
  NULL,
  '/Your Folder Name',
  'admin-user-id',
  TRUE,
  TRUE
);
```

## Migration

Run the migration file `add-system-folders.sql` to:
1. Add the new columns to the database
2. Update RLS policies
3. Create the "Setup Instructions" system folder
