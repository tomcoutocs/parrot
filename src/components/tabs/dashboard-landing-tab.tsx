'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { useSession } from '@/components/providers/session-provider'
import { RefreshCw, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { LoadingGrid } from '@/components/ui/loading-states'
import { Card } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  fetchSpaceDashboardConfig,
  fetchCompaniesOptimized,
  fetchDashboardWidgets,
  saveSpaceDashboardConfig
} from '@/lib/simplified-database-functions'
import type { SpaceDashboardConfig, Company, DashboardWidget } from '@/lib/supabase'
import { renderWidget } from '@/components/dashboard-widgets/widget-registry'

interface DashboardLandingTabProps {
  onNavigateToTab?: (tab: string) => void
  currentSpaceId?: string | null
}

interface WidgetItem {
  id: string
  widgetConfig: SpaceDashboardConfig | null
  isPlaceholder: boolean
}

export default function DashboardLandingTab({ onNavigateToTab, currentSpaceId }: DashboardLandingTabProps) {
  const { data: session } = useSession()
  const [widgetConfigs, setWidgetConfigs] = useState<SpaceDashboardConfig[]>([])
  const [availableWidgets, setAvailableWidgets] = useState<DashboardWidget[]>([])
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null)

  // Determine the company ID to use
  const companyId = currentSpaceId || session?.user?.company_id

  const canConfigure = session?.user?.role === 'admin' || session?.user?.role === 'manager'

  useEffect(() => {
    if (companyId) {
      loadDashboardData()
    } else {
      setLoading(false)
      setError('No space selected. Please select a space to view the dashboard.')
    }
  }, [companyId])

  const loadDashboardData = async () => {
    if (!companyId) return

    setLoading(true)
    setError('')
    
    try {
      // Fetch dashboard configuration, company info, and available widgets
      const [configs, companies, widgets] = await Promise.all([
        fetchSpaceDashboardConfig(companyId),
        fetchCompaniesOptimized(),
        canConfigure ? fetchDashboardWidgets() : Promise.resolve([])
      ])

      setWidgetConfigs(configs)
      setAvailableWidgets(widgets)
      const spaceCompany = companies.find(c => c.id === companyId)
      setCompany(spaceCompany || null)
      setLastUpdated(new Date())
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
      setError('Failed to load dashboard data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const saveConfig = async (configs: SpaceDashboardConfig[], reload: boolean = false) => {
    if (!companyId || !canConfigure) return

    setSaving(true)
    try {
      const configsToSave = configs.map((config, index) => ({
        widget_key: config.widget_key,
        enabled: true,
        position: index,
        config: config.config || {}
      }))

      const result = await saveSpaceDashboardConfig(companyId, configsToSave)
      if (result.success) {
        if (reload) {
          // Reload to get fresh data with correct IDs (needed after add/remove)
          await loadDashboardData()
        } else {
          // Just update state (for drag operations)
          setWidgetConfigs(configs)
        }
      } else {
        setError(result.error || 'Failed to save configuration')
      }
    } catch (err) {
      console.error('Error saving dashboard config:', err)
      setError('Failed to save dashboard configuration')
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !canConfigure) return

    const sourceIndex = result.source.index
    const destIndex = result.destination.index

    // Don't allow dragging placeholders
    if (sourceIndex >= widgetConfigs.length) return

    // Get actual widget configs (excluding placeholders)
    const items = Array.from(widgetConfigs)
    
    // Remove the dragged item
    const [reorderedItem] = items.splice(sourceIndex, 1)
    
    // Insert at destination (clamp to valid range)
    const insertIndex = Math.min(destIndex, items.length)
    items.splice(insertIndex, 0, reorderedItem)

    // Update positions
    const updatedConfigs = items.map((item, index) => ({
      ...item,
      position: index
    }))

    // Don't reload after drag - just update state
    saveConfig(updatedConfigs, false)
  }

  const handleAddWidget = async (widgetKey: string, placeholderIndex: number) => {
    if (!companyId || !canConfigure) return

    const widget = availableWidgets.find(w => w.widget_key === widgetKey)
    if (!widget) return

    const newConfig: SpaceDashboardConfig = {
      id: `temp-${Date.now()}`,
      company_id: companyId,
      widget_key: widgetKey,
      enabled: true,
      position: placeholderIndex,
      config: widget.default_config || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const updatedConfigs = [...widgetConfigs]
    updatedConfigs.splice(placeholderIndex, 0, newConfig)
    
    // Recalculate positions
    const finalConfigs = updatedConfigs.map((config, index) => ({
      ...config,
      position: index
    }))

    await saveConfig(finalConfigs, true)
    setOpenPopoverId(null)
  }

  const handleRemoveWidget = async (widgetId: string) => {
    if (!canConfigure) return

    const updatedConfigs = widgetConfigs
      .filter(config => config.id !== widgetId)
      .map((config, index) => ({
        ...config,
        position: index
      }))

    await saveConfig(updatedConfigs, true)
  }

  const getWidgetItems = (): WidgetItem[] => {
    const items: WidgetItem[] = widgetConfigs.map(config => ({
      id: config.id,
      widgetConfig: config,
      isPlaceholder: false
    }))

    // Add only one placeholder card if there are available widgets to add
    const availableWidgetsForSlot = getAvailableWidgetsForSlot()
    if (availableWidgetsForSlot.length > 0) {
      items.push({
        id: 'placeholder-0',
        widgetConfig: null,
        isPlaceholder: true
      })
    }

    return items
  }

  const getAvailableWidgetsForSlot = (): DashboardWidget[] => {
    const usedWidgetKeys = new Set(widgetConfigs.map(c => c.widget_key))
    return availableWidgets.filter(w => !usedWidgetKeys.has(w.widget_key))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <LoadingGrid count={6} />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadDashboardData} variant="outline" className="parrot-button-primary">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!companyId) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertDescription>
            Please select a space to view the dashboard.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const widgetItems = getWidgetItems()
  const availableWidgetsForSlot = getAvailableWidgetsForSlot()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold parrot-gradient-text">
            {company ? `${company.name} Dashboard` : 'Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            Welcome back, {session?.user.name}! Here&apos;s your space overview.
          </p>
          {lastUpdated && (
            <p className="text-sm text-gray-500 mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button onClick={loadDashboardData} variant="outline" className="parrot-button-primary" disabled={saving}>
          <RefreshCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Customizable Widget Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard-grid">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr"
            >
              {widgetItems.map((item, index) => (
                <Draggable
                  key={item.id}
                  draggableId={item.id}
                  index={index}
                  isDragDisabled={item.isPlaceholder || !canConfigure}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`h-full ${snapshot.isDragging ? 'opacity-50 rotate-2' : ''} transition-opacity`}
                      style={provided.draggableProps.style}
                    >
                      {item.isPlaceholder ? (
                        <Card className="parrot-card-enhanced border-2 border-dashed border-gray-300 dark:border-gray-700 h-full flex items-center justify-center hover:border-primary transition-colors">
                          {canConfigure && availableWidgetsForSlot.length > 0 ? (
                            <Popover open={openPopoverId === item.id} onOpenChange={(open) => setOpenPopoverId(open ? item.id : null)}>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  className="flex flex-col items-center gap-2 h-auto p-6 text-gray-400 hover:text-primary"
                                >
                                  <Plus className="h-8 w-8" />
                                  <span className="text-sm">Add Widget</span>
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64">
                                <div className="space-y-1">
                                  <p className="text-sm font-semibold mb-2">Select a widget to add:</p>
                                  {availableWidgetsForSlot.map((widget) => (
                                    <Button
                                      key={widget.widget_key}
                                      variant="ghost"
                                      className="w-full justify-start text-left h-auto py-2"
                                      onClick={() => handleAddWidget(widget.widget_key, index)}
                                    >
                                      <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium">{widget.name}</span>
                                        {widget.description && (
                                          <span className="text-xs text-gray-500">{widget.description}</span>
                                        )}
                                      </div>
                                    </Button>
                                  ))}
                                </div>
                              </PopoverContent>
                            </Popover>
                          ) : (
                            <div className="flex flex-col items-center gap-2 text-gray-400">
                              <Plus className="h-8 w-8" />
                              <span className="text-sm">
                                {canConfigure ? 'No more widgets available' : 'Empty slot'}
                              </span>
                            </div>
                          )}
                        </Card>
                      ) : (
                        <div 
                          className={`relative group h-full flex flex-col ${canConfigure ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          {...(canConfigure ? {
                            ...provided.dragHandleProps,
                            onMouseDown: (e: React.MouseEvent) => {
                              // Don't start drag if clicking on interactive elements
                              const target = e.target as HTMLElement
                              const isInteractive = target.closest('button, a, input, textarea, select, [role="button"], [role="link"], [data-slot="card-action"]')
                              if (isInteractive) {
                                e.stopPropagation()
                                return
                              }
                              // Let the drag handle props handle the drag
                            },
                            onTouchStart: (e: React.TouchEvent) => {
                              // Don't start drag if touching interactive elements
                              const target = e.target as HTMLElement
                              const isInteractive = target.closest('button, a, input, textarea, select, [role="button"], [role="link"], [data-slot="card-action"]')
                              if (isInteractive) {
                                e.stopPropagation()
                                return
                              }
                              // Let the drag handle props handle the drag
                            }
                          } : {})}
                        >
                          {canConfigure && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveWidget(item.widgetConfig!.id)
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <div className="h-full flex flex-col [&>div]:h-full [&>div]:flex [&>div]:flex-col">
                            {renderWidget({
                              widgetConfig: item.widgetConfig!,
                              companyId: companyId!,
                              onNavigateToTab
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}