"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchLeadScoringRules, createLeadScoringRule, updateLeadScoringRule, deleteLeadScoringRule, type LeadScoringRule } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

interface ScoringRuleForm {
  id?: string
  criteria_type: string
  condition: string
  value: string
  points: number
}

export function ScoringSettings() {
  const { data: session } = useSession()
  const [rules, setRules] = useState<LeadScoringRule[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadRules = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      const result = await fetchLeadScoringRules(session.user.company_id)

      if (result.success && result.rules) {
        setRules(result.rules)
      }
      setLoading(false)
    }

    loadRules()
  }, [session?.user?.id, session?.user?.company_id])

  const addRule = () => {
    setRules([...rules, {
      id: `temp-${Date.now()}`,
      user_id: session?.user?.id || '',
      name: 'New Rule',
      criteria_type: 'email_domain',
      condition: 'contains',
      value: '',
      points: 0,
      is_active: true,
      rule_order: rules.length,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as LeadScoringRule])
  }

  const removeRule = async (ruleId: string) => {
    if (ruleId.startsWith('temp-')) {
      setRules(rules.filter(r => r.id !== ruleId))
      return
    }

    const result = await deleteLeadScoringRule(ruleId)
    if (result.success) {
      toastSuccess('Rule deleted')
      setRules(rules.filter(r => r.id !== ruleId))
    } else {
      toastError(result.error || 'Failed to delete rule')
    }
  }

  const updateRule = (ruleId: string, updates: Partial<LeadScoringRule>) => {
    setRules(rules.map(r => r.id === ruleId ? { ...r, ...updates } : r))
  }

  const handleSave = async () => {
    if (!session?.user?.id) {
      toastError('You must be logged in to save rules')
      return
    }

    setSaving(true)
    try {
      // Save all rules
      for (const rule of rules) {
        if (rule.id?.startsWith('temp-')) {
          // Generate a name from the criteria
          const criteriaLabels: Record<string, string> = {
            email_domain: 'Email Domain',
            company_size: 'Company Size',
            industry: 'Industry',
            job_title: 'Job Title',
            page_visited: 'Page Visited',
          }
          const conditionLabels: Record<string, string> = {
            contains: 'contains',
            equals: 'equals',
            greater_than: '>',
            less_than: '<',
            starts_with: 'starts with',
            ends_with: 'ends with',
          }
          const name = `${criteriaLabels[rule.criteria_type] || rule.criteria_type} ${conditionLabels[rule.condition] || rule.condition} ${rule.value || 'value'}`
          
          // Create new rule
          const result = await createLeadScoringRule({
            space_id: session.user.company_id,
            name: name,
            criteria_type: rule.criteria_type,
            condition: rule.condition,
            value: rule.value,
            points: rule.points,
            rule_order: rule.rule_order,
          })
          if (!result.success) {
            throw new Error(result.error || 'Failed to create rule')
          }
        } else {
          // Update existing rule
          const result = await updateLeadScoringRule(rule.id, {
            criteria_type: rule.criteria_type,
            condition: rule.condition,
            value: rule.value,
            points: rule.points,
          })
          if (!result.success) {
            throw new Error(result.error || 'Failed to update rule')
          }
        }
      }

      toastSuccess('Scoring rules saved successfully')
      // Reload rules
      const result = await fetchLeadScoringRules(session.user.company_id)
      if (result.success && result.rules) {
        setRules(result.rules)
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to save scoring rules')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading scoring rules...</div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Lead Scoring Rules</CardTitle>
          <CardDescription>
            Configure how leads are scored automatically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No scoring rules configured. Add your first rule to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-2">
                    <Select 
                      value={rule.criteria_type} 
                      onValueChange={(value) => updateRule(rule.id!, { criteria_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email_domain">Email Domain</SelectItem>
                        <SelectItem value="company_size">Company Size</SelectItem>
                        <SelectItem value="industry">Industry</SelectItem>
                        <SelectItem value="job_title">Job Title</SelectItem>
                        <SelectItem value="page_visited">Page Visited</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select 
                      value={rule.condition} 
                      onValueChange={(value) => updateRule(rule.id!, { condition: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="greater_than">Greater than</SelectItem>
                        <SelectItem value="less_than">Less than</SelectItem>
                        <SelectItem value="starts_with">Starts with</SelectItem>
                        <SelectItem value="ends_with">Ends with</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input 
                      value={rule.value} 
                      onChange={(e) => updateRule(rule.id!, { value: e.target.value })}
                      placeholder="Value" 
                    />
                    <Input 
                      type="number" 
                      value={rule.points} 
                      onChange={(e) => updateRule(rule.id!, { points: parseInt(e.target.value) || 0 })}
                      placeholder="Points" 
                    />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeRule(rule.id!)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" onClick={addRule}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
          <div className="pt-4 border-t">
            <Button variant="outline" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Scoring Rules'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

