import { supabase } from './supabase'

export interface AuthUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  assignedManagerId?: string
  companyId?: string
  tab_permissions?: string[]
  // For internal users, this will be an array of company IDs
  companyIds?: string[]
  primaryCompanyId?: string
}

// Demo users for testing when Supabase is not configured
const DEMO_USERS: Record<string, AuthUser> = {
  'admin@company.com': {
    id: '550e8400-e29b-41d4-a716-446655440001',
    email: 'admin@company.com',
    name: 'Admin User',
    role: 'admin',
    companyId: 'demo-company-1',
    tab_permissions: ['projects', 'forms', 'services', 'calendar', 'documents', 'chat', 'admin', 'companies', 'project-overview', 'debug']
  },
  'manager@company.com': {
    id: '550e8400-e29b-41d4-a716-446655440002',
    email: 'manager@company.com', 
    name: 'Manager User',
    role: 'manager',
    companyId: 'demo-company-1',
    tab_permissions: ['projects', 'forms', 'services', 'calendar', 'documents', 'chat']
  },
  'user@company.com': {
    id: '550e8400-e29b-41d4-a716-446655440003',
    email: 'user@company.com',
    name: 'Client User',
    role: 'user',
    assignedManagerId: '550e8400-e29b-41d4-a716-446655440002',
    companyId: 'demo-company-1',
    tab_permissions: ['projects', 'forms', 'services', 'calendar', 'chat']
  },
  'internal@company.com': {
    id: '550e8400-e29b-41d4-a716-446655440005',
    email: 'internal@company.com',
    name: 'Internal User',
    role: 'internal',
    companyIds: ['demo-company-1', 'demo-company-2'],
    primaryCompanyId: 'demo-company-1',
    tab_permissions: ['projects', 'forms', 'services', 'calendar', 'chat']
  }
}

export async function signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
  // If Supabase is not configured, use demo authentication
  if (!supabase) {
    console.log('Supabase not configured, using demo authentication')
    if (password === 'demo123' && DEMO_USERS[email]) {
      return { user: DEMO_USERS[email], error: null }
    }
    return { user: null, error: 'Invalid credentials' }
  }

  try {
    console.log('Attempting to authenticate with Supabase...', { email })
    
    // Check if user exists in our database  
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single()

    console.log('Supabase auth response:', { user, error })

    if (error) {
      console.error('Database error during authentication:', error)
      return { user: null, error: `Database error: ${error.message}` }
    }

    if (!user) {
      console.log('User not found in database')
      return { user: null, error: 'User not found' }
    }

    // In a real app, you'd verify the password hash here
    // For this demo, we'll use a simple check
    if (password !== 'demo123') {
      console.log('Invalid password')
      return { user: null, error: 'Invalid password' }
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.full_name,
      role: user.role,
      assignedManagerId: user.assigned_manager_id,
      companyId: user.company_id,
      tab_permissions: user.tab_permissions || []
    }

    console.log('Authentication successful:', authUser)
    return { user: authUser, error: null }
  } catch (error) {
    console.error('Auth error:', error)
    return { user: null, error: 'Authentication failed' }
  }
}

export function signOut(): void {
  // Clear any stored session data
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth-user')
  }
}

export function getCurrentUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  
  const stored = localStorage.getItem('auth-user')
  if (!stored) return null
  
  try {
    return JSON.parse(stored) as AuthUser
  } catch {
    return null
  }
}

export function setCurrentUser(user: AuthUser | null): void {
  if (typeof window === 'undefined') return
  
  if (user) {
    localStorage.setItem('auth-user', JSON.stringify(user))
  } else {
    localStorage.removeItem('auth-user')
  }
} 