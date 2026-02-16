"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { updateLead, fetchLeadStages, fetchReferralClients, fetchLeadCustomFields, type Lead, type LeadStage, type ReferralClient, type LeadCustomField } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

interface EditLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadUpdated: () => void
  lead: Lead | null
}

// Default source options (hardcoded list)
const defaultSources = [
  { id: 'website', name: 'Website' },
  { id: 'referral', name: 'Referral' },
  { id: 'email', name: 'Email' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'social_media', name: 'Social Media' },
  { id: 'advertising', name: 'Advertising' },
  { id: 'event', name: 'Event' },
  { id: 'other', name: 'Other' },
]

export default function EditLeadModal({ 
  isOpen, 
  onClose, 
  onLeadUpdated,
  lead
}: EditLeadModalProps) {
  const { data: session } = useSession()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [stageId, setStageId] = useState<string>('')
  const [sourceId, setSourceId] = useState<string>('none')
  const [score, setScore] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [referralId, setReferralId] = useState<string>('none')
  const [isLoading, setIsLoading] = useState(false)
  const [stages, setStages] = useState<LeadStage[]>([])
  const [referrals, setReferrals] = useState<ReferralClient[]>([])
  const [customFields, setCustomFields] = useState<LeadCustomField[]>([])
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string | number | boolean>>({})
  const sources = defaultSources

  const companyId = session?.user?.company_id

  // Initialize form data when modal opens or lead changes
  useEffect(() => {
    if (isOpen && lead) {
      setFirstName(lead.first_name || '')
      setLastName(lead.last_name || '')
      setEmail(lead.email || '')
      setPhone(lead.phone || '')
      setJobTitle(lead.job_title || '')
      setStageId(lead.stage_id || '')
      setSourceId((lead.custom_fields as any)?.source_type || 'none')
      setReferralId(lead.referral_id || 'none')
      setScore(lead.score || 0)
      setNotes(lead.notes || '')
      const cf = (lead.custom_fields as Record<string, unknown>) || {}
      const vals: Record<string, string | number | boolean> = {}
      Object.entries(cf).forEach(([k, v]) => {
        if (k !== 'source_type' && v !== null && v !== undefined) {
          vals[k] = v as string | number | boolean
        }
      })
      setCustomFieldValues(vals)
    }
  }, [isOpen, lead])

  useEffect(() => {
    const loadData = async () => {
      if (!companyId) return

      try {
        const stagesResult = await fetchLeadStages(companyId)
        if (stagesResult.success && stagesResult.stages) {
          setStages(stagesResult.stages.sort((a, b) => a.stage_order - b.stage_order))
        }

        const referralsResult = await fetchReferralClients(companyId)
        if (referralsResult.success && referralsResult.referrals) {
          setReferrals(referralsResult.referrals.filter(r => r.is_active))
        }

        const customFieldsResult = await fetchLeadCustomFields(companyId)
        if (customFieldsResult.success && customFieldsResult.fields) {
          setCustomFields(customFieldsResult.fields)
        }
      } catch (error: any) {
        console.error('Error loading data:', error)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, companyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lead) return

    setIsLoading(true)

    try {
      const customFieldsPayload: Record<string, unknown> = {
        ...(sourceId && sourceId !== 'none' ? { source_type: sourceId } : {}),
        ...customFieldValues,
      }

      const result = await updateLead(lead.id, {
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        stage_id: stageId || undefined,
        referral_id: referralId && referralId !== 'none' ? referralId : undefined,
        custom_fields: customFieldsPayload,
        score: score || 0,
        notes: notes.trim() || undefined,
      })

      if (result.success) {
        toastSuccess('Lead updated successfully')
        onLeadUpdated()
        onClose()
      } else {
        toastError(result.error || 'Failed to update lead')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while updating the lead')
    } finally {
      setIsLoading(false)
    }
  }

  if (!lead) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="John"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Job Title</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="CEO"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="score">Lead Score (0-100)</Label>
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="stage">Stage</Label>
              <Select value={stageId} onValueChange={setStageId} disabled={stages.length === 0}>
                <SelectTrigger id="stage">
                  <SelectValue placeholder={stages.length > 0 ? "Select stage" : "No stages available"} />
                </SelectTrigger>
                <SelectContent>
                  {stages.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">Source</Label>
              <Select value={sourceId} onValueChange={(value) => setSourceId(value)}>
                <SelectTrigger id="source">
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {sources.map((source) => (
                    <SelectItem key={source.id} value={source.id}>
                      {source.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="referral">Referral Client</Label>
              <Select value={referralId} onValueChange={(value) => setReferralId(value)}>
                <SelectTrigger id="referral">
                  <SelectValue placeholder="Select referral client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {referrals.map((referral) => (
                    <SelectItem key={referral.id} value={referral.id}>
                      {referral.name} {referral.company_name ? `(${referral.company_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {customFields.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Custom Fields</h4>
              <div className="grid grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={`cf-${field.field_name}`}>
                      {field.field_label}
                      {field.is_required && <span className="text-destructive"> *</span>}
                    </Label>
                    {field.field_type === 'text' && (
                      <Input
                        id={`cf-${field.field_name}`}
                        value={(customFieldValues[field.field_name] as string) || ''}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                        }
                        placeholder={field.field_label}
                      />
                    )}
                    {field.field_type === 'number' && (
                      <Input
                        id={`cf-${field.field_name}`}
                        type="number"
                        value={(customFieldValues[field.field_name] as number) ?? ''}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({
                            ...prev,
                            [field.field_name]: parseFloat(e.target.value) || 0,
                          }))
                        }
                      />
                    )}
                    {field.field_type === 'date' && (
                      <Input
                        id={`cf-${field.field_name}`}
                        type="date"
                        value={(customFieldValues[field.field_name] as string) || ''}
                        onChange={(e) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                        }
                      />
                    )}
                    {field.field_type === 'boolean' && (
                      <Select
                        value={(customFieldValues[field.field_name] as boolean)?.toString() || 'false'}
                        onValueChange={(v) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.field_name]: v === 'true' }))
                        }
                      >
                        <SelectTrigger id={`cf-${field.field_name}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="false">No</SelectItem>
                          <SelectItem value="true">Yes</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {(field.field_type === 'select' || field.field_type === 'multiselect') && (
                      <Select
                        value={(customFieldValues[field.field_name] as string) || ''}
                        onValueChange={(v) =>
                          setCustomFieldValues((prev) => ({ ...prev, [field.field_name]: v }))
                        }
                      >
                        <SelectTrigger id={`cf-${field.field_name}`}>
                          <SelectValue placeholder={`Select ${field.field_label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {(field.options as string[] || []).map((opt) => (
                            <SelectItem key={opt} value={opt}>
                              {opt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this lead..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Updating...' : 'Update Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
