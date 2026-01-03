"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, AlertCircle } from 'lucide-react'
import { createSupportTicket } from '@/lib/support-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'

interface SupportTicketModalProps {
  isOpen: boolean
  onClose: () => void
  spaceId?: string | null
}

export function SupportTicketModal({ isOpen, onClose, spaceId }: SupportTicketModalProps) {
  const { data: session } = useSession()
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) {
      toastError('Subject and description are required')
      return
    }

    setSubmitting(true)
    try {
      const result = await createSupportTicket(
        { subject: subject.trim(), description: description.trim(), priority },
        spaceId || undefined
      )
      if (result.success) {
        toastSuccess('Support ticket created successfully. We\'ll get back to you soon!')
        setSubject('')
        setDescription('')
        setPriority('normal')
        onClose()
      } else {
        toastError(result.error || 'Failed to create ticket')
      }
    } catch (error) {
      console.error('Error creating ticket:', error)
      toastError('Failed to create ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getSLAText = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return '2 hours'
      case 'high':
        return '4 hours'
      case 'normal':
        return '24 hours'
      case 'low':
        return '48 hours'
      default:
        return '24 hours'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            Report an issue or request help. We'll respond within {getSLAText(priority)}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Please provide detailed information about the issue, including steps to reproduce if applicable..."
              rows={6}
              required
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select 
              value={priority} 
              onValueChange={(value: 'low' | 'normal' | 'high' | 'urgent') => setPriority(value)}
              disabled={submitting}
            >
              <SelectTrigger id="priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low - General inquiry (48h SLA)</SelectItem>
                <SelectItem value="normal">Normal - Standard issue (24h SLA)</SelectItem>
                <SelectItem value="high">High - Urgent issue (4h SLA)</SelectItem>
                <SelectItem value="urgent">Urgent - Critical issue (2h SLA)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Response time: {getSLAText(priority)}
            </p>
          </div>
          {session?.user?.email && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium">From:</span> {session.user.email}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !subject.trim() || !description.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Ticket'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

