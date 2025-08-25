"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import DashboardLayout, { TabType } from '@/components/dashboard-layout'
import AnalyticsTab from '@/components/tabs/analytics-tab'
import ProjectsTab from '@/components/tabs/projects-tab'
import FormsTab from '@/components/tabs/forms-tab'
import UsersTab from '@/components/tabs/users-tab'
import CompaniesTab from '@/components/tabs/companies-tab'
import ServicesTab from '@/components/tabs/services-tab'
import CalendarTab from '@/components/tabs/calendar-tab'
import DebugTab from '@/components/tabs/debug-tab'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Settings, 
  Calendar as CalendarIcon, 
  MessageSquare, 
  FolderOpen, 
  Phone,
  Shield,
  Users,
  Plus
} from 'lucide-react'

// Placeholder components for other tabs
function PlaceholderTab({ title, description, icon: Icon, features }: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  features: string[]
}) {
  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 mb-4">
          <Icon className="h-8 w-8 text-blue-600" />
        </div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 max-w-md mx-auto">{description}</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{feature}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                This feature will be implemented in the full version of the application.
              </p>
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabType>('analytics')

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
      case 'analytics':
        return <AnalyticsTab />
      
      case 'projects':
        return <ProjectsTab />
      
      case 'forms':
        return <FormsTab />
      
      case 'services':
        return <ServicesTab />
      
      case 'calendar':
        return <CalendarTab />
      
      case 'documents':
        return (
          <PlaceholderTab
            title="Document Management"
            description="Store, organize, and share documents securely"
            icon={FolderOpen}
            features={[
              'File Upload',
              'Folder Organization',
              'Document Sharing',
              'Version Control',
              'Access Permissions',
              'Search & Filter'
            ]}
          />
        )
      
      case 'chat':
        return (
          <PlaceholderTab
            title="Chat System"
            description="Real-time communication between managers and clients"
            icon={MessageSquare}
            features={[
              'Direct Messages',
              'Group Chats',
              'File Sharing',
              'Message History',
              'Online Status',
              'Push Notifications'
            ]}
          />
        )
      
      case 'admin':
        return <UsersTab />
      
      case 'companies':
        return <CompaniesTab />
      
      case 'debug':
        return <DebugTab />
      
      default:
        return <AnalyticsTab />
    }
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <div className="min-h-full">
        {/* Welcome Banner */}
        {activeTab === 'analytics' && (
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