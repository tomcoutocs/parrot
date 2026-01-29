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

/**
 * Check if a user is an internal user (not a regular client user)
 * Internal users include: system_admin, admin, manager, internal
 * Regular client users have role: 'user'
 */
export function isInternalUser(role: string | null | undefined): boolean {
  if (!role) return false
  return role === 'system_admin' || role === 'admin' || role === 'manager' || role === 'internal'
}

/**
 * Check if a user can access an app based on role and permissions
 * Regular users (role === 'user') can only access Client Portal
 * Internal users and above can access apps if they have permissions
 */
export function canAccessApp(
  appId: string,
  role: string | null | undefined,
  tabPermissions: string[] = []
): boolean {
  if (!role) return false
  
  // Regular users (clients) can only access Client Portal
  if (role === 'user') {
    return appId === 'client-portal'
  }
  
  // System admins and admins have access to all apps
  if (hasSystemAdminPrivileges(role) || hasAdminPrivileges(role)) {
    return true
  }
  
  // For internal users and managers, check tab permissions
  // Check for new format (app:tab) - user needs at least one tab permission
  const hasAnyTab = tabPermissions.some(perm => perm.startsWith(`${appId}:`))
  
  // Check for old format (just app name) - grants all tabs
  const hasAppLevel = tabPermissions.includes(appId)
  
  return hasAnyTab || hasAppLevel
}

