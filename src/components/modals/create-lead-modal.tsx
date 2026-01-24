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
import { createLead, fetchLeadStages, fetchLeadSources } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import type { LeadStage, LeadSource } from '@/lib/database-functions'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadCreated: () => void
}

// Default stage options
const defaultStages = [
  { id: 'new', name: 'New' },
  { id: 'qualified', name: 'Qualified' },
  { id: 'contacted', name: 'Contacted' },
  { id: 'proposal', name: 'Proposal' },
  { id: 'negotiation', name: 'Negotiation' },
  { id: 'closed-won', name: 'Closed Won' },
  { id: 'closed-lost', name: 'Closed Lost' },
]

// Default source options
const defaultSources = [
  { id: 'website', name: 'Website' },
  { id: 'referral', name: 'Referral' },
  { id: 'cold-call', name: 'Cold Call' },
  { id: 'social-media', name: 'Social Media' },
  { id: 'advertisement', name: 'Advertisement' },
  { id: 'webinar', name: 'Webinar' },
  { id: 'event', name: 'Event' },
  { id: 'partner', name: 'Partner' },
  { id: 'email-campaign', name: 'Email Campaign' },
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
  const [sources, setSources] = useState<LeadSource[]>([])

  useEffect(() => {
    const loadData = async () => {
      if (!session?.user?.id) return

      const stagesResult = await fetchLeadStages(session.user.company_id)
      const sourcesResult = await fetchLeadSources(session.user.company_id)

      // Use database stages if available, otherwise use defaults
      if (stagesResult.success && stagesResult.stages && stagesResult.stages.length > 0) {
        setStages(stagesResult.stages)
        // Set default stage (first one or "New")
        const defaultStage = stagesResult.stages.find(s => s.name.toLowerCase() === 'new') || stagesResult.stages[0]
        if (defaultStage) {
          setStageId(defaultStage.id)
        }
      } else {
        // Use default stages
        setStages(defaultStages as LeadStage[])
        setStageId('new')
      }

      // Use database sources if available, otherwise use defaults
      if (sourcesResult.success && sourcesResult.sources && sourcesResult.sources.length > 0) {
        setSources(sourcesResult.sources)
      } else {
        // Use default sources
        setSources(defaultSources as LeadSource[])
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen, session])

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
        source_id: sourceId && sourceId !== 'none' ? sourceId : undefined,
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
              <Select value={stageId} onValueChange={setStageId}>
                <SelectTrigger id="stage">
                  <SelectValue placeholder="Select stage" />
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

