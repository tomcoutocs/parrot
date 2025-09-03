"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import DashboardLayout, { TabType } from '@/components/dashboard-layout'
import ProjectsTab from '@/components/tabs/projects-tab'
import FormsTab from '@/components/tabs/forms-tab'
import UsersTab from '@/components/tabs/users-tab'
import CompaniesTab from '@/components/tabs/companies-tab'
import ServicesTab from '@/components/tabs/services-tab'
import CalendarTab from '@/components/tabs/calendar-tab'
import { CompanyCalendarsTab } from '@/components/tabs/company-calendars-tab'
import DocumentsTab from '@/components/tabs/documents-tab'
import ProjectOverviewTab from '@/components/tabs/project-overview-tab'
import DebugTab from '@/components/tabs/debug-tab'
import { Badge } from '@/components/ui/badge'



export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('projects')

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
    }
  }, [session, status, router])

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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'projects':
        return <ProjectsTab />
      
      case 'forms':
        return <FormsTab />
      
      case 'services':
        return <ServicesTab />
      
      case 'calendar':
        return <CalendarTab />
      
      case 'company-calendars':
        return <CompanyCalendarsTab />
      
      case 'documents':
        return <DocumentsTab />
      
      case 'admin':
        return <UsersTab />
      
      case 'companies':
        return <CompaniesTab />
      
      case 'project-overview':
        return <ProjectOverviewTab />
      
      case 'debug':
        return <DebugTab />
      
      default:
        return <ProjectsTab />
    }
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
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

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </DashboardLayout>
  )
} 