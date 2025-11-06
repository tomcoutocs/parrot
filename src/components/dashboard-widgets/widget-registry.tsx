'use client'

import NotesWidget from './notes-widget'
import LinksWidget from './links-widget'
import ProjectsSummaryWidget from './projects-summary-widget'
import TasksSummaryWidget from './tasks-summary-widget'
import type { SpaceDashboardConfig } from '@/lib/supabase'

interface WidgetRegistryProps {
  widgetConfig: SpaceDashboardConfig
  companyId: string
  onNavigateToTab?: (tab: string) => void
}

export function renderWidget({ widgetConfig, companyId, onNavigateToTab }: WidgetRegistryProps) {
  const { widget_key, config } = widgetConfig

  switch (widget_key) {
    case 'notes':
      return <NotesWidget key={widgetConfig.id} companyId={companyId} config={config} />
    
    case 'links':
      return <LinksWidget key={widgetConfig.id} companyId={companyId} config={config} />
    
    case 'projects_summary':
      return (
        <ProjectsSummaryWidget
          key={widgetConfig.id}
          companyId={companyId}
          config={config}
          onNavigateToTab={onNavigateToTab}
        />
      )
    
    case 'tasks_summary':
      return (
        <TasksSummaryWidget
          key={widgetConfig.id}
          companyId={companyId}
          config={config}
          onNavigateToTab={onNavigateToTab}
        />
      )
    
    default:
      console.warn(`Unknown widget type: ${widget_key}`)
      return null
  }
}

