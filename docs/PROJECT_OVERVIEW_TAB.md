# Project Overview Tab

## Overview
The Project Overview tab is an admin-only feature that provides a comprehensive view of all projects across all companies in the system. This tab is designed to give administrators a bird's-eye view of project status, progress, and performance across the entire organization.

## Features

### 🔐 Admin-Only Access
- Only users with the 'admin' role can access this tab
- Non-admin users will see an "Access Denied" message

### 📊 Dashboard Statistics
- **Total Projects**: Count of all projects across all companies
- **Active Projects**: Currently in-progress projects
- **Completed Projects**: Successfully finished projects
- **Overdue Projects**: Projects past their due date

### 🔍 Advanced Filtering
- **Search**: Search by project title, description, or company name
- **Status Filter**: Filter by project status (Active, Completed, On Hold, Cancelled)
- **Company Filter**: Filter by specific company
- **Priority Filter**: Filter by project priority (High, Medium, Low)

### 📋 Project Table
The main table displays:
- **Project**: Title and description
- **Company**: Company name with building icon
- **Status**: Color-coded status badges
- **Priority**: Color-coded priority badges
- **Progress**: Visual progress bar with percentage
- **Due Date**: Formatted date with overdue highlighting
- **Manager**: Project manager name
- **Tasks**: Task count for each project

### 🎨 Visual Indicators
- **Progress Bars**: Show completion percentage for each project
- **Color-Coded Badges**: Different colors for status and priority
- **Overdue Highlighting**: Red text for overdue projects
- **Icons**: Visual icons for better UX

## Technical Implementation

### Files Created/Modified
1. **`src/components/tabs/project-overview-tab.tsx`** - Main component
2. **`src/components/ui/progress.tsx`** - Progress bar component
3. **`src/components/dashboard-layout.tsx`** - Added navigation item
4. **`src/app/dashboard/page.tsx`** - Added tab routing
5. **`src/lib/auth.ts`** - Added tab permissions

### Dependencies Added
- `@radix-ui/react-progress` - For progress bar functionality

### Data Flow
1. Component loads and fetches all projects using `fetchProjects()`
2. Fetches all companies using `fetchCompanies()`
3. Combines project data with company information
4. Applies filters based on user input
5. Renders filtered results in the table

## Usage

### For Administrators
1. Log in with admin credentials
2. Navigate to the "Project Overview" tab in the sidebar
3. Use the filters to find specific projects
4. Monitor project progress and identify overdue items
5. Click "Refresh Data" to update the view

### Key Benefits
- **Centralized View**: See all projects in one place
- **Quick Insights**: Identify bottlenecks and overdue projects
- **Company Comparison**: Compare project performance across companies
- **Resource Planning**: Understand project distribution and workload

## Future Enhancements
- Export functionality for reports
- Real-time updates via WebSocket
- Advanced analytics and charts
- Project timeline visualization
- Resource allocation tracking
