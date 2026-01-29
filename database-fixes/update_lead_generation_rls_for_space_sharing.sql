-- Update RLS policies for Lead Generation app to allow space-based sharing
-- This allows all users in the same space to view and update shared lead data

-- ============================================================================
-- UPDATE POLICIES: LEAD FORMS
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own forms" ON lead_forms;

-- Create new policy that allows space-based updates
CREATE POLICY "Users can update forms in their space"
  ON lead_forms FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- ============================================================================
-- UPDATE POLICIES: LEAD CAMPAIGNS
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their campaigns" ON lead_campaigns;

-- Create new policy that allows space-based updates
CREATE POLICY "Users can update campaigns in their space"
  ON lead_campaigns FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- ============================================================================
-- UPDATE POLICIES: LEAD WORKFLOWS
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their workflows" ON lead_workflows;

-- Create new policy that allows space-based updates
CREATE POLICY "Users can update workflows in their space"
  ON lead_workflows FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- ============================================================================
-- UPDATE POLICIES: LEAD SOURCES
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their sources" ON lead_sources;

-- Create new policy that allows space-based updates
CREATE POLICY "Users can update sources in their space"
  ON lead_sources FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- ============================================================================
-- UPDATE POLICIES: LEAD STAGES
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their stages" ON lead_stages;

-- Create new policy that allows space-based updates
CREATE POLICY "Users can update stages in their space"
  ON lead_stages FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- ============================================================================
-- UPDATE POLICIES: LEAD SCORING RULES
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their scoring rules" ON lead_scoring_rules;

-- Create new policy that allows space-based updates
CREATE POLICY "Users can update scoring rules in their space"
  ON lead_scoring_rules FOR UPDATE
  USING (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  )
  WITH CHECK (
    user_id = auth.uid() OR
    (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
  );

-- ============================================================================
-- DELETE POLICIES: Allow space-based deletion (optional - comment out if you want to keep creator-only deletion)
-- ============================================================================

-- Uncomment these if you want to allow space-based deletion as well

-- DROP POLICY IF EXISTS "Users can delete their own forms" ON lead_forms;
-- CREATE POLICY "Users can delete forms in their space"
--   ON lead_forms FOR DELETE
--   USING (
--     user_id = auth.uid() OR
--     (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
--   );

-- DROP POLICY IF EXISTS "Users can delete their campaigns" ON lead_campaigns;
-- CREATE POLICY "Users can delete campaigns in their space"
--   ON lead_campaigns FOR DELETE
--   USING (
--     user_id = auth.uid() OR
--     (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
--   );

-- DROP POLICY IF EXISTS "Users can delete their workflows" ON lead_workflows;
-- CREATE POLICY "Users can delete workflows in their space"
--   ON lead_workflows FOR DELETE
--   USING (
--     user_id = auth.uid() OR
--     (space_id IS NOT NULL AND space_id = get_user_space_id(auth.uid()))
--   );
