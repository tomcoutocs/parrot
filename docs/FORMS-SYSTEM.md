# Forms System Documentation

## Overview

The Forms System is a comprehensive feature that allows admins to create dynamic forms and users to fill them out. It provides a complete form builder with various field types, submission tracking, and role-based access control.

## Features

### Admin Features
- **Form Builder**: Create forms with multiple field types
- **Field Types**: Text, textarea, email, number, select, radio, checkbox, date
- **Form Management**: Edit, delete, and activate/deactivate forms
- **Submission Viewing**: View all submissions for each form
- **Form Analytics**: Track submission counts and user engagement

### User Features
- **Form Discovery**: View all active forms available to fill
- **Form Filling**: Fill out forms with validation
- **Submission History**: Track previously submitted forms

## Database Schema

### Forms Table
```sql
CREATE TABLE forms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    fields JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Form Submissions Table
```sql
CREATE TABLE form_submissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    form_id UUID REFERENCES forms(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    submission_data JSONB NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Field Types

### Text Input
- **Type**: `text`
- **Description**: Single line text input
- **Properties**: label, required, placeholder, validation

### Text Area
- **Type**: `textarea`
- **Description**: Multi-line text input
- **Properties**: label, required, placeholder, validation

### Email
- **Type**: `email`
- **Description**: Email address input with validation
- **Properties**: label, required, placeholder, validation

### Number
- **Type**: `number`
- **Description**: Numeric input
- **Properties**: label, required, placeholder, validation (min, max)

### Select (Dropdown)
- **Type**: `select`
- **Description**: Dropdown selection
- **Properties**: label, required, options array, validation

### Radio Buttons
- **Type**: `radio`
- **Description**: Radio button selection
- **Properties**: label, required, options array, validation

### Checkbox
- **Type**: `checkbox`
- **Description**: Boolean checkbox
- **Properties**: label, required, validation

### Date
- **Type**: `date`
- **Description**: Date picker
- **Properties**: label, required, validation

## Field Structure

```typescript
interface FormField {
  id: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'radio' | 'checkbox' | 'date'
  label: string
  required: boolean
  placeholder?: string
  options?: string[] // For select, radio fields
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}
```

## API Functions

### Form Management
- `fetchForms()`: Get all active forms
- `createForm()`: Create a new form
- `updateForm()`: Update an existing form
- `deleteForm()`: Delete a form

### Form Submissions
- `submitForm()`: Submit a form response
- `fetchFormSubmissions()`: Get all submissions for a form

## Components

### FormsTab
Main component for the forms interface with role-based functionality:
- **Admin**: Create, edit, delete forms, view submissions
- **User**: View and fill available forms

### CreateFormModal
Form builder interface for admins to create new forms with:
- Dynamic field addition/removal
- Field type selection
- Validation configuration
- Options management for select/radio fields

### EditFormModal
Form editor for admins to modify existing forms

### ViewSubmissionsModal
Submission viewer for admins to see all responses to a form

### FillFormModal
Form filler interface for users to complete forms

## Role-Based Access

### Admin Access
- Create, edit, delete forms
- View all forms and submissions
- Manage form status (active/inactive)
- Access to form analytics

### User Access
- View active forms only
- Fill out forms
- View own submission history

## Setup Instructions

1. **Run the setup script**:
   ```sql
   -- Execute the setup-forms.sql script in your Supabase SQL editor
   ```

2. **Verify the setup**:
   - Check that forms and form_submissions tables exist
   - Verify sample forms are created
   - Test form creation and submission

3. **Test the functionality**:
   - Login as admin and create a new form
   - Login as user and fill out a form
   - Check submissions as admin

## Sample Forms

The system comes with three sample forms:

### 1. Client Information Form
- Collects basic client information
- Fields: Name, Email, Phone, Company Size, Project Description

### 2. Service Request Form
- For requesting specific services
- Fields: Service Type, Priority, Start Date, Requirements, Budget

### 3. Feedback Survey
- Collects service feedback
- Fields: Name, Satisfaction Rating, Recommendation, Comments

## Usage Examples

### Creating a Form (Admin)
```typescript
const formData = {
  title: "Contact Form",
  description: "Get in touch with us",
  fields: [
    {
      id: "name",
      type: "text",
      label: "Full Name",
      required: true,
      placeholder: "Enter your name"
    },
    {
      id: "email",
      type: "email",
      label: "Email Address",
      required: true,
      placeholder: "Enter your email"
    }
  ],
  is_active: true
}

const result = await createForm(formData, userId)
```

### Submitting a Form (User)
```typescript
const submissionData = {
  name: "John Doe",
  email: "john@example.com"
}

const result = await submitForm(formId, submissionData, userId)
```

## Future Enhancements

### Planned Features
- **Form Templates**: Pre-built form templates
- **Conditional Logic**: Show/hide fields based on responses
- **File Upload**: Support for file attachments
- **Form Analytics**: Advanced analytics and reporting
- **Email Notifications**: Notify admins of new submissions
- **Form Scheduling**: Set form availability dates
- **Multi-step Forms**: Complex multi-page forms
- **Form Duplication**: Copy existing forms
- **Bulk Operations**: Manage multiple forms at once

### Technical Improvements
- **Form Validation**: Client-side and server-side validation
- **Form Preview**: Preview forms before publishing
- **Form Versioning**: Track form changes over time
- **Export Functionality**: Export submissions to CSV/Excel
- **API Integration**: Webhook support for form submissions
- **Mobile Optimization**: Better mobile form experience

## Troubleshooting

### Common Issues

1. **Forms not loading**:
   - Check database connection
   - Verify RLS policies are correct
   - Ensure user has proper permissions

2. **Form submission fails**:
   - Check required field validation
   - Verify form is active
   - Check user authentication

3. **Field validation errors**:
   - Ensure all required fields are filled
   - Check field type validation rules
   - Verify option arrays for select/radio fields

### Debug Steps

1. **Check console logs** for error messages
2. **Verify database tables** exist and have data
3. **Test with sample forms** first
4. **Check user permissions** and role assignments
5. **Validate form structure** in database

## Security Considerations

- **Input Validation**: All form inputs are validated
- **SQL Injection**: Using parameterized queries
- **XSS Prevention**: Sanitizing user inputs
- **Access Control**: Role-based permissions
- **Data Privacy**: Secure storage of form submissions

## Performance Notes

- **Indexing**: Database indexes on frequently queried columns
- **Pagination**: Large form lists are paginated
- **Caching**: Form data is cached where appropriate
- **Optimization**: Efficient queries for form submissions

---

*This documentation will be updated as the forms system evolves with new features and improvements.* 