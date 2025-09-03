import { createClient } from '@supabase/supabase-js'

// Use placeholder values if environment variables are not set (for development)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create a mock client if we're using placeholder values
export const supabase = supabaseUrl.includes('placeholder') 
  ? null // We'll handle this in components by checking if supabase is null
  : createClient(supabaseUrl, supabaseAnonKey)

// Types for our database tables
export interface Company {
  id: string
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  tags?: string[]
  is_active: boolean
  is_partner: boolean
  created_at: string
  updated_at: string
  services?: Service[]
}

export interface User {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  created_at: string
  updated_at: string
  is_active: boolean
  assigned_manager_id?: string
  company_id?: string
  tab_permissions?: string[]
}

// New interface for internal user company assignments
export interface InternalUserCompany {
  id: string
  user_id: string
  company_id: string
  is_primary: boolean
  assigned_at: string
  assigned_by?: string
  company?: Company
}

// Extended user interface for internal users
export interface UserWithCompanies extends User {
  companies?: InternalUserCompany[]
  primary_company?: Company
}

export interface Message {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
  read_at?: string
}

export interface Document {
  id: string
  user_id: string
  title: string
  file_url: string
  file_type: string
  file_size: number
  created_at: string
  created_by: string
}

export interface Appointment {
  id: string
  user_id: string
  manager_id: string
  title: string
  description?: string
  scheduled_for: string
  duration_minutes: number
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  created_at: string
}

// Project Management Types
export interface Project {
  id: string
  name: string
  description?: string
  created_by: string
  manager_id?: string | null
  company_id?: string
  status: 'active' | 'archived' | 'completed'
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  assigned_to?: string
  created_by: string
  due_date?: string
  estimated_hours: number
  actual_hours: number
  position: number
  created_at: string
  updated_at: string
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface TaskActivity {
  id: string
  task_id: string
  user_id: string
  action: string
  old_value?: Record<string, unknown>
  new_value?: Record<string, unknown>
  created_at: string
}

// Extended types with relations
export interface TaskWithDetails extends Task {
  assigned_user?: User
  created_user?: User
  comments?: TaskComment[]
  comment_count?: number
}

export interface ProjectManager {
  id: string
  role: string
  user: User
}

export interface ProjectMember {
  id: string
  role: string
  user: User
}

export interface ProjectWithDetails extends Project {
  created_user?: User
  manager?: User
  tasks?: TaskWithDetails[]
  task_count?: number
  managers?: ProjectManager[]
  members?: ProjectMember[]
}

// Form Management Types
export interface FormField {
  id: string
  type: 'text' | 'textarea' | 'email' | 'number' | 'select' | 'checkbox' | 'radio' | 'date'
  label: string
  required: boolean
  placeholder?: string
  options?: string[] // For select, radio fields
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface Form {
  id: string
  title: string
  description?: string
  fields: FormField[]
  is_active: boolean
  created_by: string
  created_at: string
}

export interface FormSubmission {
  id: string
  form_id: string
  user_id: string
  submission_data: Record<string, unknown>
  submitted_at: string
}

export interface FormWithDetails extends Form {
  created_user?: User
  submission_count?: number
  submissions?: FormSubmission[]
}

export interface Service {
  id: string
  name: string
  description?: string
  category: string
  subcategory?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompanyService {
  id: string
  company_id: string
  service_id: string
  is_active: boolean
  created_at: string
}

export interface ServiceWithCompanyStatus extends Service {
  is_company_active?: boolean
}

// Meeting System Types
export interface MeetingRequest {
  id: string
  requester_id: string
  requested_date: string
  requested_time_slot: string
  meeting_title: string
  meeting_description?: string
  status: 'pending' | 'approved' | 'denied' | 'cancelled'
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface ConfirmedMeeting {
  id: string
  meeting_request_id?: string
  requester_id: string
  meeting_date: string
  start_time: string
  end_time: string
  meeting_title: string
  meeting_description?: string
  created_at: string
  updated_at: string
} 