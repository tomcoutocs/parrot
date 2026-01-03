// Helper functions for role-based permissions
// These functions centralize role checking logic to ensure consistency

export type UserRole = 'system_admin' | 'admin' | 'manager' | 'user' | 'internal'

/**
 * Check if a user has admin privileges (system_admin or admin)
 * System admins have authority over admins
 */
export function hasAdminPrivileges(role: string | null | undefined): boolean {
  if (!role) return false
  return role === 'admin' || role === 'system_admin'
}

/**
 * Check if a user has system admin privileges
 * System admins have the highest level of access
 */
export function hasSystemAdminPrivileges(role: string | null | undefined): boolean {
  if (!role) return false
  return role === 'system_admin'
}

/**
 * Check if a user can manage other admins
 * Only system admins can manage admins
 */
export function canManageAdmins(role: string | null | undefined): boolean {
  return hasSystemAdminPrivileges(role)
}

