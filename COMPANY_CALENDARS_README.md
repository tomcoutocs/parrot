# Company Calendars Feature

## Overview
The Company Calendars feature allows users to view and manage calendar events within their company. Admins can switch between different company calendars, while regular users can only see their own company's calendar.

## Features

### For All Users
- **View Company Calendar**: See all events for your company
- **Add Events**: Create new calendar events with title, description, date, and time
- **Delete Events**: Remove events you created
- **Calendar Views**: Today, This Week, This Month, All Time
- **Event Expansion**: Click on events to see full details
- **Day Expansion**: Click on days with multiple events to see all events for that day

### For Admins Only
- **Company Switching**: Switch between different company calendars using a dropdown
- **Full Access**: View, create, and delete events for any company

## Database Setup

### 1. Run the SQL Script
Execute the `setup-company-calendars.sql` script in your Supabase database:

```sql
-- Run this in your Supabase SQL editor
\i setup-company-calendars.sql
```

### 2. Tables Created
- **`companies`**: Stores company information
- **`company_events`**: Stores calendar events for each company
- **`users.company_id`**: Added to existing users table to link users to companies

### 3. Sample Data
The script includes sample companies and events for testing:
- Acme Corporation
- Tech Solutions Inc
- Global Industries

## Security Features

### Row Level Security (RLS)
- Users can only see events from their own company
- Users can only create/delete events in their own company
- Admins have full access to all companies and events

### Permissions
- **Regular Users**: View and manage events in their company only
- **Admins**: Full access to all companies and events

## Usage

### Adding Events
1. Click the "Add Event" button
2. Fill in the required fields:
   - Event Title (required)
   - Description (optional)
   - Date (required)
   - Start Time (required)
   - End Time (required)
3. Click "Create Event"

### Viewing Events
- **Compact View**: Events are shown as small cards in each day
- **Expanded View**: Click the "+" button on days with events to see full details
- **Event Details**: Click on individual events to expand and see more information

### Filtering
- **Today**: Shows only today's events
- **This Week**: Shows events for the current week
- **This Month**: Shows events for the current month
- **All Time**: Shows all events

### Navigation
- **Month Navigation**: Use left/right arrows to navigate between months
- **Day Expansion**: Click "+" on days with events to expand
- **Event Expansion**: Click on event titles or "+" buttons to see details

## Technical Details

### Components
- **`CompanyCalendarsTab`**: Main component for the company calendars tab
- **Calendar Grid**: Responsive grid layout for different view modes
- **Event Management**: Create, view, and delete events
- **Company Selection**: Admin-only company switcher

### State Management
- **Events**: List of all events for the selected company
- **Companies**: List of available companies (admin only)
- **Selected Company**: Currently active company
- **Calendar State**: Current month, filter type, expanded states

### API Calls
- **Load Companies**: Fetches available companies based on user role
- **Load Events**: Fetches events for the selected company
- **Create Event**: Adds new event to the database
- **Delete Event**: Removes event from the database

## Customization

### Adding New Fields
To add new fields to events (e.g., location, attendees):

1. **Database**: Add columns to `company_events` table
2. **Interface**: Update the `CompanyEvent` interface
3. **Forms**: Add form fields to the create event dialog
4. **Display**: Update event display components

### Styling
The component uses Tailwind CSS classes and can be customized by:
- Modifying color schemes in the calendar cells
- Adjusting spacing and sizing
- Changing icon usage from Lucide React

### Permissions
To modify user permissions:
1. Update the RLS policies in the SQL script
2. Modify the `isAdmin` check in the component
3. Adjust the navigation item roles in `dashboard-layout.tsx`

## Troubleshooting

### Common Issues

1. **"No Company Selected" Error**
   - Ensure the user has a `company_id` in the `users` table
   - Check that the company exists in the `companies` table

2. **Permission Denied Errors**
   - Verify RLS policies are enabled
   - Check user role and company association
   - Ensure proper foreign key relationships

3. **Events Not Loading**
   - Check database connection
   - Verify company_id matches between user and events
   - Check browser console for error messages

### Debug Mode
Enable debug logging by checking the browser console for:
- Company loading status
- Event fetching results
- Permission checks
- API call responses

## Future Enhancements

### Potential Features
- **Recurring Events**: Support for daily, weekly, monthly recurring events
- **Event Categories**: Color coding and filtering by event type
- **Attendee Management**: Invite and track event attendees
- **Calendar Sharing**: Export calendar to external applications

- **Conflict Detection**: Warn about overlapping events
- **Bulk Operations**: Create multiple events at once

### Performance Optimizations
- **Pagination**: Load events in chunks for large calendars
- **Caching**: Implement client-side caching for frequently accessed data
- **Real-time Updates**: WebSocket integration for live calendar updates
- **Search**: Full-text search across event titles and descriptions
