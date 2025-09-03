# Partner Implementation Fix Guide

## Overview
This guide provides the complete steps to implement partner functionality for companies, including fixing all linter errors.

## 1. Database Migration
Run the `database/add-partner-support.sql` script in Supabase SQL Editor to add the `is_partner` column.

## 2. Fix Linter Errors

### A. Update openEditModal function in companies-tab.tsx
Find this function and update it to include is_partner:

```typescript
const openEditModal = (company: Company) => {
  setSelectedCompany(company)
  setEditCompanyData({
    name: company.name,
    description: company.description || '',
    industry: company.industry || '',
    website: company.website || '',
    phone: company.phone || '',
    address: company.address || '',
    is_active: company.is_active,
    is_partner: company.is_partner // Add this line
  })
}
```

### B. Update resetCreateForm function
Find where createCompanyData is reset and add is_partner:

```typescript
setCreateCompanyData({ 
  name: '', 
  description: '', 
  industry: '', 
  website: '', 
  phone: '', 
  address: '', 
  is_partner: false // Add this line
})
```

### C. Update database functions
In `database-functions.ts`, update the company fetching to include is_partner:

```typescript
// In fetchUsersWithCompanies function, update both company selects:
.select('id, name, description, industry, is_active, is_partner, created_at, updated_at')
```

## 3. Add Partner Form Fields

### A. Create Company Modal
Add this field to the create company form:

```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="is_partner"
    checked={createCompanyData.is_partner}
    onCheckedChange={(checked) => 
      setCreateCompanyData(prev => ({ ...prev, is_partner: !!checked }))
    }
  />
  <Label htmlFor="is_partner">Partner Company</Label>
</div>
```

### B. Edit Company Modal
Add this field to the edit company form:

```typescript
<div className="flex items-center space-x-2">
  <Checkbox
    id="edit_is_partner"
    checked={editCompanyData.is_partner}
    onCheckedChange={(checked) => 
      setEditCompanyData(prev => ({ ...prev, is_partner: !!checked }))
    }
  />
  <Label htmlFor="edit_is_partner">Partner Company</Label>
</div>
```

## 4. Update Database Functions

### A. createCompany function
Update the insert statement:

```typescript
const { data, error } = await supabase
  .from('companies')
  .insert({
    name: companyData.name,
    description: companyData.description,
    industry: companyData.industry,
    website: companyData.website,
    phone: companyData.phone,
    address: companyData.address,
    is_partner: companyData.is_partner || false, // Add this line
    is_active: true
  })
  .select()
  .single()
```

### B. updateCompany function
Update the update statement:

```typescript
const { data, error } = await supabase
  .from('companies')
  .update({
    name: companyData.name,
    description: companyData.description,
    industry: companyData.industry,
    website: companyData.website,
    phone: companyData.phone,
    address: companyData.address,
    is_partner: companyData.is_partner, // Add this line
    is_active: companyData.is_active,
    updated_at: new Date().toISOString()
  })
  .eq('id', companyId)
  .select()
  .single()
```

## 5. Test the Implementation

1. Run the database migration
2. Refresh the companies tab
3. Create a new company with partner status
4. Edit an existing company to toggle partner status
5. Test the partner filter
6. Verify partner badges appear on company cards

## 6. Expected Results

- ✅ Companies can be marked as partners
- ✅ Partner filter works (All/Partners Only/Non-Partners Only)
- ✅ Partner companies show green "Partner" badge
- ✅ Partner status can be edited
- ✅ No linter errors
- ✅ Database properly stores partner status

## 7. Troubleshooting

If you encounter issues:
1. Check that the database migration ran successfully
2. Verify the `is_partner` column exists in the companies table
3. Ensure all TypeScript interfaces are updated
4. Check browser console for any JavaScript errors
5. Verify the partner filter is working correctly
