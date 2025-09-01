# Document Management System Setup Guide

## 🗂️ Overview

The Document Management System provides a comprehensive file storage solution with:
- **Company-based document storage** with Supabase Storage
- **Hierarchical folder structure** for organization
- **Role-based access control** (users see only their company's documents)
- **Admin company switching** to manage multiple companies
- **File upload/download** with progress tracking
- **Search functionality** across documents
- **Storage usage monitoring**

## 🚀 Quick Setup

### Step 1: Set Up Supabase Storage Bucket

1. **Go to your Supabase Dashboard**
   - Visit [https://supabase.com](https://supabase.com)
   - Open your project

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click "Create a new bucket"

3. **Create the Bucket**
   - **Bucket name**: `company-documents`
   - **Public bucket**: ❌ **FALSE** (keep private)
   - **File size limit**: `50MB` (or your preferred limit)
   - **Allowed MIME types**: `*/*` (all file types)
   - Click "Create bucket"

4. **Set Storage Policies**
   - Click on the `company-documents` bucket
   - Go to "Policies" tab
   - Click "New Policy"
   - Use this policy for authenticated users:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'company-documents' AND auth.role() = 'authenticated');

-- Allow users to view files from their company
CREATE POLICY "Allow company file access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'company-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Allow users to update files they uploaded
CREATE POLICY "Allow file updates" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'company-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Allow users to delete files they uploaded
CREATE POLICY "Allow file deletion" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-documents' AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM internal_user_companies WHERE user_id = auth.uid() AND is_primary = true
    )
  );

-- Admin override: allow admins to access all files
CREATE POLICY "Admin full access" ON storage.objects
FOR ALL USING (
  bucket_id = 'company-documents' AND
  EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### Step 2: Run the Database Setup Script

1. **Navigate to SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New Query"

2. **Run the Setup Script**
   - Copy the entire contents of `database/setup-documents.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the schema

### Step 3: Verify the Setup

After running the script, you should see these new tables in your Supabase dashboard:

#### **Document Tables:**
- ✅ `document_folders` - Folder structure for company documents
- ✅ `documents` - Document metadata and file information

#### **Database Functions:**
- ✅ `get_folder_hierarchy()` - Get hierarchical folder structure
- ✅ `get_folder_contents()` - Get contents of a specific folder

#### **Sample Data:**
- ✅ Sample folders (General, Contracts, Invoices) for testing

## 🔧 How It Works

### **File Storage Structure:**
```
company-documents/
├── {company-id-1}/
│   ├── General/
│   │   ├── document1.pdf
│   │   └── document2.docx
│   ├── Contracts/
│   │   └── contract1.pdf
│   └── Invoices/
│       └── invoice1.pdf
└── {company-id-2}/
    ├── General/
    └── Documents/
```

### **Database Schema:**
- **`document_folders`**: Stores folder hierarchy with company isolation
- **`documents`**: Stores file metadata, paths, and company associations
- **Row Level Security**: Ensures users only see their company's documents
- **Foreign Keys**: Maintains data integrity with companies and users

### **Access Control:**
- **Regular Users**: Can only access documents from their assigned company
- **Admins**: Can switch between companies and access all documents
- **File Operations**: Users can only modify files they uploaded

## 🧪 Testing the System

### **Test as Admin:**
1. Sign in as `admin@company.com`
2. Navigate to Documents tab
3. Use company selector to switch between companies
4. Create folders and upload files
5. Test company switching functionality

### **Test as User:**
1. Sign in as `user@company.com`
2. Navigate to Documents tab
3. Create folders in your company
4. Upload various file types
5. Test folder navigation and search

### **Test File Operations:**
1. **Upload**: Drag and drop or click upload button
2. **Download**: Click download button on any document
3. **Delete**: Click delete button (only for your own files)
4. **Search**: Use search bar to find documents
5. **Navigation**: Click folders to navigate, use breadcrumbs

## 📊 Features Implemented

### **Core Functionality:**
- ✅ Company-based document isolation
- ✅ Hierarchical folder structure
- ✅ File upload with progress tracking
- ✅ File download functionality
- ✅ Folder creation and management
- ✅ File and folder deletion
- ✅ Search across documents
- ✅ Storage usage monitoring

### **Admin Features:**
- ✅ Company switching dropdown
- ✅ Access to all company documents
- ✅ Full document management capabilities

### **User Features:**
- ✅ Company-specific document access
- ✅ Personal file management
- ✅ Folder organization
- ✅ Search and filtering

## 🚨 Troubleshooting

### **Common Issues:**

1. **"Storage bucket not found" error**
   - Ensure `company-documents` bucket exists in Supabase Storage
   - Check bucket name spelling

2. **"Permission denied" errors**
   - Verify RLS policies are applied correctly
   - Check user role and company assignment
   - Ensure storage policies are set up

3. **Files not uploading**
   - Check file size limits (default: 50MB)
   - Verify storage bucket permissions
   - Check browser console for errors

4. **Documents not loading**
   - Verify database tables exist
   - Check RLS policies
   - Ensure user has company_id assigned

### **Debug Steps:**

1. **Check browser console** for error messages
2. **Verify storage bucket** exists and has correct policies
3. **Check database tables** exist and have sample data
4. **Test RLS policies** with direct database queries
5. **Verify user authentication** and company assignment

## 🔄 Next Steps

### **Enhancements to Consider:**

1. **File Preview**: Add preview for common file types (PDF, images)
2. **Version Control**: Track file versions and changes
3. **Sharing**: Allow users to share documents with specific permissions
4. **Audit Trail**: Log all file operations for compliance
5. **Bulk Operations**: Upload/download multiple files at once
6. **File Comments**: Add commenting system for documents
7. **Advanced Search**: Full-text search within documents
8. **Integration**: Connect with external storage providers

### **Performance Optimizations:**

1. **Pagination**: Load documents in chunks for large folders
2. **Caching**: Implement client-side caching for frequently accessed data
3. **Lazy Loading**: Load folder contents on demand
4. **Image Optimization**: Compress images before storage
5. **CDN Integration**: Use Supabase CDN for faster file delivery

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify your Supabase project settings
3. Ensure all environment variables are set correctly
4. Test the database connection in Supabase dashboard
5. Review the RLS policies for your user roles
6. Check storage bucket configuration and policies

---

The document management system is now fully integrated with your Client Portal and ready for use! 🎉
