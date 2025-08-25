# Services Feature Setup Guide

## Overview

The Services feature allows companies to manage which services are available to their users. Services are organized into three main categories:

- **Paid Media**: Meta, Google, Display
- **Organic**: SMM, Content Creation, Email/SMS, Copywriting  
- **Creative**: Brand Development, Strategy, Web Design, 3D Renderings, Production

## Database Setup

### 1. Run the Services Setup Script

Execute the following SQL script in your Supabase database:

```sql
-- Run the add-services-support.sql file
-- This creates the services and company_services tables
-- and populates them with the predefined services
```

### 2. Tables Created

#### services table
- `id`: UUID primary key
- `name`: Service name (e.g., "Meta", "Google", "SMM")
- `description`: Detailed service description
- `category`: Service category ("Paid Media", "Organic", "Creative")
- `subcategory`: Service subcategory (e.g., "Social Media Advertising")
- `is_active`: Boolean flag for active/inactive services
- `created_at`, `updated_at`: Timestamps

#### company_services table
- `id`: UUID primary key
- `company_id`: Foreign key to companies table
- `service_id`: Foreign key to services table
- `is_active`: Boolean flag for active/inactive company service
- `created_at`: Timestamp
- Unique constraint on (company_id, service_id)

### 3. Predefined Services

The setup script creates 12 predefined services:

#### Paid Media Services
- **Meta**: Facebook and Instagram advertising campaigns
- **Google**: Google Ads campaigns across Search, Display, and YouTube
- **Display**: Wide-reaching display advertising campaigns

#### Organic Services
- **SMM**: Strategic social media management
- **Content Creation**: High-quality content creation across platforms
- **Email/SMS**: Strategic email and SMS marketing campaigns
- **Copywriting**: Compelling copywriting services

#### Creative Services
- **Brand Development**: Comprehensive brand development services
- **Strategy**: Strategic marketing and business planning
- **Web Design**: Custom website design and development
- **3D Renderings**: High-quality 3D rendering and visualization
- **Production**: Professional video and photo production services

## Usage

### For Admins

1. **View Services**: Navigate to the Services tab to see all available services organized by category
2. **Manage Company Services**: 
   - Go to Companies tab
   - Click "Services" button on any company card
   - Select/deselect services for that company
   - Save changes

### For Users

1. **View Available Services**: Navigate to the Services tab to see services available to your company
2. **Service Status**: Active services for your company are highlighted with a green checkmark

## Features

- **Service Categories**: Services are organized into logical categories with icons and color coding
- **Company-Specific Access**: Each company can have different services enabled
- **Search and Filter**: Users can search services and filter by category
- **Admin Management**: Admins can easily manage which services each company has access to
- **Visual Indicators**: Active services are clearly marked with checkmarks and green borders

## Security

- Row Level Security (RLS) is enabled on both tables
- Users can only see services for their own company
- Only admins can manage company service assignments
- All users can read the services table (for display purposes)

## Demo Data

The setup script includes demo data with sample company-service assignments:

- **TechCorp Solutions**: All services enabled
- **Global Manufacturing**: Paid Media and Creative services only
- **Healthcare Partners**: Organic and Creative services only  
- **Financial Services Group**: Paid Media services only

## Troubleshooting

### Common Issues

1. **Services not showing**: Check that the services table has been created and populated
2. **Company services not updating**: Verify RLS policies are correctly configured
3. **Permission errors**: Ensure the user has the correct role (admin for management)

### Database Queries

To check if services are properly set up:

```sql
-- Check services table
SELECT * FROM services WHERE is_active = true;

-- Check company services for a specific company
SELECT s.name, s.category, cs.is_active 
FROM company_services cs 
JOIN services s ON cs.service_id = s.id 
WHERE cs.company_id = 'your-company-id' AND cs.is_active = true;
``` 