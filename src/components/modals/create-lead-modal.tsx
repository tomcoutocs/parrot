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
import { createLead, fetchLeadStages, getLeadCustomizationSettings } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LeadStage, LeadSource } from '@/lib/database-functions'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadCreated: () => void
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

export default function CreateLeadModal({ 
  isOpen, 
  onClose, 
  onLeadCreated 
}: CreateLeadModalProps) {
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
  const [isLoading, setIsLoading] = useState(false)
  const [stages, setStages] = useState<LeadStage[]>([])
  // Sources are hardcoded - no need to fetch from database
  const sources = defaultSources

  // Get stable references for dependencies
  const userId = session?.user?.id
  const companyId = session?.user?.company_id

  useEffect(() => {
    const loadData = async () => {
      if (!userId) {
        console.log('Waiting for session user ID...')
        return
      }

      // Reset stages while loading
      setStages([])
      setStageId('')

      try {
        // Fetch customization settings to get the stages template (global)
        const settingsResult = await getLeadCustomizationSettings()
        const template = settingsResult.success && settingsResult.data?.default_stages_template 
          ? settingsResult.data.default_stages_template 
          : 'standard'

        console.log('Template from settings:', template, 'Settings result:', settingsResult)

        const stagesResult = await fetchLeadStages(companyId || undefined)
        console.log('Stages fetch result:', {
          success: stagesResult.success,
          stagesCount: stagesResult.stages?.length || 0,
          error: stagesResult.error,
          stageNames: stagesResult.stages?.map(s => s.name) || []
        })

        // Always use stages from database (settings)
        // fetchLeadStages will create default stages if none exist
        if (stagesResult.success && stagesResult.stages && stagesResult.stages.length > 0) {
          // Remove duplicates by name (keep the first occurrence)
          const uniqueStagesMap = new Map<string, LeadStage>()
          stagesResult.stages.forEach(stage => {
            const stageNameLower = stage.name.toLowerCase().trim()
            if (!uniqueStagesMap.has(stageNameLower)) {
              uniqueStagesMap.set(stageNameLower, stage)
            } else {
              console.warn(`Duplicate stage found: "${stage.name}" (ID: ${stage.id}). Keeping first occurrence.`)
            }
          })
          
          const uniqueStages = Array.from(uniqueStagesMap.values())
          console.log('After deduplication:', {
            originalCount: stagesResult.stages.length,
            uniqueCount: uniqueStages.length,
            duplicates: stagesResult.stages.length - uniqueStages.length
          })
          
          let filteredStages = [...uniqueStages]

          // Filter stages based on template setting
          console.log('All stages before filtering:', uniqueStages.map(s => ({ name: s.name, lower: s.name.toLowerCase().trim() })))
          
          if (template === 'simple') {
            // Simple template: New, Qualified, Closed Won, Closed Lost
            const simpleStageNames = ['new', 'qualified', 'closed won', 'closed lost']
            filteredStages = uniqueStages.filter(stage => {
              const stageNameLower = stage.name.toLowerCase().trim()
              const matches = simpleStageNames.includes(stageNameLower)
              if (!matches) {
                console.log(`Stage "${stage.name}" (${stageNameLower}) not in simple template`)
              }
              return matches
            })
            console.log('Filtered stages (simple):', filteredStages.map(s => s.name))
          } else if (template === 'standard') {
            // Standard template: New, Contacted, Qualified, Proposal, Closed Won, Closed Lost
            // Include Negotiation if it exists
            const standardStageNames = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'closed won', 'closed lost']
            filteredStages = stagesResult.stages.filter(stage => {
              const stageNameLower = stage.name.toLowerCase().trim()
              const matches = standardStageNames.includes(stageNameLower)
              if (!matches) {
                console.log(`Stage "${stage.name}" (${stageNameLower}) not in standard template`)
              }
              return matches
            })
            console.log('Filtered stages (standard):', filteredStages.map(s => s.name))
          } else if (template === 'custom') {
            // For 'custom', show all stages (no filtering)
            console.log('Using all stages (custom):', filteredStages.map(s => s.name))
          }

          // Sort stages by stage_order
          filteredStages.sort((a, b) => a.stage_order - b.stage_order)

          console.log('Final stages to display:', filteredStages.map(s => ({ name: s.name, order: s.stage_order })))

          if (filteredStages.length === 0) {
            console.warn('No stages match the template filter. Showing all stages as fallback.')
            filteredStages = uniqueStages.sort((a, b) => a.stage_order - b.stage_order)
          }

          // Final check - if still no stages, log a warning
          if (filteredStages.length === 0) {
            console.error('CRITICAL: No stages available after all filtering!')
            console.error('Template:', template)
            console.error('All stages from DB:', stagesResult.stages.map(s => s.name))
            console.error('This should not happen - stages should have been created')
          }

          console.log('Setting stages in component:', filteredStages.length, filteredStages.map(s => s.name))
          console.log('Stage IDs:', filteredStages.map(s => s.id))
          
          // Verify stages have valid IDs
          const validStages = filteredStages.filter(s => s.id && s.name)
          console.log('Valid stages (with ID and name):', validStages.length, validStages.map(s => ({ id: s.id, name: s.name })))
          
          setStages(validStages)
          
          // Set default stage (first one or "New")
          const defaultStage = validStages.find(s => s.name.toLowerCase().trim() === 'new') || validStages[0]
          if (defaultStage) {
            console.log('Setting default stage:', defaultStage.name, defaultStage.id)
            setStageId(defaultStage.id)
          } else {
            console.warn('No default stage found - valid stages:', validStages)
            setStageId('')
          }
        } else {
          // If fetch failed, show error but don't use hardcoded stages
          console.error('Failed to load stages from settings:', {
            success: stagesResult.success,
            error: stagesResult.error,
            stagesCount: stagesResult.stages?.length || 0,
            companyId: companyId,
            userId: userId
          })
          
          // Show more detailed error message
          const errorMsg = stagesResult.error || 'Failed to load stages'
          console.error('Full error details:', stagesResult)
          
          // If no stages but no error, try to create default stages manually
          if (!stagesResult.error && (!stagesResult.stages || stagesResult.stages.length === 0)) {
            console.log('No stages found and no error - stages may need to be created')
            toastError('No stages found. Please check settings or contact an admin.')
          } else {
            toastError(errorMsg)
          }
          
          setStages([])
          setStageId('')
        }
      } catch (error: any) {
        console.error('Error loading stages:', error)
        toastError(error.message || 'Failed to load stages')
        setStages([])
        setStageId('')
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, userId, companyId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (!session?.user?.id) {
      toastError('User session not found')
      setIsLoading(false)
      return
    }

    try {
      const result = await createLead({
        space_id: session.user.company_id,
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        stage_id: stageId || undefined,
        source_id: undefined, // Sources are hardcoded, store type in custom_fields instead
        custom_fields: sourceId && sourceId !== 'none' ? { source_type: sourceId } : {},
        score: score || 0,
        notes: notes.trim() || undefined,
        status: 'new',
      })

      if (result.success) {
        toastSuccess('Lead created successfully')
        // Reset form
        setFirstName('')
        setLastName('')
        setEmail('')
        setPhone('')
        setJobTitle('')
        setSourceId('none')
        setScore(0)
        setNotes('')
        
        onLeadCreated()
        onClose()
      } else {
        toastError(result.error || 'Failed to create lead')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while creating the lead')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Lead</DialogTitle>
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
              {stages.length === 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  No stages found. Please check settings or contact an admin.
                </p>
              )}
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
          </div>

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
              {isLoading ? 'Creating...' : 'Create Lead'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

