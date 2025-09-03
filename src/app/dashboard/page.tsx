"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import DashboardLayout, { TabType } from '@/components/dashboard-layout'
import LazyTabComponent, { preloadCriticalTabs } from '@/components/lazy-tab-loader'
import { Badge } from '@/components/ui/badge'
import { loadDashboardData, cleanupSubscriptions } from '@/lib/simplified-database-functions'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('projects')
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

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
      setActiveTab('projects') // Redirect to projects if non-admin tries to access debug
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

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
      <div className="min-h-full">
        {/* Welcome Banner */}
        {activeTab === 'projects' && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold mb-2">
                  Welcome back, {session.user.name}!
                </h1>
                <p className="text-blue-100">
                  Here&apos;s what&apos;s happening with your business today.
                </p>
              </div>
              <div className="text-right">
                <Badge className="bg-white text-blue-600 hover:bg-gray-100">
                  {session.user.role.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Lazy Loaded Tab Content */}
        <LazyTabComponent tabName={activeTab} />
      </div>
    </DashboardLayout>
  )
} 