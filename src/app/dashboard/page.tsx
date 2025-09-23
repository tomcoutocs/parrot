"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout, { TabType } from '@/components/dashboard-layout'
import LazyTabComponent, { preloadCriticalTabs } from '@/components/lazy-tab-loader'
import { loadDashboardData, cleanupSubscriptions } from '@/lib/simplified-database-functions'

function DashboardContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
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

  // Handle URL parameters for tab and company
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType
    const companyParam = searchParams.get('company')
    
    console.log('Dashboard URL params - tab:', tabParam, 'company:', companyParam)
    console.log('Current activeTab:', activeTab)
    
    if (tabParam && ['dashboard', 'projects', 'forms', 'services', 'calendar', 'documents', 'admin', 'companies', 'company-calendars', 'project-overview', 'debug'].includes(tabParam)) {
      console.log('Setting active tab to:', tabParam)
      setActiveTab(tabParam)
    }
    
    if (companyParam) {
      console.log('Setting selected company to:', companyParam)
      setSelectedCompany(companyParam)
    }
  }, [searchParams, activeTab])

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

  // Ensure active tab is valid for user role
  useEffect(() => {
    if (session && activeTab === 'debug' && session.user.role !== 'admin') {
      setActiveTab('dashboard') // Redirect to dashboard if non-admin tries to access debug
    }
  }, [session, activeTab])

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
    // Security check - prevent non-admin users from accessing debug tab
    if (tab === 'debug' && session?.user?.role !== 'admin') {
      console.warn('Non-admin user attempted to access debug tab')
      return
    }
    setActiveTab(tab)
  }

  const handleNavigateToTab = (tab: string) => {
    handleTabChange(tab as TabType)
  }

  return (
    <DashboardLayout 
      activeTab={activeTab} 
      onTabChange={handleTabChange}
      breadcrumbContext={breadcrumbContext}
    >
      <div className="min-h-full">
        {/* Lazy Loaded Tab Content */}
        <LazyTabComponent 
          tabName={activeTab} 
          selectedCompany={selectedCompany} 
          onNavigateToTab={handleNavigateToTab}
          onBreadcrumbContextChange={setBreadcrumbContext}
        />
      </div>
    </DashboardLayout>
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