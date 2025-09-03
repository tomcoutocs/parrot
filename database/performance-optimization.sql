-- Database Performance Optimization Script
-- This script adds indexes and optimizations to improve query performance for multiple concurrent users

-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_full_name ON users(full_name);

-- Projects table indexes
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_manager_id ON projects(manager_id);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Tasks table indexes
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_position ON tasks(position);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);

-- Companies table indexes
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_companies_is_active ON companies(is_active);
CREATE INDEX IF NOT EXISTS idx_companies_is_partner ON companies(is_partner);

-- Forms table indexes
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);
CREATE INDEX IF NOT EXISTS idx_forms_created_by ON forms(created_by);
CREATE INDEX IF NOT EXISTS idx_forms_created_at ON forms(created_at);

-- Form submissions table indexes
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_user_id ON form_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON form_submissions(submitted_at);

-- Services table indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_is_active ON services(is_active);
CREATE INDEX IF NOT EXISTS idx_services_name ON services(name);

-- Company services table indexes
CREATE INDEX IF NOT EXISTS idx_company_services_company_id ON company_services(company_id);
CREATE INDEX IF NOT EXISTS idx_company_services_service_id ON company_services(service_id);
CREATE INDEX IF NOT EXISTS idx_company_services_is_active ON company_services(is_active);

-- Project managers table indexes
CREATE INDEX IF NOT EXISTS idx_project_managers_project_id ON project_managers(project_id);
CREATE INDEX IF NOT EXISTS idx_project_managers_user_id ON project_managers(user_id);

-- Project members table indexes
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Task comments table indexes
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at);

-- Task activities table indexes
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_created_at ON task_activities(created_at);

-- User invitations table indexes
CREATE INDEX IF NOT EXISTS idx_user_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_user_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invitation_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_user_invitations_expires_at ON user_invitations(expires_at);

-- Internal user companies table indexes
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_user_id ON internal_user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_company_id ON internal_user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_internal_user_companies_is_primary ON internal_user_companies(is_primary);

-- Documents table indexes
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_folder_path ON documents(folder_path);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Document folders table indexes
CREATE INDEX IF NOT EXISTS idx_document_folders_company_id ON document_folders(company_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_parent_folder_id ON document_folders(parent_folder_id);
CREATE INDEX IF NOT EXISTS idx_document_folders_path ON document_folders(path);
CREATE INDEX IF NOT EXISTS idx_document_folders_is_system_folder ON document_folders(is_system_folder);

-- Meeting requests table indexes
CREATE INDEX IF NOT EXISTS idx_meeting_requests_requester_id ON meeting_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_status ON meeting_requests(status);
CREATE INDEX IF NOT EXISTS idx_meeting_requests_requested_date ON meeting_requests(requested_date);

-- Confirmed meetings table indexes
CREATE INDEX IF NOT EXISTS idx_confirmed_meetings_requester_id ON confirmed_meetings(requester_id);
CREATE INDEX IF NOT EXISTS idx_confirmed_meetings_meeting_date ON confirmed_meetings(meeting_date);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_users_role_active ON users(role, is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_project_status ON tasks(project_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_active ON tasks(project_id, status) WHERE status IN ('todo', 'in_progress', 'review');
CREATE INDEX IF NOT EXISTS idx_projects_company_status ON projects(company_id, status);
CREATE INDEX IF NOT EXISTS idx_company_services_company_active ON company_services(company_id, is_active);

-- Partial indexes for better performance (simplified)
CREATE INDEX IF NOT EXISTS idx_users_active_only ON users(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_forms_active_only ON forms(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_active_only ON services(id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_companies_active_only ON companies(id) WHERE is_active = true;

-- Optimize table statistics
ANALYZE users;
ANALYZE projects;
ANALYZE tasks;
ANALYZE companies;
ANALYZE forms;
ANALYZE services;
ANALYZE company_services;
ANALYZE project_managers;
ANALYZE project_members;
ANALYZE task_comments;
ANALYZE task_activities;
ANALYZE user_invitations;
ANALYZE internal_user_companies;
ANALYZE documents;
ANALYZE document_folders;
ANALYZE meeting_requests;
ANALYZE confirmed_meetings;

-- Create a function to get database performance statistics
CREATE OR REPLACE FUNCTION get_database_stats()
RETURNS TABLE (
    table_name text,
    row_count bigint,
    table_size text,
    index_size text,
    cache_hit_ratio numeric
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        n_tup_ins + n_tup_upd + n_tup_del as row_count,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as table_size,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size,
        round(100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read), 2) as cache_hit_ratio
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Create a function to monitor slow queries
CREATE OR REPLACE FUNCTION get_slow_queries(threshold_ms integer DEFAULT 1000)
RETURNS TABLE (
    query text,
    calls bigint,
    total_time numeric,
    mean_time numeric,
    rows bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
    FROM pg_stat_statements
    WHERE mean_time > threshold_ms
    ORDER BY mean_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Enable query statistics tracking (if not already enabled)
-- Note: This requires the pg_stat_statements extension
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Create a function to clean up old data
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS void AS $$
BEGIN
    -- Clean up expired invitations (older than 30 days)
    DELETE FROM user_invitations 
    WHERE expires_at < NOW() - INTERVAL '30 days';
    
    -- Clean up old task activities (older than 90 days)
    DELETE FROM task_activities 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    -- Clean up old notifications (older than 60 days)
    DELETE FROM notifications 
    WHERE created_at < NOW() - INTERVAL '60 days';
    
    -- Vacuum tables to reclaim space
    VACUUM ANALYZE;
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-old-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_database_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_data() TO authenticated;

-- Create a view for monitoring active users (simplified)
CREATE OR REPLACE VIEW active_users_summary AS
SELECT 
    role,
    COUNT(*) as total_users,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_users
FROM users 
WHERE is_active = true
GROUP BY role;

-- Create a view for user activity by company
CREATE OR REPLACE VIEW user_activity_by_company AS
SELECT 
    c.name as company_name,
    COUNT(u.id) as total_users,
    COUNT(CASE WHEN u.is_active = true THEN 1 END) as active_users,
    COUNT(CASE WHEN u.role = 'admin' THEN 1 END) as admin_users,
    COUNT(CASE WHEN u.role = 'manager' THEN 1 END) as manager_users,
    COUNT(CASE WHEN u.role = 'user' THEN 1 END) as regular_users
FROM companies c
LEFT JOIN users u ON c.id = u.company_id
GROUP BY c.id, c.name
ORDER BY total_users DESC;

-- Create a view for project statistics
CREATE OR REPLACE VIEW project_stats AS
SELECT 
    p.id,
    p.name,
    p.status,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'done' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status IN ('todo', 'in_progress', 'review') THEN 1 END) as active_tasks,
    ROUND(100.0 * COUNT(CASE WHEN t.status = 'done' THEN 1 END) / NULLIF(COUNT(t.id), 0), 2) as completion_percentage
FROM projects p
LEFT JOIN tasks t ON p.id = t.project_id
GROUP BY p.id, p.name, p.status;

-- Add comments for documentation
COMMENT ON FUNCTION get_database_stats() IS 'Returns database performance statistics for monitoring';
COMMENT ON FUNCTION get_slow_queries(integer) IS 'Returns slow queries for performance analysis';
COMMENT ON FUNCTION cleanup_old_data() IS 'Cleans up old data to maintain database performance';
COMMENT ON VIEW active_users_summary IS 'Summary of active users by role';
COMMENT ON VIEW user_activity_by_company IS 'User activity breakdown by company';
COMMENT ON VIEW project_stats IS 'Project statistics with task completion metrics';
