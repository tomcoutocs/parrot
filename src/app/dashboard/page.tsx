"use client"

import { useState, useEffect, Suspense, startTransition, useRef } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout, { TabType } from '@/components/dashboard-layout'
import { ModernDashboardLayout } from '@/components/modern-dashboard-layout'
import LazyTabComponent, { preloadCriticalTabs } from '@/components/lazy-tab-loader'
import { loadDashboardData, cleanupSubscriptions } from '@/lib/simplified-database-functions'

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const isChangingTabRef = useRef(false)
  // Initialize tab based on user role - non-admin users go straight to dashboard
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    // Default to spaces for admin, dashboard for non-admin (will be set properly once session loads)
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
    const tabParam = searchParams.get('tab') as TabType
    const companyParam = searchParams.get('company')
    const spaceParam = searchParams.get('space')
    
    console.log('Dashboard URL params - tab:', tabParam, 'company:', companyParam, 'space:', spaceParam)
    
    // For non-admin users, ensure they can't access admin tabs via URL
    if (session && session.user.role !== 'admin') {
      const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
      if (tabParam && adminOnlyTabs.includes(tabParam)) {
        // Redirect non-admin users to dashboard in their space
        if (session.user.company_id) {
          router.push(`/dashboard?tab=dashboard&space=${session.user.company_id}`)
          return
        }
      }
    }
    
    const validTabs: TabType[] = ['spaces', 'dashboard', 'projects', 'forms', 'services', 'documents', 'admin', 'companies', 'company-calendars', 'project-overview', 'debug', 'reports', 'settings']
    // Only update activeTab if it's different to prevent unnecessary re-renders
    // Only sync from URL if we're not already in the process of changing tabs
    if (tabParam && validTabs.includes(tabParam) && activeTab !== tabParam && !isChangingTabRef.current) {
      console.log('Setting active tab to:', tabParam)
      setActiveTab(tabParam)
    }
    
    if (companyParam) {
      console.log('Setting selected company to:', companyParam)
      setSelectedCompany(companyParam)
    }
    
    if (spaceParam) {
      console.log('Setting current space to:', spaceParam)
      if (currentSpaceId !== spaceParam) {
        setCurrentSpaceId(spaceParam)
        setSelectedCompany(spaceParam) // Space ID is the company ID
      }
    } else if (!spaceParam && currentSpaceId !== null) {
      // URL has no space param but we have a space - clear it
      // This happens when switching to admin views
      // BUT: Don't clear space if we're switching to a space-required tab (like settings)
      // The tab change handler should have included the space in the URL
      const spaceRequiredTabs: TabType[] = ['dashboard', 'projects', 'forms', 'services', 'company-calendars', 'documents', 'settings']
      if (!spaceRequiredTabs.includes(tabParam as TabType)) {
        setCurrentSpaceId(null)
        setSelectedCompany(null)
      }
    }
  }, [searchParams, session, router, currentSpaceId]) // Removed activeTab from dependencies to prevent loop
  
  // Initialize space for non-admin users - they should go straight to their space
  useEffect(() => {
    if (session && session.user.role !== 'admin' && session.user.company_id) {
      const userSpaceId = session.user.company_id
      
      // Always set their space immediately
      if (currentSpaceId !== userSpaceId) {
        setCurrentSpaceId(userSpaceId)
        setSelectedCompany(userSpaceId)
      }
      
      // Force redirect to dashboard tab if they're on spaces tab or any admin-only tab
      const adminOnlyTabs: TabType[] = ['spaces', 'admin', 'companies', 'project-overview', 'debug']
      if (adminOnlyTabs.includes(activeTab)) {
        setActiveTab('dashboard')
        // Update URL to reflect their space
        router.push(`/dashboard?tab=dashboard&space=${userSpaceId}`)
      } else if (!currentSpaceId) {
        // If no space is set and they're not on an admin tab, redirect
        router.push(`/dashboard?tab=dashboard&space=${userSpaceId}`)
      }
    }
  }, [session, currentSpaceId, activeTab, router])

  // Initialize dashboard data and preload critical tabs
  useEffect(() => {
    if (session && !isInitialized) {
      const initializeDashboard = async () => {
        try {
          // Preload critical tabs in the background
          preloadCriticalTabs()
          
          // Load initial dashboard data based on user role
          const userRole = session.user.role
          const companyId = session.user.role === 'admin' ? undefined : session.user.company_id
          
          await loadDashboardData(userRole, companyId)
          setIsInitialized(true)
        } catch (error) {
          console.error('Failed to initialize dashboard:', error)
          setIsInitialized(true) // Continue anyway
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
    if (adminOnlyTabs.includes(tab)) {
      setActiveTab(tab)
      router.push(`/dashboard?tab=${tab}`)
      setTimeout(() => { isChangingTabRef.current = false }, 100)
      return
    }
    
    // If switching to a space tab that requires being in a space, ensure we have a space
    // Reports can be accessed without a space (shows all data or a message)
    const spaceRequiredTabs: TabType[] = ['dashboard', 'projects', 'forms', 'services', 'company-calendars', 'documents']
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
    setCurrentSpaceId(spaceId)
    setSelectedCompany(spaceId)
    // Switch to dashboard when entering a space
    setActiveTab('dashboard')
    // Update URL
    router.push(`/dashboard?tab=dashboard&space=${spaceId}`)
  }
  
  const handleSpaceChange = (spaceId: string | null) => {
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
      // Batch all state updates together to prevent stuttering
      startTransition(() => {
        setCurrentSpaceId(null)
        setSelectedCompany(null)
        setActiveTab('spaces')
      })
      router.push('/dashboard?tab=spaces')
    } else {
      handleSelectSpace(spaceId)
    }
  }

  // Map internal tab names to display names for modern navigation
  const getDisplayTab = (tab: TabType): string => {
    if (currentSpaceId) {
      // Client view tabs
      const clientTabMap: Record<TabType, string> = {
        'dashboard': 'overview',
        'projects': 'tasks',
        'documents': 'documents',
        'company-calendars': 'calendar',
        'admin': 'users',
        'reports': 'reports',
        'settings': 'settings',
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
    // Map modern tab IDs back to internal tab names
    const tabMap: Record<string, TabType> = {
      'overview': 'dashboard',
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
               {!['dashboard', 'projects', 'documents', 'company-calendars', 'reports', 'admin', 'settings'].includes(activeTab) && (
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