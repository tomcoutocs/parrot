'use client'

import { useState, useEffect } from 'react'
import { Settings, GripVertical, Loader2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toastSuccess, toastError } from '@/lib/toast'
import { 
  fetchDashboardWidgets, 
  fetchSpaceDashboardConfig, 
  saveSpaceDashboardConfig 
} from '@/lib/simplified-database-functions'
import type { DashboardWidget, SpaceDashboardConfig } from '@/lib/supabase'

interface DashboardConfigModalProps {
  isOpen: boolean
  onClose: () => void
  companyId: string
  onConfigSaved?: () => void
}

interface WidgetConfigItem {
  widget: DashboardWidget
  enabled: boolean
  position: number
  config: Record<string, unknown>
}

export default function DashboardConfigModal({
  isOpen,
  onClose,
  companyId,
  onConfigSaved
}: DashboardConfigModalProps) {
  const [widgets, setWidgets] = useState<DashboardWidget[]>([])
  const [widgetConfigs, setWidgetConfigs] = useState<WidgetConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadConfig()
    }
  }, [isOpen, companyId])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const [allWidgets, spaceConfig] = await Promise.all([
        fetchDashboardWidgets(),
        fetchSpaceDashboardConfig(companyId)
      ])

      setWidgets(allWidgets)

      // Create config items from widgets and space config
      const configs: WidgetConfigItem[] = allWidgets.map((widget) => {
        const spaceWidgetConfig = spaceConfig.find(
          (sc) => sc.widget_key === widget.widget_key
        )
        return {
          widget,
          enabled: spaceWidgetConfig?.enabled ?? widget.default_enabled,
          position: spaceWidgetConfig?.position ?? allWidgets.indexOf(widget),
          config: spaceWidgetConfig?.config ?? widget.default_config
        }
      })

      // Sort by position
      configs.sort((a, b) => a.position - b.position)
      setWidgetConfigs(configs)
    } catch (err) {
      console.error('Error loading dashboard config:', err)
      toastError('Failed to load dashboard configuration', {
        description: err instanceof Error ? err.message : 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWidget = (widgetKey: string) => {
    setWidgetConfigs((prev) =>
      prev.map((item) =>
        item.widget.widget_key === widgetKey
          ? { ...item, enabled: !item.enabled }
          : item
      )
    )
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newConfigs = [...widgetConfigs]
    const temp = newConfigs[index]
    newConfigs[index] = newConfigs[index - 1]
    newConfigs[index - 1] = temp
    // Update positions
    newConfigs.forEach((item, i) => {
      item.position = i
    })
    setWidgetConfigs(newConfigs)
  }

  const handleMoveDown = (index: number) => {
    if (index === widgetConfigs.length - 1) return
    const newConfigs = [...widgetConfigs]
    const temp = newConfigs[index]
    newConfigs[index] = newConfigs[index + 1]
    newConfigs[index + 1] = temp
    // Update positions
    newConfigs.forEach((item, i) => {
      item.position = i
    })
    setWidgetConfigs(newConfigs)
  }

  const handleSave = async () => {
    setSaving(true)

    try {
      const configsToSave = widgetConfigs.map((item) => ({
        widget_key: item.widget.widget_key,
        enabled: item.enabled,
        position: item.position,
        config: item.config
      }))

      const result = await saveSpaceDashboardConfig(companyId, configsToSave)

      if (result.success) {
        toastSuccess('Dashboard configuration saved successfully')
        onConfigSaved?.()
        onClose()
      } else {
        toastError(result.error || 'Failed to save configuration')
      }
    } catch (err) {
      console.error('Error saving dashboard config:', err)
      toastError('An error occurred while saving', {
        description: err instanceof Error ? err.message : 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  const enabledWidgets = widgetConfigs.filter((item) => item.enabled)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Dashboard Configuration
          </DialogTitle>
          <DialogDescription>
            Customize which widgets appear on the dashboard and their order. Drag or use arrows to reorder.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              {widgetConfigs.map((item, index) => (
                <Card
                  key={item.widget.widget_key}
                  className={`parrot-card-enhanced ${
                    item.enabled ? 'border-primary' : 'opacity-60'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveUp(index)}
                            disabled={index === 0}
                          >
                            ↑
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleMoveDown(index)}
                            disabled={index === widgetConfigs.length - 1}
                          >
                            ↓
                          </Button>
                        </div>
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        <div className="flex-1">
                          <CardTitle className="text-base">{item.widget.name}</CardTitle>
                          {item.widget.description && (
                            <p className="text-sm text-gray-500 mt-1">
                              {item.widget.description}
                            </p>
                          )}
                          {item.enabled && (
                            <Badge variant="secondary" className="mt-2">
                              Position: {item.position + 1}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Label htmlFor={`widget-${item.widget.widget_key}`} className="cursor-pointer">
                            Enable
                          </Label>
                          <Switch
                            id={`widget-${item.widget.widget_key}`}
                            checked={item.enabled}
                            onCheckedChange={() => handleToggleWidget(item.widget.widget_key)}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert>
              <AlertDescription>
                <strong>{enabledWidgets.length}</strong> widget{enabledWidgets.length !== 1 ? 's' : ''} will be displayed on the dashboard.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

