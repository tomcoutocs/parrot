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
    // Try spaces table first (after migration), fallback to companies for backward compatibility
    let { data: companies, error } = await supabase
      .from('spaces')
      .select('*')
      .limit(10)

    // If spaces table doesn't exist (migration not run), try companies table
    if (error && (error.message?.includes('does not exist') || error.message?.includes('relation') || (error as any).code === '42P01')) {
      const fallback = await supabase
        .from('companies')
        .select('*')
        .limit(10)
      
      if (!fallback.error) {
        companies = fallback.data
        error = null
      } else {
        error = fallback.error
      }
    }

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
    // Try spaces table first (after migration), fallback to companies for backward compatibility
    let { data: company, error: companyError } = await supabase
      .from('spaces')
      .select('*')
      .eq('id', companyId)
      .maybeSingle() // Use maybeSingle instead of single to avoid PGRST116 error

    // If spaces table doesn't exist (migration not run), try companies table
    if (companyError && (companyError.message?.includes('does not exist') || companyError.message?.includes('relation') || (companyError as any).code === '42P01')) {
      const fallback = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .maybeSingle()
      
      if (!fallback.error) {
        company = fallback.data
        companyError = null
      } else {
        companyError = fallback.error
      }
    }

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
    // Try space_id first (after migration), fallback to company_id
    let { data, error } = await supabase
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
      .eq('space_id', companyId)
      .order('created_at', { ascending: false })

    // If space_id column doesn't exist (migration not run), try company_id
    if (error && (error.message?.includes('does not exist') || error.message?.includes('column') || (error as any).code === '42703')) {
      const fallback = await supabase
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
      
      if (!fallback.error) {
        data = fallback.data
        error = null
      }
    }

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
    // Try space_id first (after migration), fallback to company_id
    let { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        assigned_user:users!tasks_assigned_to_fkey(id, full_name, email),
        created_user:users!tasks_created_by_fkey(id, full_name, email),
        task_comments(id),
        project:projects!tasks_project_id_fkey(id, name, space_id)
      `)
      .eq('project.space_id', companyId)
      .order('position', { ascending: true })

    // If space_id column doesn't exist (migration not run), try company_id
    if (error && (error.message?.includes('does not exist') || error.message?.includes('column') || (error as any).code === '42703')) {
      const fallback = await supabase
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
      
      if (!fallback.error) {
        data = fallback.data
        error = null
      }
    }

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
    // Try space_id first (after migration), fallback to company_id
    let { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('space_id', companyId)
      .order('full_name', { ascending: true })

    // If space_id column doesn't exist (migration not run), try company_id
    if (error && (error.message?.includes('does not exist') || error.message?.includes('column') || (error as any).code === '42703')) {
      const fallback = await supabase
        .from('users')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name', { ascending: true })
      
      if (!fallback.error) {
        data = fallback.data
        error = null
      }
    }

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
    
    // Fetch documents - try space_id first (after migration), fallback to company_id
    let { data: documents, error: docsError } = await supabase
      .from('documents')
      .select('file_size')
      .eq('space_id', companyId)

    // If space_id column doesn't exist (migration not run), try company_id
    if (docsError && (docsError.message?.includes('does not exist') || docsError.message?.includes('column') || (docsError as any).code === '42703')) {
      const fallback = await supabase
        .from('documents')
        .select('file_size')
        .eq('company_id', companyId)
      
      if (!fallback.error) {
        documents = fallback.data
        docsError = null
      } else {
        docsError = fallback.error
      }
    }

    // Fetch folders - try space_id first (after migration), fallback to company_id
    let { data: folders, error: foldersError } = await supabase
      .from('document_folders')
      .select('id')
      .eq('space_id', companyId)

    // If space_id column doesn't exist (migration not run), try company_id
    if (foldersError && (foldersError.message?.includes('does not exist') || foldersError.message?.includes('column') || (foldersError as any).code === '42703')) {
      const fallback = await supabase
        .from('document_folders')
        .select('id')
        .eq('company_id', companyId)
      
      if (!fallback.error) {
        folders = fallback.data
        foldersError = null
      } else {
        foldersError = fallback.error
      }
    }

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
    
    // Try spaces table first (after migration), fallback to companies for backward compatibility
    let { data: companies, error } = await supabase
      .from('spaces')
      .select('id, name')
      .limit(10)

    // If spaces table doesn't exist (migration not run), try companies table
    if (error && (error.message?.includes('does not exist') || error.message?.includes('relation') || (error as any).code === '42P01')) {
      const fallback = await supabase
        .from('companies')
        .select('id, name')
        .limit(10)
      
      if (!fallback.error) {
        companies = fallback.data
        error = null
      } else {
        error = fallback.error
      }
    }

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
    // Try spaces table first (after migration), fallback to companies for backward compatibility
    let { data: companies, error } = await supabase
      .from('spaces')
      .select('id, name')
      .limit(5)

    // If spaces table doesn't exist (migration not run), try companies table
    if (error && (error.message?.includes('does not exist') || error.message?.includes('relation') || (error as any).code === '42P01')) {
      const fallback = await supabase
        .from('companies')
        .select('id, name')
        .limit(5)
      
      if (!fallback.error) {
        companies = fallback.data
        error = null
      } else {
        error = fallback.error
      }
    }

    if (error) {
      return { companies: [], error: error.message }
    }

    return { companies: companies || [], error: null }
  } catch (error) {
    return { companies: [], error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
