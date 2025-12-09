// Lazy Loading Components for Performance Optimization
// This module implements lazy loading for dashboard tabs to improve initial load times

import React, { ComponentType, Suspense, lazy } from 'react'

// Lazy load all tab components to reduce initial bundle size
const DashboardLandingTab = lazy(() => import('@/components/tabs/dashboard-landing-tab'))
const ProjectsTab = lazy(() => import('@/components/tabs/projects-tab'))
const FormsTab = lazy(() => import('@/components/tabs/forms-tab'))
const UsersTab = lazy(() => import('@/components/tabs/users-tab'))
const CompaniesTab = lazy(() => import('@/components/tabs/companies-tab'))
const ServicesTab = lazy(() => import('@/components/tabs/services-tab'))
const CompanyCalendarsTab = lazy(() => import('@/components/tabs/company-calendars-tab'))
const DocumentsTab = lazy(() => import('@/components/tabs/documents-tab'))
const ProjectOverviewTab = lazy(() => import('@/components/tabs/project-overview-tab'))
const DebugTab = lazy(() => import('@/components/tabs/debug-tab'))
const SpacesTab = lazy(() => import('@/components/tabs/spaces-tab'))
const UserSettingsTab = lazy(() => import('@/components/tabs/user-settings-tab'))


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

// Loading fallback component - optimized for perceived performance
function TabLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted border-t-primary"></div>
        </div>
        <p className="text-sm text-muted-foreground animate-pulse">Loading...</p>
      </div>
    </div>
  )
}

// Tab component mapping with proper typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tabComponents: Record<string, ComponentType<any>> = {
  spaces: SpacesTab,
  dashboard: DashboardLandingTab,
  projects: ProjectsTab,
  forms: FormsTab,
  services: ServicesTab,
  'company-calendars': CompanyCalendarsTab,
  documents: DocumentsTab,
  admin: UsersTab,
  companies: CompaniesTab,
  'project-overview': ProjectOverviewTab,
  debug: DebugTab,
  'user-settings': UserSettingsTab
}

// Lazy loaded tab wrapper
export function LazyTabComponent({ 
  tabName, 
  selectedCompany, 
  onNavigateToTab,
  onBreadcrumbContextChange,
  currentSpaceId,
  onSelectSpace
}: { 
  tabName: string
  selectedCompany?: string | null
  onNavigateToTab?: (tab: string) => void
  onBreadcrumbContextChange?: (context: {
    projectName?: string
    projectId?: string
    taskTitle?: string
    folderName?: string
    folderPath?: string
  }) => void
  currentSpaceId?: string | null
  onSelectSpace?: (spaceId: string) => void
}) {
  const TabComponent = tabComponents[tabName]

  if (!TabComponent) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600">Tab not found</p>
      </div>
    )
  }

  // Wrap component in Suspense for lazy loading
  const renderComponent = (component: React.ReactNode) => (
    <TabErrorBoundary>
      <Suspense fallback={<TabLoadingFallback />}>
        {component}
      </Suspense>
    </TabErrorBoundary>
  )

  // Handle spaces tab with space selection prop
  if (tabName === 'spaces') {
    return renderComponent(
      <TabComponent 
        onSelectSpace={onSelectSpace || (() => {})}
        currentSpaceId={currentSpaceId}
      />
    )
  }

  // Handle dashboard tab with navigation prop and currentSpaceId
  if (tabName === 'dashboard') {
    return renderComponent(
      <TabComponent 
        onNavigateToTab={onNavigateToTab}
        onBreadcrumbContextChange={onBreadcrumbContextChange}
        currentSpaceId={currentSpaceId}
      />
    )
  }

  // Handle components that accept selectedCompany prop
  const componentsWithSelectedCompany = ['documents', 'company-calendars', 'admin']
  if (componentsWithSelectedCompany.includes(tabName)) {
    return renderComponent(
      <TabComponent 
        selectedCompany={selectedCompany}
        onBreadcrumbContextChange={onBreadcrumbContextChange}
      />
    )
  }

  // Handle companies tab with correct prop name
  if (tabName === 'companies') {
    return renderComponent(
      <TabComponent 
        selectedCompanyId={selectedCompany}
        onBreadcrumbContextChange={onBreadcrumbContextChange}
      />
    )
  }

  // Handle projects tab with currentSpaceId prop
  if (tabName === 'projects') {
    return renderComponent(
      <TabComponent 
        onBreadcrumbContextChange={onBreadcrumbContextChange}
        currentSpaceId={currentSpaceId}
      />
    )
  }

  // Handle forms tab with currentSpaceId prop
  if (tabName === 'forms') {
    return renderComponent(
      <TabComponent 
        currentSpaceId={currentSpaceId}
        onBreadcrumbContextChange={onBreadcrumbContextChange}
      />
    )
  }

  // Handle components that don't accept selectedCompany prop
  return renderComponent(
    <TabComponent onBreadcrumbContextChange={onBreadcrumbContextChange} />
  )
}

// Preload function for critical tabs
export function preloadTab(tabName: string) {
  const tabMap: Record<string, () => Promise<any>> = {
    'spaces': () => import('@/components/tabs/spaces-tab'),
    'dashboard': () => import('@/components/tabs/dashboard-landing-tab'),
    'projects': () => import('@/components/tabs/projects-tab'),
    'forms': () => import('@/components/tabs/forms-tab'),
    'services': () => import('@/components/tabs/services-tab'),
    'company-calendars': () => import('@/components/tabs/company-calendars-tab'),
    'documents': () => import('@/components/tabs/documents-tab'),
    'admin': () => import('@/components/tabs/users-tab'),
    'companies': () => import('@/components/tabs/companies-tab'),
    'project-overview': () => import('@/components/tabs/project-overview-tab'),
    'debug': () => import('@/components/tabs/debug-tab'),
    'user-settings': () => import('@/components/tabs/user-settings-tab')
  }
  
  const loader = tabMap[tabName]
  if (loader) {
    return loader()
  }
  return Promise.resolve()
}

// Track which tabs have been preloaded
const preloadedTabs = new Set<string>()

// Preload critical tabs on app initialization
export function preloadCriticalTabs() {
  // Preload the most commonly used tabs immediately (don't wait for idle)
  const criticalTabs = ['projects', 'forms', 'services', 'dashboard']
  
  criticalTabs.forEach(tab => {
    if (preloadedTabs.has(tab)) return
    
    // Preload immediately for critical tabs
    preloadTab(tab)
      .then(() => {
        preloadedTabs.add(tab)
      })
      .catch(() => {
        // Silently fail preload - component will load when needed
      })
  })
  
  // Preload other tabs in background
  const otherTabs = ['documents', 'company-calendars', 'admin', 'user-settings']
  otherTabs.forEach(tab => {
    if (preloadedTabs.has(tab)) return
    
    // Use requestIdleCallback for non-critical tabs
    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as Window & { requestIdleCallback: (callback: () => void) => void }).requestIdleCallback(() => {
        preloadTab(tab)
          .then(() => {
            preloadedTabs.add(tab)
          })
          .catch(() => {
            // Silently fail preload
          })
      })
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => {
        preloadTab(tab)
          .then(() => {
            preloadedTabs.add(tab)
          })
          .catch(() => {
            // Silently fail preload
          })
      }, 500)
    }
  })
}

// Prefetch a tab when user hovers over navigation (for better UX)
export function prefetchTab(tabName: string) {
  if (preloadedTabs.has(tabName)) return
  
  preloadTab(tabName)
    .then(() => {
      preloadedTabs.add(tabName)
    })
    .catch(() => {
      // Silently fail prefetch
    })
}

// Export the main component
export default LazyTabComponent
