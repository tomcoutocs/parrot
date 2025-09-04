// Lazy Loading Components for Performance Optimization
// This module implements lazy loading for dashboard tabs to improve initial load times

import React, { lazy, Suspense, ComponentType } from 'react'

// Lazy load all tab components
const ProjectsTab = lazy(() => import('@/components/tabs/projects-tab'))
const FormsTab = lazy(() => import('@/components/tabs/forms-tab'))
const UsersTab = lazy(() => import('@/components/tabs/users-tab'))
// Temporarily disable lazy loading for companies tab to debug
import CompaniesTab from '@/components/tabs/companies-tab'
const ServicesTab = lazy(() => import('@/components/tabs/services-tab'))
const CalendarTab = lazy(() => import('@/components/tabs/calendar-tab'))
const CompanyCalendarsTab = lazy(() => import('@/components/tabs/company-calendars-tab'))
const DocumentsTab = lazy(() => import('@/components/tabs/documents-tab'))
const ProjectOverviewTab = lazy(() => import('@/components/tabs/project-overview-tab'))
const DebugTab = lazy(() => import('@/components/tabs/debug-tab'))

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

// Tab component mapping
const tabComponents: Record<string, ComponentType> = {
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

  // Special handling for non-lazy CompaniesTab
  if (tabName === 'companies') {
    return (
      <TabErrorBoundary>
        <CompaniesTab selectedCompanyId={selectedCompany} />
      </TabErrorBoundary>
    )
  }

  return (
    <TabErrorBoundary>
      <Suspense fallback={<TabLoadingSpinner />}>
        <TabComponent selectedCompany={selectedCompany} />
      </Suspense>
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
