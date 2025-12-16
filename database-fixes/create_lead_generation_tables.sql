-- Lead Generation App Database Schema
-- This script creates all necessary tables for the Lead Generation application
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- LEAD FORMS & FORM FIELDS
-- ============================================================================

-- Determine which table exists: spaces or companies
DO $$
DECLARE
  space_table_name TEXT;
BEGIN
  -- Check if spaces table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
    space_table_name := 'spaces';
  -- Check if companies table exists
  ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
    space_table_name := 'companies';
  ELSE
    -- Neither exists, we'll create without foreign key constraint
    space_table_name := NULL;
  END IF;
  
  -- Store the table name in a temporary variable (we'll use it in the table creation)
  PERFORM set_config('app.space_table_name', COALESCE(space_table_name, ''), false);
END $$;

-- Lead Forms: Customizable forms for capturing leads
CREATE TABLE IF NOT EXISTS lead_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- Optional: can be space-specific or global (FK added below)
  name VARCHAR(255) NOT NULL,
  description TEXT,
  title VARCHAR(255) NOT NULL,
  thank_you_message TEXT,
  redirect_url TEXT,
  ai_personalization_enabled BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  embed_code TEXT, -- Generated embed code
  form_settings JSONB DEFAULT '{}'::jsonb, -- Additional settings (theme, styling, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Form Fields: Fields within each form
CREATE TABLE IF NOT EXISTS lead_form_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES lead_forms(id) ON DELETE CASCADE,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'email', 'phone', 'select', 'textarea', 'number', 'checkbox', 'date', 'url')),
  label VARCHAR(255) NOT NULL,
  placeholder TEXT,
  is_required BOOLEAN DEFAULT false,
  field_order INTEGER NOT NULL DEFAULT 0,
  options JSONB DEFAULT '[]'::jsonb, -- For select/checkbox fields
  validation_rules JSONB DEFAULT '{}'::jsonb, -- Min/max length, regex patterns, etc.
  field_settings JSONB DEFAULT '{}'::jsonb, -- Additional field-specific settings
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEAD STAGES (PIPELINE)
-- ============================================================================

-- Lead Stages: Customizable pipeline stages
CREATE TABLE IF NOT EXISTS lead_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- Optional: can be space-specific (FK added below)
  name VARCHAR(100) NOT NULL,
  description TEXT,
  stage_order INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(7), -- Hex color code
  is_default BOOLEAN DEFAULT false, -- Default stages (New, Contacted, Qualified, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, space_id, name) -- Ensure unique stage names per user/space
);

-- ============================================================================
-- COMPANIES (LEAD COMPANIES - SEPARATE FROM SPACES)
-- ============================================================================

-- Companies: Companies that leads belong to (separate from spaces/client workspaces)
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Owner/creator
  space_id UUID, -- Optional: can be tied to a space later (FK added below)
  name VARCHAR(255) NOT NULL,
  website VARCHAR(255),
  industry VARCHAR(100),
  company_size VARCHAR(50), -- e.g., '1-10', '11-50', '51-200', etc.
  phone VARCHAR(50),
  address TEXT,
  description TEXT,
  tags TEXT[], -- Array of tags
  company_data JSONB DEFAULT '{}'::jsonb, -- Additional company information from enrichment
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEAD SOURCES
-- ============================================================================

-- Lead Sources: Track where leads come from
CREATE TABLE IF NOT EXISTS lead_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- FK added below (for space-specific sources)
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('website', 'linkedin', 'email', 'referral', 'social_media', 'advertising', 'event', 'other')),
  description TEXT,
  utm_source VARCHAR(255), -- For tracking UTM parameters
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEADS (MAIN TABLE)
-- ============================================================================

-- Leads: The main lead records
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Owner/creator
  space_id UUID, -- Optional: can be space-specific (FK added below)
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL, -- Company the lead belongs to
  assigned_to UUID REFERENCES users(id) ON DELETE SET NULL, -- Assigned team member
  
  -- Basic Information
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(100),
  -- Note: company_name, website, industry, company_size moved to companies table
  
  -- Lead Status
  stage_id UUID REFERENCES lead_stages(id) ON DELETE SET NULL,
  source_id UUID REFERENCES lead_sources(id) ON DELETE SET NULL,
  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100), -- Lead score 0-100
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost', 'nurturing')),
  
  -- Lead Data
  form_id UUID REFERENCES lead_forms(id) ON DELETE SET NULL, -- Which form captured this lead
  form_submission_data JSONB DEFAULT '{}'::jsonb, -- Original form submission data
  custom_fields JSONB DEFAULT '{}'::jsonb, -- Custom field values
  notes TEXT,
  tags TEXT[], -- Array of tags
  
  -- Qualification Data (BANT)
  budget DECIMAL(12, 2),
  authority BOOLEAN, -- Has decision-making authority
  need TEXT, -- Identified need
  timeline VARCHAR(100), -- e.g., 'immediate', '1-3 months', '3-6 months', etc.
  
  -- Enrichment Data
  enriched_data JSONB DEFAULT '{}'::jsonb, -- Data from enrichment services
  social_profiles JSONB DEFAULT '{}'::jsonb, -- LinkedIn, Twitter, etc.
  -- Note: company_data moved to companies table
  
  -- Conversion Tracking
  converted_to_customer BOOLEAN DEFAULT false,
  customer_id UUID, -- Reference to customer record (when converted)
  conversion_date TIMESTAMP WITH TIME ZONE,
  conversion_value DECIMAL(12, 2), -- Revenue/value of conversion
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional flexible data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- LEAD ACTIVITIES
-- ============================================================================

-- Lead Activities: Track all interactions with leads
CREATE TABLE IF NOT EXISTS lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- Who performed the activity
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN (
    'email_sent', 'email_opened', 'email_clicked', 'email_replied',
    'call_made', 'call_received', 'meeting_scheduled', 'meeting_completed',
    'note_added', 'stage_changed', 'score_changed', 'assigned', 'unassigned',
    'form_submitted', 'page_visited', 'link_clicked', 'document_viewed',
    'workflow_triggered', 'campaign_added', 'tag_added', 'tag_removed'
  )),
  description TEXT NOT NULL,
  activity_data JSONB DEFAULT '{}'::jsonb, -- Additional activity-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- LEAD SCORING RULES
-- ============================================================================

-- Lead Scoring Rules: AI-powered scoring rules
CREATE TABLE IF NOT EXISTS lead_scoring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- FK added below
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  
  -- Rule Criteria
  criteria_type VARCHAR(50) NOT NULL CHECK (criteria_type IN (
    'email_domain', 'company_size', 'industry', 'job_title', 'page_visited',
    'form_field', 'source', 'behavior', 'custom_field', 'enrichment_data'
  )),
  condition VARCHAR(50) NOT NULL CHECK (condition IN ('equals', 'contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'in', 'not_in')),
  value TEXT NOT NULL, -- The value to compare against
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= -100 AND points <= 100), -- Points to add/subtract
  
  -- Rule Settings
  rule_settings JSONB DEFAULT '{}'::jsonb,
  rule_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUTOMATION WORKFLOWS
-- ============================================================================

-- Lead Workflows: Automation workflows
CREATE TABLE IF NOT EXISTS lead_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- FK added below
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  workflow_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Workflow Triggers: What triggers a workflow
CREATE TABLE IF NOT EXISTS lead_workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES lead_workflows(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL CHECK (trigger_type IN (
    'form_submit', 'page_visit', 'email_open', 'email_click', 'link_click',
    'score_threshold', 'stage_change', 'time_based', 'custom_event'
  )),
  trigger_conditions JSONB NOT NULL DEFAULT '{}'::jsonb, -- Conditions for the trigger
  trigger_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Workflow Actions: Actions to perform in a workflow
CREATE TABLE IF NOT EXISTS lead_workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES lead_workflows(id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'send_email', 'assign_lead', 'change_stage', 'add_tag', 'remove_tag',
    'update_score', 'create_task', 'send_notification', 'webhook', 'wait'
  )),
  action_config JSONB NOT NULL DEFAULT '{}'::jsonb, -- Configuration for the action
  action_order INTEGER NOT NULL DEFAULT 0,
  delay_seconds INTEGER DEFAULT 0, -- Delay before executing this action
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Workflow Executions: Track workflow executions
CREATE TABLE IF NOT EXISTS lead_workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES lead_workflows(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  trigger_id UUID REFERENCES lead_workflow_triggers(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  execution_data JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT
);

-- ============================================================================
-- CAMPAIGNS
-- ============================================================================

-- Lead Campaigns: Marketing campaigns
CREATE TABLE IF NOT EXISTS lead_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- FK added below
  name VARCHAR(255) NOT NULL,
  description TEXT,
  campaign_type VARCHAR(50) NOT NULL CHECK (campaign_type IN (
    'email', 'social_media', 'advertising', 'content', 'event', 'referral', 'other'
  )),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'archived')),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  budget DECIMAL(12, 2),
  spent DECIMAL(12, 2) DEFAULT 0,
  campaign_settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lead Campaign Associations: Link leads to campaigns
CREATE TABLE IF NOT EXISTS lead_campaign_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES lead_campaigns(id) ON DELETE CASCADE,
  associated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, campaign_id)
);

-- ============================================================================
-- INTEGRATIONS
-- ============================================================================

-- Lead Integrations: Integration settings
CREATE TABLE IF NOT EXISTS lead_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- FK added below
  integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN (
    'crm', 'email_marketing', 'analytics', 'advertising', 'enrichment', 'other'
  )),
  integration_name VARCHAR(100) NOT NULL, -- e.g., 'Salesforce', 'HubSpot', 'Mailchimp'
  is_active BOOLEAN DEFAULT false,
  credentials JSONB DEFAULT '{}'::jsonb, -- Encrypted credentials
  integration_settings JSONB DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_status VARCHAR(50) DEFAULT 'idle' CHECK (sync_status IN ('idle', 'syncing', 'success', 'error')),
  sync_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- CUSTOM FIELDS
-- ============================================================================

-- Lead Custom Fields: User-defined custom fields
CREATE TABLE IF NOT EXISTS lead_custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  space_id UUID, -- FK added below
  field_name VARCHAR(100) NOT NULL,
  field_type VARCHAR(50) NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'boolean', 'select', 'multiselect')),
  field_label VARCHAR(255) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  default_value TEXT,
  options JSONB DEFAULT '[]'::jsonb, -- For select/multiselect fields
  field_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, space_id, field_name)
);

-- ============================================================================
-- ADD FOREIGN KEY CONSTRAINTS FOR SPACE_ID
-- ============================================================================

-- Add foreign key constraints conditionally based on which table exists
DO $$
DECLARE
  space_table_name TEXT;
BEGIN
  -- Check if spaces table exists (client workspaces)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'spaces') THEN
    space_table_name := 'spaces';
  -- Check if old companies table exists (legacy - was renamed to spaces)
  -- We check for a column that only exists in the old companies table (client workspaces)
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.tables t
    JOIN information_schema.columns c ON c.table_name = t.table_name
    WHERE t.table_name = 'companies' 
    AND c.column_name = 'is_partner'
  ) THEN
    -- This is the old companies table (client workspaces), use it
    space_table_name := 'companies';
  ELSE
    -- Neither exists, skip FK constraints
    space_table_name := NULL;
  END IF;
  
  -- Add foreign key constraint for companies.space_id (to spaces/client workspaces table)
  -- Note: This is for the NEW companies table (lead companies) referencing spaces
  -- Only if we found a valid space/workspace table
  IF space_table_name IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'companies_space_id_fkey'
    ) THEN
      EXECUTE format('ALTER TABLE companies ADD CONSTRAINT companies_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE SET NULL', space_table_name);
    END IF;
  END IF;
  
  -- Add foreign key constraints for space_id columns
  -- Only add if constraint doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_forms_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_forms ADD CONSTRAINT lead_forms_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_stages_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_stages ADD CONSTRAINT lead_stages_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_sources_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_sources ADD CONSTRAINT lead_sources_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'leads_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE leads ADD CONSTRAINT leads_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_scoring_rules_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_scoring_rules ADD CONSTRAINT lead_scoring_rules_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_workflows_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_workflows ADD CONSTRAINT lead_workflows_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_campaigns_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_campaigns ADD CONSTRAINT lead_campaigns_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_integrations_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_integrations ADD CONSTRAINT lead_integrations_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'lead_custom_fields_space_id_fkey'
  ) THEN
    EXECUTE format('ALTER TABLE lead_custom_fields ADD CONSTRAINT lead_custom_fields_space_id_fkey FOREIGN KEY (space_id) REFERENCES %I(id) ON DELETE CASCADE', space_table_name);
  END IF;
END $$;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Lead Forms Indexes
CREATE INDEX IF NOT EXISTS idx_lead_forms_user_id ON lead_forms(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_space_id ON lead_forms(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_forms_is_active ON lead_forms(is_active);

-- Lead Form Fields Indexes
CREATE INDEX IF NOT EXISTS idx_lead_form_fields_form_id ON lead_form_fields(form_id);
CREATE INDEX IF NOT EXISTS idx_lead_form_fields_order ON lead_form_fields(form_id, field_order);

-- Lead Stages Indexes
CREATE INDEX IF NOT EXISTS idx_lead_stages_user_id ON lead_stages(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_stages_space_id ON lead_stages(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_stages_order ON lead_stages(user_id, space_id, stage_order);

-- Companies Indexes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_space_id ON companies(space_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active) WHERE is_active = true;

-- Lead Sources Indexes
CREATE INDEX IF NOT EXISTS idx_lead_sources_user_id ON lead_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_sources_space_id ON lead_sources(space_id);

-- Companies Indexes
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);
CREATE INDEX IF NOT EXISTS idx_companies_space_id ON companies(space_id);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active) WHERE is_active = true;

-- Leads Indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_space_id ON leads(space_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_id ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_stage_id ON leads(stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_updated_at ON leads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_form_id ON leads(form_id);
CREATE INDEX IF NOT EXISTS idx_leads_converted ON leads(converted_to_customer) WHERE converted_to_customer = true;

-- Lead Activities Indexes
CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type ON lead_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities(created_at DESC);

-- Lead Scoring Rules Indexes
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_user_id ON lead_scoring_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_space_id ON lead_scoring_rules(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_active ON lead_scoring_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_lead_scoring_rules_order ON lead_scoring_rules(user_id, space_id, rule_order);

-- Lead Workflows Indexes
CREATE INDEX IF NOT EXISTS idx_lead_workflows_user_id ON lead_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_workflows_space_id ON lead_workflows(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_workflows_active ON lead_workflows(is_active) WHERE is_active = true;

-- Lead Workflow Triggers Indexes
CREATE INDEX IF NOT EXISTS idx_lead_workflow_triggers_workflow_id ON lead_workflow_triggers(workflow_id);

-- Lead Workflow Actions Indexes
CREATE INDEX IF NOT EXISTS idx_lead_workflow_actions_workflow_id ON lead_workflow_actions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_lead_workflow_actions_order ON lead_workflow_actions(workflow_id, action_order);

-- Lead Workflow Executions Indexes
CREATE INDEX IF NOT EXISTS idx_lead_workflow_executions_workflow_id ON lead_workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_lead_workflow_executions_lead_id ON lead_workflow_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_workflow_executions_status ON lead_workflow_executions(status);

-- Lead Campaigns Indexes
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_user_id ON lead_campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_space_id ON lead_campaigns(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_campaigns_status ON lead_campaigns(status);

-- Lead Campaign Associations Indexes
CREATE INDEX IF NOT EXISTS idx_lead_campaign_associations_lead_id ON lead_campaign_associations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_campaign_associations_campaign_id ON lead_campaign_associations(campaign_id);

-- Lead Integrations Indexes
CREATE INDEX IF NOT EXISTS idx_lead_integrations_user_id ON lead_integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_integrations_space_id ON lead_integrations(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_integrations_type ON lead_integrations(integration_type);
CREATE INDEX IF NOT EXISTS idx_lead_integrations_active ON lead_integrations(is_active) WHERE is_active = true;

-- Lead Custom Fields Indexes
CREATE INDEX IF NOT EXISTS idx_lead_custom_fields_user_id ON lead_custom_fields(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_fields_space_id ON lead_custom_fields(space_id);
CREATE INDEX IF NOT EXISTS idx_lead_custom_fields_active ON lead_custom_fields(is_active) WHERE is_active = true;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at (drop and recreate to avoid conflicts)
DROP TRIGGER IF EXISTS update_lead_forms_updated_at ON lead_forms;
CREATE TRIGGER update_lead_forms_updated_at BEFORE UPDATE ON lead_forms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_form_fields_updated_at ON lead_form_fields;
CREATE TRIGGER update_lead_form_fields_updated_at BEFORE UPDATE ON lead_form_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_stages_updated_at ON lead_stages;
CREATE TRIGGER update_lead_stages_updated_at BEFORE UPDATE ON lead_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_sources_updated_at ON lead_sources;
CREATE TRIGGER update_lead_sources_updated_at BEFORE UPDATE ON lead_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_scoring_rules_updated_at ON lead_scoring_rules;
CREATE TRIGGER update_lead_scoring_rules_updated_at BEFORE UPDATE ON lead_scoring_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_workflows_updated_at ON lead_workflows;
CREATE TRIGGER update_lead_workflows_updated_at BEFORE UPDATE ON lead_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_campaigns_updated_at ON lead_campaigns;
CREATE TRIGGER update_lead_campaigns_updated_at BEFORE UPDATE ON lead_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_integrations_updated_at ON lead_integrations;
CREATE TRIGGER update_lead_integrations_updated_at BEFORE UPDATE ON lead_integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lead_custom_fields_updated_at ON lead_custom_fields;
CREATE TRIGGER update_lead_custom_fields_updated_at BEFORE UPDATE ON lead_custom_fields
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update lead's last_activity_at when activity is created
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET last_activity_at = NOW()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lead_activity_timestamp ON lead_activities;
CREATE TRIGGER update_lead_activity_timestamp
  AFTER INSERT ON lead_activities
  FOR EACH ROW EXECUTE FUNCTION update_lead_last_activity();

-- ============================================================================
-- DEFAULT DATA
-- ============================================================================

-- Insert default lead stages for new users (will be created per user when they first access the app)
-- This is handled in the application code, but we can create a function to help

COMMENT ON TABLE companies IS 'Companies that leads belong to (separate from spaces/client workspaces)';
COMMENT ON TABLE lead_forms IS 'Customizable lead capture forms';
COMMENT ON TABLE lead_form_fields IS 'Fields within lead capture forms';
COMMENT ON TABLE lead_stages IS 'Customizable pipeline stages for leads';
COMMENT ON TABLE lead_sources IS 'Sources where leads originate from';
COMMENT ON TABLE leads IS 'Main lead records with all lead information';
COMMENT ON TABLE lead_activities IS 'Activity log for all lead interactions';
COMMENT ON TABLE lead_scoring_rules IS 'AI-powered lead scoring rules';
COMMENT ON TABLE lead_workflows IS 'Automation workflows for lead nurturing';
COMMENT ON TABLE lead_workflow_triggers IS 'Triggers that start workflows';
COMMENT ON TABLE lead_workflow_actions IS 'Actions performed in workflows';
COMMENT ON TABLE lead_workflow_executions IS 'Execution history for workflows';
COMMENT ON TABLE lead_campaigns IS 'Marketing campaigns';
COMMENT ON TABLE lead_campaign_associations IS 'Association between leads and campaigns';
COMMENT ON TABLE lead_integrations IS 'Third-party integration settings';
COMMENT ON TABLE lead_custom_fields IS 'User-defined custom fields for leads';

