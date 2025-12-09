"use client"

import { useState, useEffect, Suspense, startTransition, useRef } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout, { TabType } from '@/components/dashboard-layout'
import { ModernDashboardLayout } from '@/components/modern-dashboard-layout'
import LazyTabComponent, { preloadCriticalTabs, prefetchTab } from '@/components/lazy-tab-loader'
import { loadDashboardData, cleanupSubscriptions } from '@/lib/simplified-database-functions'

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isChangingTabRef = useRef(false)
  const isChangingSpaceRef = useRef(false)
  const isSwitchingToAdminRef = useRef(false)
  // Initialize tab based on user role - non-admin users go straight to user-dashboard
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Default to spaces for admin, user-dashboard for non-admin (will be set properly once session loads)
    return 'spaces'
  })
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [currentSpaceId, setCurrentSpaceId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [breadcrumbContext, setBreadcrumbContext] = useState<{
    projectName?: string
    projectId?: string
    taskTitle?: string
    folderName?: string
    folderPath?: string
  }>({})

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

  // Handle URL parameters for tab, company, and space
  useEffect(() => {
    // Skip URL sync if we're actively changing spaces or switching to admin tabs
    if (isChangingSpaceRef.current || isSwitchingToAdminRef.current) {
      console.log('Dashboard: Skipping URL sync - space change or admin switch in progress')
      return
    }
    
    const tabParam = searchParams.get('tab') as TabType
    const companyParam = searchParams.get('company')
    const spaceParam = searchParams.get('space')
    
    // For non-admin users, ensure they can't access admin tabs via URL
    if (session && session.user.role !== 'admin') {
      const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
      if (tabParam && adminOnlyTabs.includes(tabParam)) {
        // Redirect non-admin users to user-dashboard (personal dashboard, no space)
        isChangingTabRef.current = true
        router.push(`/dashboard?tab=user-dashboard`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
      
      // If non-admin user tries to access dashboard tab without a space, redirect to user-dashboard
      if (tabParam === 'dashboard' && !spaceParam) {
        isChangingTabRef.current = true
        router.push(`/dashboard?tab=user-dashboard`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
    }
    
    const validTabs: TabType[] = ['spaces', 'dashboard', 'user-dashboard', 'projects', 'forms', 'services', 'documents', 'admin', 'companies', 'company-calendars', 'project-overview', 'debug', 'reports', 'settings', 'user-settings']
    
    // For regular users (not admin/manager), if no tab is specified OR if there's a space param, default to user-dashboard (without space)
    // This MUST run BEFORE any space syncing logic
    // BUT: Don't redirect if user is already in a space and clicking overview - allow them to stay in the space
    // Managers and admins can access spaces, so they should be allowed to stay in spaces when clicking overview
    const canAccessSpaces = session && (session.user.role === 'admin' || session.user.role === 'manager')
    if (session && !canAccessSpaces && !isChangingTabRef.current && !isChangingSpaceRef.current) {
      // Only redirect regular users if:
      // 1. No tab specified AND no space (initial load)
      // 2. user-dashboard tab with space (should remove space)
      // BUT NOT: dashboard tab with space when user is already in that space (they're clicking overview)
      const isAlreadyInSpace = currentSpaceId === spaceParam && spaceParam !== null
      if (!tabParam || (tabParam === 'user-dashboard' && spaceParam)) {
        // Redirect to user-dashboard without space
        isChangingTabRef.current = true
        isChangingSpaceRef.current = true // Prevent space syncing during redirect
        setActiveTab('user-dashboard')
        setCurrentSpaceId(null) // Clear any space
        setSelectedCompany(null) // Clear selected company
        router.replace(`/dashboard?tab=user-dashboard`)
        setTimeout(() => { 
          isChangingTabRef.current = false
          isChangingSpaceRef.current = false
        }, 200)
        return
      }
      // If regular user is clicking dashboard (overview) while already in a space, allow it (they're navigating within space)
      // But if they're navigating TO a space, redirect them away
      if (tabParam === 'dashboard' && spaceParam && !isAlreadyInSpace) {
        // This is navigating TO a space, not clicking overview within a space
        // For regular users, redirect to user-dashboard without space
        isChangingTabRef.current = true
        isChangingSpaceRef.current = true
        setActiveTab('user-dashboard')
        setCurrentSpaceId(null)
        setSelectedCompany(null)
        router.replace(`/dashboard?tab=user-dashboard`)
        setTimeout(() => { 
          isChangingTabRef.current = false
          isChangingSpaceRef.current = false
        }, 200)
        return
      }
    }
    
    // Only update activeTab if it's different to prevent unnecessary re-renders
    // Only sync from URL if we're not already in the process of changing tabs or spaces
    // IMPORTANT: If we have a space param, don't show the spaces tab - switch to dashboard instead
    if (tabParam && validTabs.includes(tabParam)) {
      if (spaceParam && tabParam === 'spaces') {
        // If URL has a space but tab is spaces, redirect to dashboard for that space
        // BUT: Skip if we're actively changing spaces to avoid redirect loops
        if (!isChangingSpaceRef.current) {
          console.log('Space selected but tab is spaces - redirecting to dashboard')
          router.push(`/dashboard?tab=dashboard&space=${spaceParam}`)
          setActiveTab('dashboard')
        }
      } else if (activeTab !== tabParam && !isChangingTabRef.current && !isChangingSpaceRef.current) {
        console.log('Setting active tab to:', tabParam)
        setActiveTab(tabParam)
      }
    }
    
    if (companyParam) {
      console.log('Setting selected company to:', companyParam)
      setSelectedCompany(companyParam)
    }
    
    if (spaceParam) {
      console.log('Setting current space to:', spaceParam)
      // For non-admin users on user-dashboard or user-settings, never sync space - remove it from URL
      if (session && session.user.role !== 'admin' && (tabParam === 'user-dashboard' || tabParam === 'user-settings')) {
        if (spaceParam) {
          // Remove space from URL for user-dashboard/user-settings
          router.replace(`/dashboard?tab=${tabParam}`)
          setCurrentSpaceId(null)
          setSelectedCompany(null)
        }
        return
      }
      
      // Only sync from URL if space actually changed and we're not manually changing it
      // IMPORTANT: Don't sync space if we're on an admin-only tab (admin tabs don't have spaces)
      // EXCEPTION: "admin" tab can have a space to show space users
      const adminOnlyTabs: TabType[] = ['spaces', 'companies', 'project-overview', 'debug']
      if (adminOnlyTabs.includes(tabParam as TabType)) {
        console.log('Admin tab detected - ignoring space param')
        // Clear space if we're on an admin tab (except admin tab which can have space)
        if (currentSpaceId !== null) {
          setCurrentSpaceId(null)
          setSelectedCompany(null)
        }
      } else if (currentSpaceId !== spaceParam) {
        // Don't sync space if we're on a tab that doesn't use spaces
        const noSpaceTabs: TabType[] = ['user-dashboard', 'user-settings', 'reports']
        if (!noSpaceTabs.includes(tabParam as TabType)) {
          console.log('Syncing space from URL:', spaceParam)
          setCurrentSpaceId(spaceParam)
          setSelectedCompany(spaceParam) // Space ID is the company ID
        } else if (spaceParam) {
          // If URL has space but tab doesn't need it, remove space from URL
          router.replace(`/dashboard?tab=${tabParam}`)
        }
      }
    } else if (!spaceParam && currentSpaceId !== null) {
      // URL has no space param but we have a space - clear it
      // This happens when switching to admin views
      // BUT: Don't clear space if we're switching to a space-required tab (like settings or admin/users)
      // The tab change handler should have included the space in the URL
      const spaceRequiredTabs: TabType[] = ['dashboard', 'projects', 'forms', 'services', 'company-calendars', 'documents', 'settings', 'admin']
      const adminOnlyTabs: TabType[] = ['spaces', 'companies', 'project-overview', 'debug']
      const noSpaceTabs: TabType[] = ['user-dashboard', 'user-settings', 'reports'] // These tabs don't use spaces
      
      // Always clear space for admin tabs (except admin/users tab which can have space)
      if (adminOnlyTabs.includes(tabParam as TabType)) {
        console.log('Clearing space for admin tab:', tabParam)
        setCurrentSpaceId(null)
        setSelectedCompany(null)
      } else if (noSpaceTabs.includes(tabParam as TabType)) {
        // Clear space for tabs that don't use spaces (like user-dashboard)
        if (currentSpaceId !== null) {
          setCurrentSpaceId(null)
          setSelectedCompany(null)
        }
      } else if (!spaceRequiredTabs.includes(tabParam as TabType)) {
        setCurrentSpaceId(null)
        setSelectedCompany(null)
      }
    }
  }, [searchParams, session, router, currentSpaceId]) // Removed activeTab from dependencies to prevent loop
  
  // Initialize dashboard for non-admin users - redirect to user-dashboard on login
  // This runs once when session loads for non-admin users
  useEffect(() => {
    const canAccessSpaces = session && (session.user.role === 'admin' || session.user.role === 'manager')
    if (!session || canAccessSpaces || isChangingTabRef.current || isChangingSpaceRef.current) {
      return
    }
    
    const tabParam = searchParams.get('tab') as TabType
    const spaceParam = searchParams.get('space')
    const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
    
    // If URL has admin-only tab, redirect to user-dashboard
    // BUT: Don't redirect if user is clicking dashboard (overview) while already in a space
    // Regular users shouldn't access spaces, but if they're already in one (via manager assignment), allow them to navigate within it
    const isAlreadyInSpace = currentSpaceId === spaceParam && spaceParam !== null
    if (adminOnlyTabs.includes(tabParam)) {
      // Only redirect if we're not already on user-dashboard
      if (activeTab !== 'user-dashboard' && tabParam !== 'user-dashboard') {
        isChangingTabRef.current = true
        setActiveTab('user-dashboard')
        router.replace(`/dashboard?tab=user-dashboard`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
      }
    } else if (tabParam === 'dashboard' && spaceParam && !isAlreadyInSpace) {
      // Regular user navigating TO a space (not clicking overview within space) - redirect away
      if (activeTab !== 'user-dashboard') {
        isChangingTabRef.current = true
        setActiveTab('user-dashboard')
        router.replace(`/dashboard?tab=user-dashboard`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
      }
    }
  }, [session, searchParams, activeTab, router, currentSpaceId]) // Use session directly for stable dependency

  // Initialize dashboard data and preload critical tabs (deferred to avoid blocking initial render)
  useEffect(() => {
    if (session && !isInitialized) {
      // Mark as initialized immediately to allow UI to render
      setIsInitialized(true)
      
      // Defer data loading to avoid blocking initial render
      const initializeDashboard = async () => {
        try {
          // Preload critical tabs immediately (non-blocking, but starts right away)
          preloadCriticalTabs()
          
          // Load initial dashboard data in the background (non-blocking)
          const userRole = session.user.role
          const companyId = session.user.role === 'admin' ? undefined : session.user.company_id
          
          // Use setTimeout to defer this to next tick, allowing UI to render first
          setTimeout(async () => {
            try {
              await loadDashboardData(userRole, companyId)
            } catch (error) {
              console.error('Failed to initialize dashboard:', error)
              // Continue anyway - data will load when needed
            }
          }, 0)
        } catch (error) {
          console.error('Failed to initialize dashboard:', error)
        }
      }

      initializeDashboard()
    }
  }, [session, isInitialized])

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      cleanupSubscriptions()
    }
  }, [])

  // Ensure active tab is valid for user role - redirect non-admin users away from admin tabs
  useEffect(() => {
    if (session && session.user.role !== 'admin') {
      const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
      if (adminOnlyTabs.includes(activeTab)) {
        // Redirect non-admin users to dashboard in their space
        if (session.user.company_id) {
          setCurrentSpaceId(session.user.company_id)
          setSelectedCompany(session.user.company_id)
          setActiveTab('dashboard')
          router.push(`/dashboard?tab=dashboard&space=${session.user.company_id}`)
        }
      }
    }
  }, [session, activeTab, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null // Will redirect via useEffect
  }

  const handleTabChange = (tab: TabType) => {
    // Mark that we're changing tabs to prevent useEffect from interfering
    isChangingTabRef.current = true
    
    // User settings and user dashboard are personal tabs - clear space when switching to them
    if (tab === 'user-settings' || tab === 'user-dashboard') {
      // Set the tab first
      setActiveTab(tab)
      router.push(`/dashboard?tab=${tab}`)
      // Clear space after navigation
      if (currentSpaceId) {
        setTimeout(() => {
          setCurrentSpaceId(null)
          setSelectedCompany(null)
          isChangingSpaceRef.current = false
        }, 50)
      }
      setTimeout(() => { 
        isChangingTabRef.current = false
      }, 100)
      return
    }
    
    // Security check - prevent non-admin users from accessing admin-only tabs
    const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
    if (adminOnlyTabs.includes(tab) && session?.user?.role !== 'admin') {
      console.warn(`Non-admin user attempted to access ${tab} tab`)
      // Redirect non-admin users back to dashboard in their space
      if (session?.user?.company_id) {
        setActiveTab('dashboard')
        router.push(`/dashboard?tab=dashboard&space=${session.user.company_id}`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
      }
      return
    }
    
    // Admin-only tabs don't require a space - allow switching to them freely
    // EXCEPTION: "admin" tab (users) can be accessed WITH a space to show space users
    // When switching to admin tabs (except "admin"), clear the space if one is selected
    if (adminOnlyTabs.includes(tab)) {
      console.log('Dashboard: Switching to admin tab:', tab)
      
      // Special handling for "admin" tab - if we have a space, keep it
      if (tab === 'admin' && currentSpaceId) {
        console.log('Dashboard: Switching to admin tab WITH space - showing space users')
        setActiveTab(tab)
        router.push(`/dashboard?tab=${tab}&space=${currentSpaceId}`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
      
      // For other admin tabs or admin tab without space, clear space
      // Set flag to prevent URL sync from interfering
      isSwitchingToAdminRef.current = true
      
      // Clear space when switching to admin tabs (except admin tab with space)
      if (currentSpaceId) {
        console.log('Dashboard: Clearing space for admin tab')
        setCurrentSpaceId(null)
        setSelectedCompany(null)
        isChangingSpaceRef.current = true
      }
      
      setActiveTab(tab)
      router.push(`/dashboard?tab=${tab}`)
      
      setTimeout(() => { 
        isChangingTabRef.current = false
        isSwitchingToAdminRef.current = false
        isChangingSpaceRef.current = false
        console.log('Dashboard: Admin switch flags cleared')
      }, 300)
      return
    }
    
    // Forms tab - special handling: admin users can access without space, non-admin users need space
    if (tab === 'forms' && !currentSpaceId) {
      // For non-admin users, automatically use their company_id as space
      if (session?.user?.role !== 'admin' && session?.user?.company_id) {
        setCurrentSpaceId(session.user.company_id)
        setSelectedCompany(session.user.company_id)
        setActiveTab(tab)
        router.push(`/dashboard?tab=${tab}&space=${session.user.company_id}`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
      // For admin users, allow access to forms without a space (admin view)
      setActiveTab(tab)
      router.push(`/dashboard?tab=${tab}`)
      setTimeout(() => { isChangingTabRef.current = false }, 100)
      return
    }
    
    // If switching to a space tab that requires being in a space, ensure we have a space
    // Reports and user-dashboard can be accessed without a space (shows all data or aggregates from all spaces)
    const spaceRequiredTabs: TabType[] = ['dashboard', 'projects', 'services', 'company-calendars', 'documents']
    if (spaceRequiredTabs.includes(tab) && !currentSpaceId) {
      // For non-admin users, automatically use their company_id as space
      if (session?.user?.role !== 'admin' && session?.user?.company_id) {
        setCurrentSpaceId(session.user.company_id)
        setSelectedCompany(session.user.company_id)
        setActiveTab(tab)
        router.push(`/dashboard?tab=${tab}&space=${session.user.company_id}`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
      // For admin users, they need to select a space first - stay on spaces tab
      // Don't set the tab back to spaces if we're already trying to switch away from it
      if (activeTab !== 'spaces') {
        setActiveTab('spaces')
      }
      setTimeout(() => { isChangingTabRef.current = false }, 100)
      return
    }
    
    // Settings tab - always requires a space
    if (tab === 'settings') {
      // If we have a current space, use it
      if (currentSpaceId) {
        setActiveTab('settings')
        router.push(`/dashboard?tab=settings&space=${currentSpaceId}`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
      
      // For non-admin users, automatically use their company_id as space
      if (session?.user?.role !== 'admin' && session?.user?.company_id) {
        setCurrentSpaceId(session.user.company_id)
        setSelectedCompany(session.user.company_id)
        setActiveTab('settings')
        router.push(`/dashboard?tab=settings&space=${session.user.company_id}`)
        setTimeout(() => { isChangingTabRef.current = false }, 100)
        return
      }
      
      // For admin users without a space, redirect to spaces to select one
      // Settings always needs a space context
      if (activeTab !== 'spaces') {
        setActiveTab('spaces')
      }
      setTimeout(() => { isChangingTabRef.current = false }, 100)
      return
    }
    
    // Reports tab can be accessed without a space - allow it
    if (tab === 'reports' && !currentSpaceId) {
      setActiveTab('reports')
      router.push(`/dashboard?tab=reports`)
      setTimeout(() => { isChangingTabRef.current = false }, 100)
      return
    }
    
    // Normal tab switch
    setActiveTab(tab)
    // Update URL - always include space if we have one (especially for settings)
    if (currentSpaceId) {
      router.push(`/dashboard?tab=${tab}&space=${currentSpaceId}`)
    } else {
      router.push(`/dashboard?tab=${tab}`)
    }
    setTimeout(() => { isChangingTabRef.current = false }, 100)
  }

  const handleNavigateToTab = (tab: string) => {
    handleTabChange(tab as TabType)
  }
  
  const handleSelectSpace = (spaceId: string) => {
    console.log('Dashboard: handleSelectSpace called with spaceId:', spaceId)
    console.log('Dashboard: Current currentSpaceId:', currentSpaceId)
    console.log('Dashboard: Is admin?', session?.user?.role === 'admin')
    
    if (!spaceId) {
      console.error('Dashboard: No spaceId provided to handleSelectSpace')
      return
    }
    
    // Set flag FIRST to prevent URL sync useEffect from interfering
    isChangingSpaceRef.current = true
    isChangingTabRef.current = true
    
    // Immediately update state - don't wait for URL
    setCurrentSpaceId(spaceId)
    setSelectedCompany(spaceId)
    setActiveTab('dashboard')
    
    // Update URL with the correct spaceId - use replace to avoid adding to history
    const url = `/dashboard?tab=dashboard&space=${spaceId}`
    console.log('Dashboard: Navigating to URL:', url)
    router.replace(url)
    
    // Clear flags after URL has time to update (increased delay for reliability)
    setTimeout(() => {
      isChangingSpaceRef.current = false
      isChangingTabRef.current = false
      console.log('Dashboard: Space change flags cleared')
    }, 500)
  }
  
  const handleSpaceChange = (spaceId: string | null) => {
    console.log('Dashboard: handleSpaceChange called with spaceId:', spaceId)
    console.log('Dashboard: Current currentSpaceId:', currentSpaceId)
    console.log('Dashboard: Session user role:', session?.user?.role)
    console.log('Dashboard: Current activeTab:', activeTab)
    
    // Prevent non-admin users from exiting their space
    if (spaceId === null && session?.user?.role !== 'admin') {
      console.warn('Non-admin user attempted to exit their space')
      // Keep them in their space
      if (session?.user?.company_id) {
        setCurrentSpaceId(session.user.company_id)
        setSelectedCompany(session.user.company_id)
        router.push(`/dashboard?tab=dashboard&space=${session.user.company_id}`)
      }
      return
    }
    
    if (spaceId === null) {
      // Exiting space - go back to spaces view (admin only)
      // BUT: Don't change tab if we're already switching to an admin tab
      console.log('Dashboard: Clearing space, current tab:', activeTab, 'isSwitchingToAdmin:', isSwitchingToAdminRef.current)
      
      // If we're already switching to admin tab, just clear space and let handleTabChange handle navigation
      if (isSwitchingToAdminRef.current) {
        console.log('Dashboard: Already switching to admin tab, just clearing space')
        setCurrentSpaceId(null)
        setSelectedCompany(null)
        return
      }
      
      // Set flag to prevent URL sync from interfering
      isSwitchingToAdminRef.current = true
      isChangingSpaceRef.current = true
      
      // Clear space immediately
      setCurrentSpaceId(null)
      setSelectedCompany(null)
      
      // Only change tab if we're not already on an admin tab
      const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
      if (!adminOnlyTabs.includes(activeTab)) {
        console.log('Dashboard: Switching to spaces tab')
        setActiveTab('spaces')
        router.push('/dashboard?tab=spaces')
      } else {
        console.log('Dashboard: Already on admin tab, just clearing space')
        // Just update URL to remove space param
        const currentUrl = new URL(window.location.href)
        currentUrl.searchParams.delete('space')
        router.replace(currentUrl.pathname + currentUrl.search)
      }
      
      setTimeout(() => {
        isSwitchingToAdminRef.current = false
        isChangingSpaceRef.current = false
        console.log('Dashboard: Space change flags cleared')
      }, 300)
    } else {
      // Ensure we have a valid spaceId string
      if (typeof spaceId !== 'string' || !spaceId.trim()) {
        console.error('Dashboard: Invalid spaceId provided:', spaceId)
        return
      }
      handleSelectSpace(spaceId)
    }
  }

  // Map internal tab names to display names for modern navigation
  const getDisplayTab = (tab: TabType): string => {
    if (currentSpaceId) {
      // Client view tabs
      const clientTabMap: Record<TabType, string> = {
        'dashboard': 'overview',
        'user-dashboard': 'overview', // Dashboard is in sidebar, so map to overview for navigation
        'projects': 'tasks',
        'documents': 'documents',
        'company-calendars': 'calendar',
        'admin': 'users',
        'reports': 'reports',
        'settings': 'settings',
        'user-settings': 'settings',
        'spaces': 'overview',
        'forms': 'overview',
        'services': 'overview',
        'companies': 'overview',
        'project-overview': 'overview',
        'debug': 'overview',
      }
      return clientTabMap[tab] || 'overview'
    }
    return 'overview'
  }

  const handleModernTabChange = (tabId: string) => {
    // Check if tabId is already an internal tab name (like "user-dashboard" or "user-settings")
    const validInternalTabs: TabType[] = ['spaces', 'dashboard', 'user-dashboard', 'user-settings', 'projects', 'forms', 'services', 'documents', 'admin', 'companies', 'company-calendars', 'project-overview', 'debug', 'reports', 'settings']
    if (validInternalTabs.includes(tabId as TabType)) {
      // It's already an internal tab name, use it directly
      handleTabChange(tabId as TabType)
      return
    }
    
    // Map modern tab IDs back to internal tab names
    const tabMap: Record<string, TabType> = {
      'overview': 'dashboard',
      'dashboard': 'user-dashboard',
      'tasks': 'projects',
      'documents': 'documents',
      'calendar': 'company-calendars',
      'reports': 'reports',
      'users': 'admin',
      'settings': 'settings',
    }
    const internalTab = tabMap[tabId] || 'dashboard'
    
    // Security check: prevent non-manager/admin users from accessing users tab
    if (internalTab === 'admin' && session?.user?.role !== 'admin' && session?.user?.role !== 'manager') {
      console.warn('Non-manager user attempted to access users tab')
      // Redirect to dashboard
      handleTabChange('dashboard')
      return
    }
    
    // Security check: prevent non-manager/admin users from accessing settings tab
    if (internalTab === 'settings' && session?.user?.role !== 'admin' && session?.user?.role !== 'manager') {
      console.warn('Non-manager user attempted to access settings tab')
      // Redirect to dashboard
      handleTabChange('dashboard')
      return
    }
    
    handleTabChange(internalTab)
  }

  return (
    <ModernDashboardLayout
      activeTab={activeTab}
      onTabChange={handleModernTabChange}
      currentSpaceId={currentSpaceId}
      onSpaceChange={handleSpaceChange}
    >
             <div className="min-h-full">
               {/* Lazy Loaded Tab Content - only show for tabs not handled by ModernDashboardLayout */}
               {/* ModernDashboardLayout now handles: dashboard, projects, documents, company-calendars, reports, admin, settings */}
               {/* Only render LazyTabComponent for other tabs */}
               {!['dashboard', 'user-dashboard', 'projects', 'documents', 'company-calendars', 'reports', 'admin', 'settings', 'user-settings'].includes(activeTab) && (
                 <LazyTabComponent 
                   tabName={activeTab} 
                   selectedCompany={selectedCompany} 
                   onNavigateToTab={handleNavigateToTab}
                   onBreadcrumbContextChange={setBreadcrumbContext}
                   currentSpaceId={currentSpaceId}
                   onSelectSpace={handleSelectSpace}
                 />
               )}
             </div>
    </ModernDashboardLayout>
  )
}

// Loading fallback for Suspense
function DashboardLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
}

// Main dashboard page with Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent />
    </Suspense>
  )
} 