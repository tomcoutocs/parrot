import { createClient } from '@supabase/supabase-js'

// Use placeholder values if environment variables are not set (for development)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

// Create Supabase client with error handling
let supabaseClient = null

try {
  if (!supabaseUrl.includes('placeholder') && supabaseAnonKey !== 'placeholder-key') {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'parrot-portal'
        }
      }
    })
  }
} catch (error) {
  supabaseClient = null
}

export const supabase = supabaseClient

// Debug function to check if Supabase is properly initialized
export function isSupabaseInitialized() {
  return supabase !== null && supabaseUrl !== 'https://placeholder.supabase.co'
}

// Types for our database tables
// Note: The database table is called "companies" but we use "space" terminology throughout the codebase
// to avoid confusion. A "space" represents a client workspace/company.
export interface Space {
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
  retainer?: number
  revenue?: number
  // Legacy API keys (kept for backward compatibility)
  meta_api_key?: string
  google_api_key?: string
  shopify_api_key?: string
  klaviyo_api_key?: string
  // Google Ads API credentials
  google_ads_developer_token?: string
  google_ads_client_id?: string
  google_ads_client_secret?: string
  google_ads_refresh_token?: string
  google_ads_customer_id?: string
  // Meta Ads API credentials
  meta_ads_app_id?: string
  meta_ads_app_secret?: string
  meta_ads_access_token?: string
  meta_ads_ad_account_id?: string
  meta_ads_system_user_token?: string
  // Shopify API credentials
  shopify_store_domain?: string
  shopify_api_secret_key?: string
  shopify_access_token?: string
  shopify_scopes?: string
  // Klaviyo API credentials
  klaviyo_public_api_key?: string
  klaviyo_private_api_key?: string
  created_at: string
  updated_at: string
  services?: Service[]
}

// Legacy alias for backward compatibility - use Space instead
/** @deprecated Use Space instead. This alias exists for backward compatibility. */
export type Company = Space

export interface User {
  id: string
  email: string
  full_name: string
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
  created_at: string
  updated_at: string
  is_active: boolean
  assigned_manager_id?: string
  company_id?: string
  tab_permissions?: string[]
  profile_picture?: string
}

// New interface for internal user space assignments
// Note: Database table is "internal_user_companies" but we use "space" terminology
export interface InternalUserSpace {
  id: string
  user_id: string
  space_id: string // Maps to company_id in database
  is_primary: boolean
  assigned_at: string
  assigned_by?: string
  space?: Space
}

// Legacy alias for backward compatibility
/** @deprecated Use InternalUserSpace instead. This alias exists for backward compatibility. */
export type InternalUserCompany = Omit<InternalUserSpace, 'space_id' | 'space'> & {
  company_id: string
  company?: Space
}

// Extended user interface for internal users
export interface UserWithSpaces extends User {
  spaces?: InternalUserSpace[]
  primary_space?: Space
}

// Legacy alias for backward compatibility
/** @deprecated Use UserWithSpaces instead. This alias exists for backward compatibility. */
export type UserWithCompanies = Omit<UserWithSpaces, 'spaces' | 'primary_space'> & {
  companies?: InternalUserCompany[]
  primary_company?: Space
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
  company_id?: string // Deprecated: kept for backward compatibility, use space_id
  space_id?: string
  status: 'active' | 'archived' | 'completed'
  position?: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  project_id: string
  title: string
  description?: string
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'normal' | 'high' | 'urgent'
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
  helpText?: string
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
  company_id?: string | null
  submission_data: Record<string, unknown>
  submitted_at: string
  user?: {
    id: string
    full_name: string
    email: string
  }
  company?: {
    id: string
    name: string
  }
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

// Space Service junction table (database table is "company_services" but we use "space" terminology)
export interface SpaceService {
  id: string
  space_id: string // Maps to company_id in database
  service_id: string
  is_active: boolean
  created_at: string
}

// Legacy alias for backward compatibility
/** @deprecated Use SpaceService instead. This alias exists for backward compatibility. */
export type CompanyService = Omit<SpaceService, 'space_id'> & {
  company_id: string
}

export interface ServiceWithSpaceStatus extends Service {
  is_space_active?: boolean
}

// Legacy alias for backward compatibility
/** @deprecated Use ServiceWithSpaceStatus instead. This alias exists for backward compatibility. */
export type ServiceWithCompanyStatus = Omit<ServiceWithSpaceStatus, 'is_space_active'> & {
  is_company_active?: boolean
}

// User Invitation System Types
export interface UserInvitation {
  id: string
  email: string
  full_name: string
  space_id: string | null
  company_id?: string | null // Deprecated: kept for backward compatibility, use space_id
  role: 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'
  invited_by: string
  invitation_token: string
  status: 'pending' | 'accepted' | 'expired'
  expires_at: string
  created_at: string
  accepted_at?: string
  tab_permissions?: string[]
}

export interface InvitationStatus {
  success: boolean
  message: string
  invitation?: UserInvitation
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

// Dashboard Customization Types
export interface DashboardWidget {
  id: string
  widget_key: string
  name: string
  description?: string
  icon_name?: string
  default_enabled: boolean
  default_config: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface SpaceDashboardConfig {
  id: string
  company_id: string
  widget_key: string
  enabled: boolean
  position: number
  config: Record<string, unknown>
  created_at: string
  updated_at: string
  widget?: DashboardWidget
}

export interface DashboardNote {
  id: string
  company_id: string
  title?: string
  content: string
  created_by: string
  updated_by?: string
  is_pinned: boolean
  created_at: string
  updated_at: string
  created_user?: User
  updated_user?: User
}

export interface DashboardLink {
  id: string
  company_id: string
  title: string
  url: string
  description?: string
  icon_name?: string
  display_order: number
  created_by: string
  created_at: string
  updated_at: string
  created_user?: User
} 