-- Row Level Security (RLS) Policies for Lead Generation Tables
-- Run this after creating the tables to enable RLS

-- Create a helper function to get user's space/company ID
-- This function handles both space_id and company_id columns
CREATE OR REPLACE FUNCTION get_user_space_id(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  result UUID;
  has_space_id BOOLEAN;
  has_company_id BOOLEAN;
BEGIN
  -- Check which columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'space_id'
  ) INTO has_space_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'company_id'
  ) INTO has_company_id;
  
  -- Get the value from the appropriate column(s)
  IF has_space_id AND has_company_id THEN
    -- Both exist, prefer space_id
    SELECT COALESCE(space_id, company_id) INTO result FROM users WHERE id = user_uuid;
  ELSIF has_space_id THEN
    -- Only space_id exists
    SELECT space_id INTO result FROM users WHERE id = user_uuid;
  ELSIF has_company_id THEN
    -- Only company_id exists
    SELECT company_id INTO result FROM users WHERE id = user_uuid;
  ELSE
    -- Neither exists
    RETURN NULL;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_form_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_campaign_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_custom_fields ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: COMPANIES
-- ============================================================================

-- Users can view companies they created or companies in their space
CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create companies
CREATE POLICY "Users can create companies"
  ON companies FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own companies
CREATE POLICY "Users can update their companies"
  ON companies FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own companies
CREATE POLICY "Users can delete their companies"
  ON companies FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD FORMS
-- ============================================================================

-- Users can view forms they created or forms in their space
CREATE POLICY "Users can view their own forms"
  ON lead_forms FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create forms
CREATE POLICY "Users can create forms"
  ON lead_forms FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own forms
CREATE POLICY "Users can update their own forms"
  ON lead_forms FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own forms
CREATE POLICY "Users can delete their own forms"
  ON lead_forms FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD FORM FIELDS
-- ============================================================================

-- Users can view fields for forms they can access
CREATE POLICY "Users can view form fields"
  ON lead_form_fields FOR SELECT
  USING (
    form_id IN (
      SELECT id FROM lead_forms WHERE
        user_id = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

-- Users can create fields for their forms
CREATE POLICY "Users can create form fields"
  ON lead_form_fields FOR INSERT
  WITH CHECK (
    form_id IN (SELECT id FROM lead_forms WHERE user_id = auth.uid())
  );

-- Users can update fields for their forms
CREATE POLICY "Users can update form fields"
  ON lead_form_fields FOR UPDATE
  USING (
    form_id IN (SELECT id FROM lead_forms WHERE user_id = auth.uid())
  )
  WITH CHECK (
    form_id IN (SELECT id FROM lead_forms WHERE user_id = auth.uid())
  );

-- Users can delete fields for their forms
CREATE POLICY "Users can delete form fields"
  ON lead_form_fields FOR DELETE
  USING (
    form_id IN (SELECT id FROM lead_forms WHERE user_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES: LEAD STAGES
-- ============================================================================

-- Users can view their own stages or stages in their space
CREATE POLICY "Users can view their stages"
  ON lead_stages FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create stages
CREATE POLICY "Users can create stages"
  ON lead_stages FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own stages
CREATE POLICY "Users can update their stages"
  ON lead_stages FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own stages
CREATE POLICY "Users can delete their stages"
  ON lead_stages FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD SOURCES
-- ============================================================================

-- Users can view their own sources or sources in their space
CREATE POLICY "Users can view their sources"
  ON lead_sources FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create sources
CREATE POLICY "Users can create sources"
  ON lead_sources FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sources
CREATE POLICY "Users can update their sources"
  ON lead_sources FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own sources
CREATE POLICY "Users can delete their sources"
  ON lead_sources FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEADS
-- ============================================================================

-- Users can view leads they own, are assigned to, or leads in their space
CREATE POLICY "Users can view relevant leads"
  ON leads FOR SELECT
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create leads
CREATE POLICY "Users can create leads"
  ON leads FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update leads they own or are assigned to
CREATE POLICY "Users can update relevant leads"
  ON leads FOR UPDATE
  USING (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    assigned_to = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can delete leads they own
CREATE POLICY "Users can delete their leads"
  ON leads FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD ACTIVITIES
-- ============================================================================

-- Users can view activities for leads they can access
CREATE POLICY "Users can view lead activities"
  ON lead_activities FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM leads WHERE
        user_id = auth.uid() OR
        assigned_to = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

-- Users can create activities for leads they can access
CREATE POLICY "Users can create lead activities"
  ON lead_activities FOR INSERT
  WITH CHECK (
    lead_id IN (
      SELECT id FROM leads WHERE
        user_id = auth.uid() OR
        assigned_to = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

-- Users can update their own activities
CREATE POLICY "Users can update their activities"
  ON lead_activities FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own activities
CREATE POLICY "Users can delete their activities"
  ON lead_activities FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD SCORING RULES
-- ============================================================================

-- Users can view their own scoring rules or rules in their space
CREATE POLICY "Users can view their scoring rules"
  ON lead_scoring_rules FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create scoring rules
CREATE POLICY "Users can create scoring rules"
  ON lead_scoring_rules FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own scoring rules
CREATE POLICY "Users can update their scoring rules"
  ON lead_scoring_rules FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own scoring rules
CREATE POLICY "Users can delete their scoring rules"
  ON lead_scoring_rules FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD WORKFLOWS
-- ============================================================================

-- Users can view their own workflows or workflows in their space
CREATE POLICY "Users can view their workflows"
  ON lead_workflows FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create workflows
CREATE POLICY "Users can create workflows"
  ON lead_workflows FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own workflows
CREATE POLICY "Users can update their workflows"
  ON lead_workflows FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own workflows
CREATE POLICY "Users can delete their workflows"
  ON lead_workflows FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD WORKFLOW TRIGGERS & ACTIONS
-- ============================================================================

-- Users can view triggers/actions for workflows they can access
CREATE POLICY "Users can view workflow triggers"
  ON lead_workflow_triggers FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM lead_workflows WHERE
        user_id = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

CREATE POLICY "Users can view workflow actions"
  ON lead_workflow_actions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM lead_workflows WHERE
        user_id = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

-- Users can manage triggers/actions for their workflows
CREATE POLICY "Users can manage workflow triggers"
  ON lead_workflow_triggers FOR ALL
  USING (
    workflow_id IN (SELECT id FROM lead_workflows WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workflow_id IN (SELECT id FROM lead_workflows WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage workflow actions"
  ON lead_workflow_actions FOR ALL
  USING (
    workflow_id IN (SELECT id FROM lead_workflows WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workflow_id IN (SELECT id FROM lead_workflows WHERE user_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES: LEAD WORKFLOW EXECUTIONS
-- ============================================================================

-- Users can view executions for workflows they can access
CREATE POLICY "Users can view workflow executions"
  ON lead_workflow_executions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM lead_workflows WHERE
        user_id = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

-- System can create executions (handled by application)
CREATE POLICY "System can create workflow executions"
  ON lead_workflow_executions FOR INSERT
  WITH CHECK (true);

-- Users can update executions for their workflows
CREATE POLICY "Users can update workflow executions"
  ON lead_workflow_executions FOR UPDATE
  USING (
    workflow_id IN (SELECT id FROM lead_workflows WHERE user_id = auth.uid())
  )
  WITH CHECK (
    workflow_id IN (SELECT id FROM lead_workflows WHERE user_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES: LEAD CAMPAIGNS
-- ============================================================================

-- Users can view their own campaigns or campaigns in their space
CREATE POLICY "Users can view their campaigns"
  ON lead_campaigns FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create campaigns
CREATE POLICY "Users can create campaigns"
  ON lead_campaigns FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own campaigns
CREATE POLICY "Users can update their campaigns"
  ON lead_campaigns FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own campaigns
CREATE POLICY "Users can delete their campaigns"
  ON lead_campaigns FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD CAMPAIGN ASSOCIATIONS
-- ============================================================================

-- Users can view associations for campaigns they can access
CREATE POLICY "Users can view campaign associations"
  ON lead_campaign_associations FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM lead_campaigns WHERE
        user_id = auth.uid() OR
        (space_id IS NOT NULL AND space_id IN (
          get_user_space_id(auth.uid())
        ))
    )
  );

-- Users can create associations for their campaigns
CREATE POLICY "Users can create campaign associations"
  ON lead_campaign_associations FOR INSERT
  WITH CHECK (
    campaign_id IN (SELECT id FROM lead_campaigns WHERE user_id = auth.uid())
  );

-- Users can delete associations for their campaigns
CREATE POLICY "Users can delete campaign associations"
  ON lead_campaign_associations FOR DELETE
  USING (
    campaign_id IN (SELECT id FROM lead_campaigns WHERE user_id = auth.uid())
  );

-- ============================================================================
-- RLS POLICIES: LEAD INTEGRATIONS
-- ============================================================================

-- Users can view their own integrations or integrations in their space
CREATE POLICY "Users can view their integrations"
  ON lead_integrations FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create integrations
CREATE POLICY "Users can create integrations"
  ON lead_integrations FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own integrations
CREATE POLICY "Users can update their integrations"
  ON lead_integrations FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own integrations
CREATE POLICY "Users can delete their integrations"
  ON lead_integrations FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================================
-- RLS POLICIES: LEAD CUSTOM FIELDS
-- ============================================================================

-- Users can view their own custom fields or fields in their space
CREATE POLICY "Users can view their custom fields"
  ON lead_custom_fields FOR SELECT
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- Users can create custom fields
CREATE POLICY "Users can create custom fields"
  ON lead_custom_fields FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can update their own custom fields
CREATE POLICY "Users can update their custom fields"
  ON lead_custom_fields FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own custom fields
CREATE POLICY "Users can delete their custom fields"
  ON lead_custom_fields FOR DELETE
  USING (user_id = auth.uid());

