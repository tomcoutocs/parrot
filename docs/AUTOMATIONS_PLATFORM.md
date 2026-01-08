# Automations Platform Documentation

## Overview

The Automations Platform is a comprehensive workflow automation system similar to Zapier, allowing users to create custom automation pipelines across the entire platform. It features a drag-and-drop visual builder, marketplace for sharing automations, and robust execution engine.

## Features

### ✅ Completed

1. **Database Schema**
   - Complete database schema with all necessary tables
   - Support for automations, nodes, connections, executions
   - Marketplace with likes, ratings, and installations
   - Integration management system

2. **App Structure**
   - Automations app added to main apps page
   - Full app layout with navigation
   - Tab-based interface (Builder, Saved, Marketplace, Liked, Settings)
   - Integrated with user permissions system

3. **Basic UI Components**
   - Builder canvas (placeholder)
   - Saved automations list
   - Marketplace grid
   - Liked automations page
   - Settings page

### 🚧 In Progress / To Be Built

1. **Drag-and-Drop Workflow Builder**
   - Visual canvas using react-flow or similar library
   - Node palette with trigger/action/condition types
   - Connection system between nodes
   - Node configuration modals
   - Real-time validation

2. **Node Types & Configuration**
   - **Triggers**: Webhook, Schedule, Event, API, Manual
   - **Actions**: Send Email, Create Task, Update Database, Call API, etc.
   - **Conditions**: If/Else, Switch, Filter
   - **Utilities**: Delay, Transform Data, Webhook Call

3. **Execution Engine**
   - Queue system for automation runs
   - Error handling and retry logic
   - Execution logging and debugging
   - Performance monitoring

4. **Marketplace Functionality**
   - Upload/share automations
   - Search and filtering
   - Categories and tags
   - Rating and review system
   - Installation flow

5. **Integration System**
   - OAuth connectors
   - API key management
   - Custom webhook endpoints
   - Integration marketplace

## Database Tables

### Core Tables
- `automations` - Main automation definitions
- `automation_nodes` - Individual steps in workflows
- `automation_connections` - Links between nodes
- `automation_executions` - Execution logs
- `automation_node_executions` - Per-node execution details

### Marketplace Tables
- `automation_marketplace` - Shared automations
- `automation_likes` - User likes
- `automation_ratings` - Ratings and reviews
- `automation_installations` - Installed automations

### Integration Tables
- `automation_integrations` - Available integrations
- `user_integrations` - User's connected integrations

## Next Steps

1. **Install react-flow** for drag-and-drop functionality
2. **Build node library** with common triggers and actions
3. **Create execution engine** API routes
4. **Implement marketplace** data fetching and sharing
5. **Add webhook system** for external triggers
6. **Build node configuration** UI components

## Usage

### Creating an Automation

1. Navigate to Apps > Automations
2. Click "Builder" tab
3. Drag nodes onto canvas
4. Configure each node
5. Connect nodes
6. Test automation
7. Save and activate

### Sharing to Marketplace

1. Open saved automation
2. Click "Share to Marketplace"
3. Add title, description, tags
4. Set visibility and pricing
5. Publish

### Installing from Marketplace

1. Browse marketplace
2. View details and ratings
3. Click "Install"
4. Configure for your space
5. Activate

## API Endpoints (To Be Created)

- `POST /api/automations` - Create automation
- `GET /api/automations` - List automations
- `PUT /api/automations/:id` - Update automation
- `DELETE /api/automations/:id` - Delete automation
- `POST /api/automations/:id/execute` - Manual trigger
- `POST /api/automations/:id/test` - Test run
- `GET /api/automations/marketplace` - Browse marketplace
- `POST /api/automations/marketplace/:id/install` - Install automation
- `POST /api/automations/marketplace/:id/like` - Like automation
- `POST /api/automations/marketplace/:id/rate` - Rate automation

## External Triggers

The platform supports external triggers via:
- Webhooks (custom endpoints)
- Scheduled triggers (cron-like)
- Event-based triggers (internal platform events)
- API triggers (REST API calls)
- Manual triggers (user-initiated)

## Security Considerations

- RLS policies on all tables
- User/space isolation
- API key encryption
- Webhook signature verification
- Rate limiting on executions
- Sandboxed execution environment

