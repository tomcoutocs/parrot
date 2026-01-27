"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { 
  getLeadCustomizationSettings, 
  saveLeadCustomizationSettings,
  fetchLeadStages,
  createLeadStage,
  updateLeadStage,
  deleteLeadStage,
  type LeadStage
} from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'
import { getCurrentUser } from '@/lib/auth'
import { hasAdminPrivileges } from '@/lib/role-helpers'
import { Plus, Trash2, GripVertical } from 'lucide-react'

export function CustomizationSettings() {
  const { data: session, status } = useSession()
  const [settings, setSettings] = useState({
    primary_color: '#3b82f6',
    logo_url: '',
    company_name: '',
    default_thank_you_message: '',
    default_redirect_url: '',
    default_stages_template: 'standard',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [stages, setStages] = useState<LeadStage[]>([])
  const [editingStage, setEditingStage] = useState<LeadStage | null>(null)
  const [newStageName, setNewStageName] = useState('')
  const [loadingStages, setLoadingStages] = useState(false)

  // Check if user is admin
  const isAdmin = hasAdminPrivileges(session?.user?.role)

  useEffect(() => {
    const loadSettings = async () => {
      // Wait for session to load
      if (status === 'loading') {
        return
      }

      // Check if user is admin
      if (!isAdmin) {
        setLoading(false)
        return
      }

      // Check if user is authenticated
      if (!session?.user && !getCurrentUser()) {
        console.warn('No user found:', { session, status })
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await getLeadCustomizationSettings()
      
      if (result.success && result.data) {
        setSettings({
          primary_color: result.data.primary_color || '#3b82f6',
          logo_url: result.data.logo_url || '',
          company_name: result.data.company_name || '',
          default_thank_you_message: result.data.default_thank_you_message || '',
          default_redirect_url: result.data.default_redirect_url || '',
          default_stages_template: result.data.default_stages_template || 'standard',
        })
      }
      setLoading(false)
    }

    loadSettings()
  }, [status, isAdmin])

  useEffect(() => {
    const loadStages = async () => {
      if (settings.default_stages_template !== 'custom') {
        setStages([])
        return
      }

      // Get company_id for fetching stages (stages are still space-specific)
      const companyId = session?.user?.company_id || getCurrentUser()?.companyId
      if (!companyId) {
        setStages([])
        return
      }

      setLoadingStages(true)
      const result = await fetchLeadStages(companyId)
      if (result.success && result.stages) {
        setStages(result.stages.sort((a, b) => a.stage_order - b.stage_order))
      }
      setLoadingStages(false)
    }

    loadStages()
  }, [session?.user?.company_id, settings.default_stages_template])

  const handleSave = async () => {
    // Check if user is admin
    if (!isAdmin) {
      toastError('Only admins can save settings')
      return
    }

    // Check session status
    if (status === 'loading') {
      toastError('Please wait for session to load')
      return
    }

    // Check if user is authenticated
    if (!session?.user && !getCurrentUser()) {
      toastError('Please log in to save settings')
      return
    }

    setSaving(true)
    try {
      const result = await saveLeadCustomizationSettings(settings)

      if (result.success) {
        toastSuccess('Customization settings saved successfully')
      } else {
        toastError(result.error || 'Failed to save settings')
      }
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toastError(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleAddStage = async () => {
    const companyId = session?.user?.company_id || getCurrentUser()?.companyId
    if (!newStageName.trim() || !companyId) return

    const result = await createLeadStage({
      space_id: companyId,
      name: newStageName.trim(),
      stage_order: stages.length,
      is_default: false,
    })

    if (result.success && result.stage) {
      setStages([...stages, result.stage])
      setNewStageName('')
      toastSuccess('Stage added successfully')
    } else {
      toastError(result.error || 'Failed to add stage')
    }
  }

  const handleDeleteStage = async (stageId: string) => {
    if (!confirm('Are you sure you want to delete this stage?')) return

    const result = await deleteLeadStage(stageId)
    if (result.success) {
      setStages(stages.filter(s => s.id !== stageId))
      toastSuccess('Stage deleted successfully')
    } else {
      toastError(result.error || 'Failed to delete stage')
    }
  }

  const handleUpdateStageOrder = async (stageId: string, newOrder: number) => {
    const companyId = session?.user?.company_id || getCurrentUser()?.companyId
    const result = await updateLeadStage(stageId, { stage_order: newOrder })
    if (result.success && companyId) {
      // Reload stages to get updated order
      const stagesResult = await fetchLeadStages(companyId)
      if (stagesResult.success && stagesResult.stages) {
        setStages(stagesResult.stages.sort((a, b) => a.stage_order - b.stage_order))
      }
    }
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>You do not have permission to access settings.</p>
        <p className="text-sm mt-2">Only administrators can view and modify settings.</p>
      </div>
    )
  }

  if (status === 'loading' || loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading customization settings...</div>
    )
  }

  // Check if user is authenticated
  if (!session?.user && !getCurrentUser()) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-4">Unable to load settings: Please log in</p>
        <p className="text-sm text-muted-foreground">
          Please refresh the page or contact support if this issue persists.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
          <CardDescription>
            Customize the appearance of your forms and emails
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary Color</Label>
            <Input 
              type="color" 
              value={settings.primary_color}
              onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
              className="w-20 h-10" 
            />
          </div>
          <div className="space-y-2">
            <Label>Logo URL</Label>
            <Input 
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png" 
            />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input 
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              placeholder="Your Company" 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Form Defaults</CardTitle>
          <CardDescription>
            Set default values for new forms
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Thank You Message</Label>
            <Textarea
              value={settings.default_thank_you_message}
              onChange={(e) => setSettings({ ...settings, default_thank_you_message: e.target.value })}
              placeholder="Thank you for your interest! We'll be in touch soon."
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label>Default Redirect URL</Label>
            <Input 
              value={settings.default_redirect_url}
              onChange={(e) => setSettings({ ...settings, default_redirect_url: e.target.value })}
              placeholder="https://example.com/thank-you" 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pipeline Stages</CardTitle>
          <CardDescription>
            Customize your lead pipeline stages
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default Stages Template</Label>
            <Select 
              value={settings.default_stages_template}
              onValueChange={(value) => setSettings({ ...settings, default_stages_template: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (New, Contacted, Qualified, Proposal, Closed)</SelectItem>
                <SelectItem value="simple">Simple (New, Qualified, Closed)</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {settings.default_stages_template === 'custom' && (
            <div className="space-y-4 border-t pt-4 mt-4">
              <div className="space-y-2">
                <Label>Custom Stages</Label>
                <p className="text-sm text-muted-foreground">
                  Add and manage your custom pipeline stages
                </p>
              </div>

              {loadingStages ? (
                <div className="text-center py-4 text-muted-foreground">Loading stages...</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {stages.map((stage, index) => (
                      <div
                        key={stage.id}
                        className="flex items-center gap-2 p-3 border rounded-lg bg-card"
                      >
                        <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                        <div className="flex-1">
                          <div className="font-medium">{stage.name}</div>
                          {stage.description && (
                            <div className="text-sm text-muted-foreground">{stage.description}</div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStage(stage.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Stage name (e.g., Discovery, Demo, Contract)"
                      value={newStageName}
                      onChange={(e) => setNewStageName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddStage()
                        }
                      }}
                    />
                    <Button onClick={handleAddStage} disabled={!newStageName.trim()}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Stage
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Customization'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

