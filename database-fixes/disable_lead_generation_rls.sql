-- Disable Row Level Security (RLS) on all Lead Generation tables
-- This removes RLS restrictions and allows all authenticated database operations

-- ============================================================================
-- DISABLE RLS ON ALL LEAD GENERATION TABLES
-- ============================================================================

ALTER TABLE companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_forms DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_fields DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stages DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflows DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflow_triggers DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_customization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflow_actions DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflow_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campaign_associations DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_integrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_fields DISABLE ROW LEVEL SECURITY;

-- Note: Disabling RLS means all database operations will be allowed
-- regardless of user context. Make sure your application-level
-- authorization is properly implemented.
