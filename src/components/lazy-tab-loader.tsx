// Lazy Loading Components for Performance Optimization
// This module implements lazy loading for dashboard tabs to improve initial load times

import React, { Suspense, ComponentType } from 'react'

// Temporarily disable lazy loading to debug runtime errors
import ProjectsTab from '@/components/tabs/projects-tab'
import FormsTab from '@/components/tabs/forms-tab'
import UsersTab from '@/components/tabs/users-tab'
import CompaniesTab from '@/components/tabs/companies-tab'
import ServicesTab from '@/components/tabs/services-tab'
import CalendarTab from '@/components/tabs/calendar-tab'
import CompanyCalendarsTab from '@/components/tabs/company-calendars-tab'
import DocumentsTab from '@/components/tabs/documents-tab'
import ProjectOverviewTab from '@/components/tabs/project-overview-tab'
import DebugTab from '@/components/tabs/debug-tab'

// Loading component
function TabLoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// Error boundary for lazy loaded components
class TabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Tab loading error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="text-red-600 mb-2">
              <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-2">Failed to load tab</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Tab component mapping with proper typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabComponents: Record<string, ComponentType<any>> = {
  projects: ProjectsTab,
  forms: FormsTab,
  services: ServicesTab,
  calendar: CalendarTab,
  'company-calendars': CompanyCalendarsTab,
  documents: DocumentsTab,
  admin: UsersTab,
  companies: CompaniesTab,
  'project-overview': ProjectOverviewTab,
  debug: DebugTab
}

// Lazy loaded tab wrapper
export function LazyTabComponent({ tabName, selectedCompany }: { tabName: string; selectedCompany?: string | null }) {
  const TabComponent = tabComponents[tabName]

  if (!TabComponent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Tab not found</p>
      </div>
    )
  }

  // Handle components that accept selectedCompany prop
  const componentsWithSelectedCompany = ['documents', 'company-calendars', 'admin']
  if (componentsWithSelectedCompany.includes(tabName)) {
    return (
      <TabErrorBoundary>
        <TabComponent selectedCompany={selectedCompany} />
      </TabErrorBoundary>
    )
  }

  // Handle companies tab with correct prop name
  if (tabName === 'companies') {
    return (
      <TabErrorBoundary>
        <TabComponent selectedCompanyId={selectedCompany} />
      </TabErrorBoundary>
    )
  }

  // Handle components that don't accept selectedCompany prop
  return (
    <TabErrorBoundary>
      <TabComponent />
    </TabErrorBoundary>
  )
}

// Preload function for critical tabs
export function preloadTab(tabName: string) {
  const TabComponent = tabComponents[tabName]
  if (TabComponent) {
    // Trigger preload by accessing the component (this will trigger the lazy loading)
    // We can't directly trigger the lazy loading, but we can ensure the component is available
    return Promise.resolve()
  }
  return Promise.resolve()
}

// Preload critical tabs on app initialization
export function preloadCriticalTabs() {
  // Preload the most commonly used tabs
  const criticalTabs = ['projects', 'forms', 'services']
  
  criticalTabs.forEach(tab => {
    // Use requestIdleCallback for non-blocking preload
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (callback: () => void) => void }).requestIdleCallback(() => preloadTab(tab))
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => preloadTab(tab), 100)
    }
  })
}

// Export the main component
export default LazyTabComponent
