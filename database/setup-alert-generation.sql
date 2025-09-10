-- Alert Generation Logic
-- This script creates triggers and functions to automatically generate alerts

-- Step 1: Create function to check and create task due alerts
CREATE OR REPLACE FUNCTION check_task_due_alerts()
RETURNS VOID AS $$
DECLARE
  task_record RECORD;
  alert_id UUID;
BEGIN
  -- Check for tasks due within 24 hours
  FOR task_record IN
    SELECT 
      t.id,
      t.title,
      t.due_date,
      t.assigned_to,
      t.project_id,
      p.title as project_title,
      u.full_name as assigned_user_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON t.assigned_to = u.id
    WHERE t.due_date IS NOT NULL
      AND t.status NOT IN ('completed', 'cancelled')
      AND t.due_date BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        JOIN alert_types at ON a.alert_type_id = at.id
        WHERE a.user_id = t.assigned_to
          AND at.name = 'task_due_soon'
          AND a.data->>'task_id' = t.id::text
          AND a.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    SELECT create_alert(
      task_record.assigned_to,
      'task_due_soon',
      'Task Due Soon: ' || task_record.title,
      'Your task "' || task_record.title || '" in project "' || task_record.project_title || '" is due on ' || 
      to_char(task_record.due_date, 'Mon DD, YYYY at HH24:MI') || '.',
      jsonb_build_object(
        'task_id', task_record.id,
        'project_id', task_record.project_id,
        'due_date', task_record.due_date
      ),
      task_record.due_date + INTERVAL '1 day'
    ) INTO alert_id;
  END LOOP;

  -- Check for overdue tasks
  FOR task_record IN
    SELECT 
      t.id,
      t.title,
      t.due_date,
      t.assigned_to,
      t.project_id,
      p.title as project_title,
      u.full_name as assigned_user_name
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    JOIN users u ON t.assigned_to = u.id
    WHERE t.due_date IS NOT NULL
      AND t.status NOT IN ('completed', 'cancelled')
      AND t.due_date < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        JOIN alert_types at ON a.alert_type_id = at.id
        WHERE a.user_id = t.assigned_to
          AND at.name = 'task_overdue'
          AND a.data->>'task_id' = t.id::text
          AND a.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    SELECT create_alert(
      task_record.assigned_to,
      'task_overdue',
      'Task Overdue: ' || task_record.title,
      'Your task "' || task_record.title || '" in project "' || task_record.project_title || '" was due on ' || 
      to_char(task_record.due_date, 'Mon DD, YYYY at HH24:MI') || ' and is now overdue.',
      jsonb_build_object(
        'task_id', task_record.id,
        'project_id', task_record.project_id,
        'due_date', task_record.due_date
      ),
      NOW() + INTERVAL '7 days'
    ) INTO alert_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create function to check calendar event alerts
CREATE OR REPLACE FUNCTION check_calendar_event_alerts()
RETURNS VOID AS $$
DECLARE
  event_record RECORD;
  alert_id UUID;
BEGIN
  -- Check for calendar events within 24 hours
  FOR event_record IN
    SELECT 
      ce.id,
      ce.title,
      ce.start_time,
      ce.end_time,
      ce.company_id,
      c.name as company_name,
      u.id as user_id,
      u.full_name as user_name
    FROM company_events ce
    JOIN companies c ON ce.company_id = c.id
    JOIN users u ON u.company_id = ce.company_id
    WHERE ce.start_time BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
      AND NOT EXISTS (
        SELECT 1 FROM alerts a
        JOIN alert_types at ON a.alert_type_id = at.id
        WHERE a.user_id = u.id
          AND at.name = 'calendar_event_soon'
          AND a.data->>'event_id' = ce.id::text
          AND a.created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    SELECT create_alert(
      event_record.user_id,
      'calendar_event_soon',
      'Upcoming Event: ' || event_record.title,
      'You have an event "' || event_record.title || '" scheduled for ' || 
      to_char(event_record.start_time, 'Mon DD, YYYY at HH24:MI') || ' - ' ||
      to_char(event_record.end_time, 'HH24:MI') || '.',
      jsonb_build_object(
        'event_id', event_record.id,
        'company_id', event_record.company_id,
        'start_time', event_record.start_time,
        'end_time', event_record.end_time
      ),
      event_record.start_time + INTERVAL '1 day'
    ) INTO alert_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger for task assignment alerts
CREATE OR REPLACE FUNCTION trigger_task_assignment_alert()
RETURNS TRIGGER AS $$
DECLARE
  alert_id UUID;
  project_title TEXT;
  assigned_user_name TEXT;
BEGIN
  -- Only trigger if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL AND (OLD.assigned_to IS NULL OR OLD.assigned_to != NEW.assigned_to) THEN
    -- Get project title
    SELECT title INTO project_title
    FROM projects
    WHERE id = NEW.project_id;
    
    -- Get assigned user name
    SELECT full_name INTO assigned_user_name
    FROM users
    WHERE id = NEW.assigned_to;
    
    -- Create alert
    SELECT create_alert(
      NEW.assigned_to,
      'task_assigned',
      'New Task Assignment: ' || NEW.title,
      'You have been assigned a new task "' || NEW.title || '" in project "' || project_title || '".',
      jsonb_build_object(
        'task_id', NEW.id,
        'project_id', NEW.project_id,
        'assigned_by', NEW.created_by
      ),
      NEW.due_date
    ) INTO alert_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER task_assignment_alert_trigger
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_assignment_alert();

-- Step 4: Create trigger for project assignment alerts
CREATE OR REPLACE FUNCTION trigger_project_assignment_alert()
RETURNS TRIGGER AS $$
DECLARE
  alert_id UUID;
  manager_name TEXT;
BEGIN
  -- Only trigger if manager_id changed and is not null
  IF NEW.manager_id IS NOT NULL AND (OLD.manager_id IS NULL OR OLD.manager_id != NEW.manager_id) THEN
    -- Get manager name
    SELECT full_name INTO manager_name
    FROM users
    WHERE id = NEW.manager_id;
    
    -- Create alert
    SELECT create_alert(
      NEW.manager_id,
      'project_assigned',
      'New Project Assignment: ' || NEW.title,
      'You have been assigned as manager for project "' || NEW.title || '".',
      jsonb_build_object(
        'project_id', NEW.id,
        'assigned_by', NEW.created_by
      ),
      NEW.due_date
    ) INTO alert_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER project_assignment_alert_trigger
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_project_assignment_alert();

-- Step 5: Create trigger for form submission alerts
CREATE OR REPLACE FUNCTION trigger_form_submission_alert()
RETURNS TRIGGER AS $$
DECLARE
  alert_id UUID;
  form_title TEXT;
  company_name TEXT;
BEGIN
  -- Get form title
  SELECT f.title INTO form_title
  FROM forms f
  WHERE f.id = NEW.form_id;
  
  -- Get company name
  SELECT c.name INTO company_name
  FROM companies c
  JOIN forms f ON f.company_id = c.id
  WHERE f.id = NEW.form_id;
  
  -- Create alert for form creator/company admin
  SELECT create_alert(
    f.created_by,
    'form_submission',
    'New Form Submission: ' || form_title,
    'A new submission has been received for form "' || form_title || '" from company "' || company_name || '".',
    jsonb_build_object(
      'form_id', NEW.form_id,
      'submission_id', NEW.id,
      'company_id', f.company_id
    ),
    NOW() + INTERVAL '30 days'
  ) INTO alert_id
  FROM forms f
  WHERE f.id = NEW.form_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER form_submission_alert_trigger
  AFTER INSERT ON form_submissions
  FOR EACH ROW
  EXECUTE FUNCTION trigger_form_submission_alert();

-- Step 6: Create trigger for document upload alerts
CREATE OR REPLACE FUNCTION trigger_document_upload_alert()
RETURNS TRIGGER AS $$
DECLARE
  alert_id UUID;
  company_name TEXT;
BEGIN
  -- Get company name
  SELECT c.name INTO company_name
  FROM companies c
  WHERE c.id = NEW.company_id;
  
  -- Create alert for company users (except uploader)
  FOR alert_id IN
    SELECT create_alert(
      u.id,
      'document_uploaded',
      'New Document Uploaded: ' || NEW.name,
      'A new document "' || NEW.name || '" has been uploaded to company "' || company_name || '".',
      jsonb_build_object(
        'document_id', NEW.id,
        'company_id', NEW.company_id,
        'uploaded_by', NEW.uploaded_by
      ),
      NOW() + INTERVAL '7 days'
    )
    FROM users u
    WHERE u.company_id = NEW.company_id
      AND u.id != NEW.uploaded_by
      AND u.is_active = true
  LOOP
    -- Loop continues
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_upload_alert_trigger
  AFTER INSERT ON documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_document_upload_alert();

-- Step 7: Create function to run all alert checks
CREATE OR REPLACE FUNCTION run_all_alert_checks()
RETURNS TABLE(
  check_name TEXT,
  alerts_created INTEGER
) AS $$
DECLARE
  task_alerts INTEGER := 0;
  calendar_alerts INTEGER := 0;
BEGIN
  -- Run task due checks
  PERFORM check_task_due_alerts();
  GET DIAGNOSTICS task_alerts = ROW_COUNT;
  
  -- Run calendar event checks
  PERFORM check_calendar_event_alerts();
  GET DIAGNOSTICS calendar_alerts = ROW_COUNT;
  
  RETURN QUERY VALUES 
    ('task_due_checks', task_alerts),
    ('calendar_event_checks', calendar_alerts);
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create scheduled job function (if pg_cron is available)
-- This would typically be set up as a cron job
CREATE OR REPLACE FUNCTION schedule_alert_checks()
RETURNS VOID AS $$
BEGIN
  -- This function would be called by a cron job every hour
  -- For now, we'll create a manual trigger
  PERFORM run_all_alert_checks();
END;
$$ LANGUAGE plpgsql;

-- Step 9: Create function to get alert statistics
CREATE OR REPLACE FUNCTION get_alert_stats(p_user_id UUID)
RETURNS TABLE(
  total_alerts INTEGER,
  unread_alerts INTEGER,
  urgent_alerts INTEGER,
  today_alerts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_alerts,
    COUNT(CASE WHEN a.is_read = false AND a.is_dismissed = false THEN 1 END)::INTEGER as unread_alerts,
    COUNT(CASE WHEN a.is_read = false AND a.is_dismissed = false AND at.priority >= 3 THEN 1 END)::INTEGER as urgent_alerts,
    COUNT(CASE WHEN a.created_at >= CURRENT_DATE THEN 1 END)::INTEGER as today_alerts
  FROM alerts a
  JOIN alert_types at ON a.alert_type_id = at.id
  WHERE a.user_id = p_user_id
    AND (a.expires_at IS NULL OR a.expires_at > NOW());
END;
$$ LANGUAGE plpgsql;

-- Step 10: Final status
SELECT '=== ALERT GENERATION LOGIC COMPLETE ===' as status;
SELECT 'Triggers created for automatic alert generation.' as message1;
SELECT 'Functions created for scheduled alert checks.' as message2;
SELECT 'Alert statistics function created.' as message3;
SELECT 'Ready to implement frontend alert components.' as message4;
