import { supabase } from './supabase'
import type { Company, ProjectWithDetails, TaskWithDetails, User } from './supabase'
import { getCurrentUser } from './auth'

// Helper function to set application context for RLS
async function setAppContext() {
  if (!supabase) return
  
  const currentUser = getCurrentUser()
  if (currentUser && supabase) {
    try {
      console.log('Setting RLS context for user:', {
        id: currentUser.id,
        role: currentUser.role,
        companyId: currentUser.companyId
      })
      
      // Re-enable RLS context setting for custom auth
      await supabase.rpc('set_user_context', {
        user_id: currentUser.id,
        user_role: currentUser.role,
        company_id: currentUser.companyId || null
      })
    } catch (error) {
      console.warn('set_user_context RPC function not available, falling back to basic auth')
    }
  } else {
    console.log('No current user found for RLS context')
  }
}

// Function to get companies without RLS restrictions
export async function fetchCompaniesDirect() {
  if (!supabase) return { companies: [], error: 'Supabase not initialized' }

  try {
    // Try to fetch companies directly without any RLS context
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .limit(10)

    if (error) {
      console.error('Direct company fetch error:', error)
      return { companies: [], error: error.message }
    }

    return { companies: companies || [], error: null }
  } catch (error) {
    console.error('Direct company fetch exception:', error)
    return { companies: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function fetchCompanyDetails(companyId: string) {
  if (!supabase) throw new Error('Supabase client not initialized')

  try {
    await setAppContext()
    
    // Fetch company basic info with better error handling
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .maybeSingle() // Use maybeSingle instead of single to avoid PGRST116 error

    if (companyError) {
      console.error('Error fetching company:', companyError)
      throw new Error(`Failed to fetch company: ${companyError.message}`)
    }

    if (!company) {
      throw new Error(`Company with ID ${companyId} not found`)
    }

    // Fetch all related data in parallel
    const [projects, tasks, users, storage] = await Promise.all([
      fetchCompanyProjects(companyId),
      fetchCompanyTasks(companyId),
      fetchCompanyUsers(companyId),
      fetchCompanyStorage(companyId)
    ])

    return {
      company,
      projects,
      tasks,
      users,
      storage
    }
  } catch (error) {
    console.error('Error fetching company details:', error)
    throw error
  }
}

export async function fetchCompanyProjects(companyId: string): Promise<ProjectWithDetails[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_user:users!projects_created_by_fkey(id, full_name, email),
        manager:users!projects_manager_id_fkey(id, full_name, email),
        tasks:tasks(id, status),
        project_managers!project_managers_project_id_fkey(
          user_id,
          role,
          user:users!project_managers_user_id_fkey(id, full_name, email)
        ),
        project_members!project_members_project_id_fkey(
          user_id,
          role,
          user:users!project_members_user_id_fkey(id, full_name, email)
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })

    if (error) return []

    return data?.map(project => ({
      ...project,
      task_count: project.tasks?.length || 0,
      managers: project.project_managers?.map((pm: { user_id: string; role: string; user: User }) => ({
        id: pm.user_id,
        role: pm.role,
        user: pm.user
      })) || [],
      members: project.project_members?.map((pm: { user_id: string; role: string; user: User }) => ({
        id: pm.user_id,
        role: pm.role,
        user: pm.user
      })) || []
    })) || []
  } catch (error) {
    console.error('Error fetching company projects:', error)
    return []
  }
}

export async function fetchCompanyTasks(companyId: string): Promise<TaskWithDetails[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
        created_user:users!tasks_created_by_fkey(id, full_name, email),
        task_comments(id),
        project:projects!tasks_project_id_fkey(id, name, company_id)
      `)
      .eq('project.company_id', companyId)
      .order('position', { ascending: true })

    if (error) return []

    return data?.map(task => ({
      ...task,
      comment_count: task.task_comments?.length || 0
    })) || []
  } catch (error) {
    console.error('Error fetching company tasks:', error)
    return []
  }
}

export async function fetchCompanyUsers(companyId: string): Promise<User[]> {
  if (!supabase) return []

  try {
    await setAppContext()
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('company_id', companyId)
      .order('full_name', { ascending: true })

    if (error) return []
    return data || []
  } catch (error) {
    console.error('Error fetching company users:', error)
    return []
  }
}

export async function fetchCompanyStorage(companyId: string) {
  if (!supabase) return { totalSize: 0, documentCount: 0, folderCount: 0 }

  try {
    await setAppContext()
    
    // Fetch documents
    const { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('file_size')
      .eq('company_id', companyId)

    // Fetch folders
    const { data: folders, error: foldersError } = await supabase
      .from('document_folders')
      .select('id')
      .eq('company_id', companyId)

    if (docsError || foldersError) {
      console.error('Error fetching storage data:', docsError || foldersError)
      return { totalSize: 0, documentCount: 0, folderCount: 0 }
    }

    const totalSize = documents?.reduce((sum, doc) => sum + (doc.file_size || 0), 0) || 0
    const documentCount = documents?.length || 0
    const folderCount = folders?.length || 0

    return {
      totalSize,
      documentCount,
      folderCount
    }
  } catch (error) {
    console.error('Error fetching company storage:', error)
    return { totalSize: 0, documentCount: 0, folderCount: 0 }
  }
}

// Test function to check available companies
export async function testCompanyAccess() {
  if (!supabase) return { companies: [], error: 'Supabase not initialized' }

  try {
    await setAppContext()
    
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name')
      .limit(10)

    if (error) {
      return { companies: [], error: error.message }
    }

    return { companies: companies || [], error: null }
  } catch (error) {
    return { companies: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Simple test function without RLS context
export async function simpleCompanyTest() {
  if (!supabase) return { companies: [], error: 'Supabase not initialized' }

  try {
    const { data: companies, error } = await supabase
      .from('companies')
      .select('id, name')
      .limit(5)

    if (error) {
      return { companies: [], error: error.message }
    }

    return { companies: companies || [], error: null }
  } catch (error) {
    return { companies: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
