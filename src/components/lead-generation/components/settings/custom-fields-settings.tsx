"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  fetchLeadCustomFields,
  createLeadCustomField,
  updateLeadCustomField,
  deleteLeadCustomField,
  type LeadCustomField,
} from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'
import { hasAdminPrivileges } from '@/lib/role-helpers'
import { Plus, Trash2, GripVertical } from 'lucide-react'

const FIELD_TYPES: { value: LeadCustomField['field_type']; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'boolean', label: 'Yes/No' },
  { value: 'select', label: 'Dropdown' },
  { value: 'multiselect', label: 'Multi-select' },
]

export function CustomFieldsSettings() {
  const { data: session } = useSession()
  const [fields, setFields] = useState<LeadCustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newFieldLabel, setNewFieldLabel] = useState('')
  const [newFieldType, setNewFieldType] = useState<LeadCustomField['field_type']>('text')
  const [newFieldOptions, setNewFieldOptions] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)

  const isAdmin = hasAdminPrivileges(session?.user?.role)
  const companyId = session?.user?.company_id

  useEffect(() => {
    loadFields()
  }, [companyId])

  const loadFields = async () => {
    if (!companyId) {
      setLoading(false)
      return
    }
    setLoading(true)
    const result = await fetchLeadCustomFields(companyId)
    if (result.success && result.fields) {
      setFields(result.fields)
    }
    setLoading(false)
  }

  const handleAddField = async () => {
    if (!newFieldLabel.trim() || !isAdmin) return

    setSaving(true)
    try {
      const options = newFieldOptions
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean)
      const result = await createLeadCustomField({
        space_id: companyId || undefined,
        field_name: newFieldLabel.replace(/\s+/g, '_').toLowerCase(),
        field_type: newFieldType,
        field_label: newFieldLabel.trim(),
        options: options.length > 0 ? options : undefined,
      })
      if (result.success) {
        toastSuccess('Custom field added')
        setNewFieldLabel('')
        setNewFieldType('text')
        setNewFieldOptions('')
        loadFields()
      } else {
        toastError(result.error || 'Failed to add field')
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to add field')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!isAdmin) return

    setSaving(true)
    try {
      const result = await deleteLeadCustomField(fieldId)
      if (result.success) {
        toastSuccess('Custom field removed')
        loadFields()
      } else {
        toastError(result.error || 'Failed to remove field')
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to remove field')
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground">Only admins can manage custom fields.</p>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading custom fields...</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Custom Fields</CardTitle>
          <CardDescription>
            Add custom fields to capture additional lead information. These fields appear when creating or editing leads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 flex-wrap items-end">
            <div className="space-y-2 flex-1 min-w-[180px]">
              <Label>Field label</Label>
              <Input
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                placeholder="e.g. Industry, Company Size"
              />
            </div>
            <div className="space-y-2 w-[140px]">
              <Label>Type</Label>
              <Select value={newFieldType} onValueChange={(v) => setNewFieldType(v as LeadCustomField['field_type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(newFieldType === 'select' || newFieldType === 'multiselect') && (
              <div className="space-y-2 flex-1 min-w-[200px]">
                <Label>Options (comma-separated)</Label>
                <Input
                  value={newFieldOptions}
                  onChange={(e) => setNewFieldOptions(e.target.value)}
                  placeholder="e.g. Small, Medium, Large"
                />
              </div>
            )}
            <Button onClick={handleAddField} disabled={saving || !newFieldLabel.trim()}>
              <Plus className="w-4 h-4 mr-2" />
              Add field
            </Button>
          </div>

          {fields.length > 0 && (
            <div className="space-y-2">
              <Label>Active custom fields</Label>
              <div className="space-y-2">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{field.field_label}</span>
                      <span className="text-sm text-muted-foreground">({field.field_type})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteField(field.id)}
                      disabled={saving}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {fields.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No custom fields yet. Add fields above to capture extra lead data.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
