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
import { createLeadActivity, fetchLeads } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import type { Lead } from '@/lib/database-functions'

interface CreateActivityModalProps {
  isOpen: boolean
  onClose: () => void
  onActivityCreated: () => void
}

export default function CreateActivityModal({ 
  isOpen, 
  onClose, 
  onActivityCreated 
}: CreateActivityModalProps) {
  const { data: session } = useSession()
  const [activityType, setActivityType] = useState<string>('call')
  const [leadId, setLeadId] = useState<string>('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(() => {
    if (isOpen && session?.user?.company_id) {
      loadLeads()
    }
  }, [isOpen, session?.user?.company_id])

  const loadLeads = async () => {
    if (!session?.user?.company_id) return

    try {
      const result = await fetchLeads({ 
        spaceId: session.user.company_id 
      })

      if (result.success && result.leads) {
        setLeads(result.leads)
      }
    } catch (error) {
      console.error('Error loading leads:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!leadId) {
      toastError('Please select a lead')
      return
    }

    if (!description.trim()) {
      toastError('Please enter a description')
      return
    }

    setIsLoading(true)

    try {
      const result = await createLeadActivity({
        lead_id: leadId,
        activity_type: activityType,
        description: description.trim(),
      })

      if (result.success) {
        toastSuccess('Activity created successfully')
        // Reset form
        setActivityType('call')
        setLeadId('')
        setDescription('')
        
        onActivityCreated()
        onClose()
      } else {
        toastError(result.error || 'Failed to create activity')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while creating the activity')
    } finally {
      setIsLoading(false)
    }
  }

  const getLeadDisplayName = (lead: Lead) => {
    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
    return `${fullName}${lead.email ? ` (${lead.email})` : ''}`
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Activity</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead">Lead *</Label>
            <Select value={leadId} onValueChange={setLeadId} required>
              <SelectTrigger id="lead">
                <SelectValue placeholder="Select a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {getLeadDisplayName(lead)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activityType">Activity Type *</Label>
            <Select value={activityType} onValueChange={setActivityType} required>
              <SelectTrigger id="activityType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="task">Task</SelectItem>
                <SelectItem value="note">Note</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter activity description..."
              rows={4}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Activity'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
