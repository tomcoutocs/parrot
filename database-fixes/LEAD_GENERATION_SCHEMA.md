# Lead Generation Database Schema

This document describes the database schema for the Lead Generation application.

## Overview

The Lead Generation app uses a comprehensive database schema to store all lead-related data, from form creation to lead conversion. The schema is designed to be flexible, scalable, and customizable for each user's business needs.

## Tables

### Core Tables

#### `companies`
Stores companies that leads belong to. **This is separate from the `spaces` table** (which represents client workspaces). Companies can optionally be tied to a space later via `space_id`.

**Key Fields:**
- `id`: UUID primary key
- `user_id`: Owner/creator of the company record
- `space_id`: Optional reference to a space (client workspace)
- `name`: Company name
- `website`, `industry`, `company_size`: Company details
- `company_data`: JSONB for enrichment data
- `is_active`: Whether company is active

#### `lead_forms`
Stores customizable lead capture forms.

**Key Fields:**
- `id`: UUID primary key
- `user_id`: Owner of the form
- `space_id`: Optional space/company association
- `name`, `title`, `description`: Form metadata
- `ai_personalization_enabled`: Enable AI personalization
- `form_settings`: JSONB for additional settings (theme, styling, etc.)

#### `lead_form_fields`
Fields within each form.

**Key Fields:**
- `form_id`: Reference to parent form
- `field_type`: Type of field (text, email, phone, select, etc.)
- `label`, `placeholder`: Field display properties
- `is_required`: Whether field is required
- `field_order`: Display order
- `options`: JSONB array for select/checkbox options
- `validation_rules`: JSONB for validation (min/max, regex, etc.)

#### `leads`
Main lead records - the core of the system.

**Key Fields:**
- `id`: UUID primary key
- `user_id`: Owner/creator
- `space_id`: Optional space association (for workspace organization)
- `company_id`: **Reference to the `companies` table** - the company this lead belongs to
- `assigned_to`: Assigned team member
- Basic info: `first_name`, `last_name`, `email`, `phone`, `job_title`
- **Note:** Company-related fields (`company_name`, `website`, `industry`, `company_size`) are stored in the `companies` table, not directly on the lead
- `stage_id`: Current pipeline stage
- `source_id`: Where the lead came from
- `score`: Lead score (0-100)
- `status`: Current status
- `form_id`: Which form captured this lead
- `form_submission_data`: JSONB with original submission
- `custom_fields`: JSONB for custom field values
- BANT fields: `budget`, `authority`, `need`, `timeline`
- `enriched_data`: Data from enrichment services
- `converted_to_customer`: Boolean flag
- `customer_id`: Reference when converted to customer

#### `lead_stages`
Customizable pipeline stages.

**Key Fields:**
- `name`: Stage name (e.g., "New", "Qualified", "Proposal")
- `stage_order`: Display order
- `color`: Hex color code
- `is_default`: Whether it's a default stage

#### `lead_sources`
Track where leads originate.

**Key Fields:**
- `name`: Source name
- `type`: Source type (website, linkedin, email, etc.)
- `utm_source`, `utm_medium`, `utm_campaign`: UTM tracking

### Activity & Tracking

#### `lead_activities`
Activity log for all lead interactions.

**Key Fields:**
- `lead_id`: Reference to lead
- `user_id`: Who performed the activity
- `activity_type`: Type of activity (email_sent, call_made, etc.)
- `description`: Human-readable description
- `activity_data`: JSONB for additional data

### Scoring & Intelligence

#### `lead_scoring_rules`
AI-powered lead scoring rules.

**Key Fields:**
- `criteria_type`: What to check (email_domain, company_size, etc.)
- `condition`: How to check (equals, contains, greater_than, etc.)
- `value`: Value to compare against
- `points`: Points to add/subtract (-100 to 100)
- `is_active`: Whether rule is active

### Automation

#### `lead_workflows`
Automation workflows.

**Key Fields:**
- `name`, `description`: Workflow metadata
- `is_active`: Whether workflow is running
- `workflow_settings`: JSONB for workflow configuration

#### `lead_workflow_triggers`
What triggers a workflow.

**Key Fields:**
- `workflow_id`: Parent workflow
- `trigger_type`: Type of trigger (form_submit, page_visit, etc.)
- `trigger_conditions`: JSONB with trigger conditions

#### `lead_workflow_actions`
Actions to perform in workflows.

**Key Fields:**
- `workflow_id`: Parent workflow
- `action_type`: Type of action (send_email, assign_lead, etc.)
- `action_config`: JSONB with action configuration
- `action_order`: Order of execution
- `delay_seconds`: Delay before executing

#### `lead_workflow_executions`
Track workflow execution history.

**Key Fields:**
- `workflow_id`, `lead_id`: What and who
- `status`: Execution status (running, completed, failed)
- `execution_data`: JSONB with execution details

### Campaigns

#### `lead_campaigns`
Marketing campaigns.

**Key Fields:**
- `name`, `description`: Campaign metadata
- `campaign_type`: Type (email, social_media, advertising, etc.)
- `status`: Campaign status (draft, active, paused, etc.)
- `start_date`, `end_date`: Campaign duration
- `budget`, `spent`: Financial tracking

#### `lead_campaign_associations`
Link leads to campaigns.

**Key Fields:**
- `lead_id`, `campaign_id`: Association
- `associated_at`: When lead was added to campaign

### Integrations & Customization

#### `lead_integrations`
Third-party integration settings.

**Key Fields:**
- `integration_type`: Type (crm, email_marketing, analytics, etc.)
- `integration_name`: Specific integration (Salesforce, HubSpot, etc.)
- `is_active`: Whether integration is enabled
- `credentials`: JSONB with encrypted credentials
- `last_sync_at`: Last synchronization time
- `sync_status`: Current sync status

#### `lead_custom_fields`
User-defined custom fields.

**Key Fields:**
- `field_name`: Internal field name
- `field_label`: Display label
- `field_type`: Type (text, number, date, boolean, select, etc.)
- `is_required`: Whether field is required
- `options`: JSONB array for select/multiselect options

## Relationships

```
users
  ├── companies (1:many)
  ├── lead_forms (1:many)
  ├── lead_stages (1:many)
  ├── lead_sources (1:many)
  ├── leads (1:many)
  ├── lead_scoring_rules (1:many)
  ├── lead_workflows (1:many)
  ├── lead_campaigns (1:many)
  ├── lead_integrations (1:many)
  └── lead_custom_fields (1:many)

companies
  ├── leads (1:many) - via company_id
  └── space_id -> spaces (many:1, optional)

leads
  ├── company_id -> companies (many:1)
  ├── lead_activities (1:many)
  ├── lead_workflow_executions (1:many)
  └── lead_campaign_associations (1:many)

lead_forms
  └── lead_form_fields (1:many)

lead_workflows
  ├── lead_workflow_triggers (1:many)
  ├── lead_workflow_actions (1:many)
  └── lead_workflow_executions (1:many)

lead_campaigns
  └── lead_campaign_associations (1:many)
```

## Indexes

All tables have appropriate indexes for:
- Foreign key lookups
- User/space filtering
- Status/type filtering
- Date-based queries
- Score-based sorting
- Full-text search (where applicable)

## Security

- **Row Level Security (RLS)** is enabled on all tables
- Users can only access their own data or data in their space
- Policies ensure data isolation between users
- Admins have broader access (handled in application code)

## Usage

1. Run `create_lead_generation_tables.sql` first to create all tables
2. Run `create_lead_generation_rls.sql` to enable RLS policies
3. Tables are ready to use immediately
4. Default stages can be created via application code when user first accesses the app

## Notes

- All tables use UUID primary keys for scalability
- `created_at` and `updated_at` timestamps are automatically maintained
- JSONB fields provide flexibility for custom data
- Foreign keys ensure referential integrity
- Triggers automatically update `updated_at` and `last_activity_at` fields

