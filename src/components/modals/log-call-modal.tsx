"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchLeads, createLeadActivity, createLead, type Lead } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { Phone } from 'lucide-react'

interface LogCallModalProps {
  isOpen: boolean
  onClose: () => void
  onCallLogged?: () => void
  initialContactId?: string
}

export default function LogCallModal({ 
  isOpen, 
  onClose, 
  onCallLogged,
  initialContactId 
}: LogCallModalProps) {
  const { data: session } = useSession()
  const [contactId, setContactId] = useState<string>(initialContactId || '')
  const [callType, setCallType] = useState<'call_made' | 'call_received'>('call_made')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [outcome, setOutcome] = useState('')
  const [contacts, setContacts] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [manualContactName, setManualContactName] = useState('')
  const [manualContactPhone, setManualContactPhone] = useState('')
  const [manualContactEmail, setManualContactEmail] = useState('')
  const [useManualContact, setUseManualContact] = useState(false)

  useEffect(() => {
    if (isOpen && session?.user?.company_id) {
      loadContacts()
      if (initialContactId) {
        setContactId(initialContactId)
      }
    }
  }, [isOpen, session?.user?.company_id, initialContactId])

  const loadContacts = async () => {
    if (!session?.user?.company_id) return

    try {
      setLoadingContacts(true)
      const result = await fetchLeads({ spaceId: session.user.company_id })
      if (result.success && result.leads) {
        setContacts(result.leads)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoadingContacts(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!description.trim()) {
      toastError('Please enter a description')
      return
    }

    setLoading(true)
    try {
      let finalContactId = contactId

      // If no contact selected and manual contact info provided, create a new lead
      if (!contactId && useManualContact) {
        if (!manualContactName.trim() && !manualContactPhone.trim() && !manualContactEmail.trim()) {
          toastError('Please select a contact or enter contact information')
          setLoading(false)
          return
        }

        const newLeadResult = await createLead({
          first_name: manualContactName.trim() || undefined,
          phone: manualContactPhone.trim() || undefined,
          email: manualContactEmail.trim() || undefined,
          status: 'new',
        })

        if (!newLeadResult.success || !newLeadResult.lead) {
          toastError(newLeadResult.error || 'Failed to create contact')
          setLoading(false)
          return
        }

        finalContactId = newLeadResult.lead.id
      } else if (!contactId && !useManualContact) {
        // If no contact selected and not using manual entry, create a placeholder
        const newLeadResult = await createLead({
          first_name: 'Unlinked Call',
          status: 'new',
        })

        if (!newLeadResult.success || !newLeadResult.lead) {
          toastError(newLeadResult.error || 'Failed to create contact')
          setLoading(false)
          return
        }

        finalContactId = newLeadResult.lead.id
      }

      const activityData: Record<string, any> = {}
      if (duration) {
        activityData.duration = parseInt(duration) || 0
      }
      if (outcome && outcome.trim()) {
        activityData.outcome = outcome
      }

      const result = await createLeadActivity({
        lead_id: finalContactId,
        activity_type: callType,
        description: description.trim(),
        activity_data: activityData,
      })

      if (result.success) {
        toastSuccess('Call logged successfully')
        // Reset form
        setContactId('')
        setCallType('call_made')
        setDescription('')
        setDuration('')
        setOutcome('')
        setManualContactName('')
        setManualContactPhone('')
        setManualContactEmail('')
        setUseManualContact(false)
        onCallLogged?.()
        onClose()
      } else {
        toastError(result.error || 'Failed to log call')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while logging the call')
    } finally {
      setLoading(false)
    }
  }

  const getContactName = (lead: Lead) => {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    return name || lead.email || 'Unknown'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            Log Call
          </DialogTitle>
          <DialogDescription>
            Record details about a phone call with a contact
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact">Contact (optional)</Label>
            <div className="space-y-2">
              <Select 
                value={useManualContact ? undefined : contactId} 
                onValueChange={(value) => {
                  setContactId(value)
                  setUseManualContact(false)
                }}
                disabled={loadingContacts || useManualContact}
              >
                <SelectTrigger id="contact">
                  <SelectValue placeholder={loadingContacts ? "Loading contacts..." : "Select a contact (optional)"} />
                </SelectTrigger>
                <SelectContent>
                  {contacts.map((contact) => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {getContactName(contact)}
                      {contact.email && ` (${contact.email})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useManualContact"
                  checked={useManualContact}
                  onChange={(e) => {
                    setUseManualContact(e.target.checked)
                    if (e.target.checked) {
                      setContactId('')
                    }
                  }}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="useManualContact" className="text-sm font-normal cursor-pointer">
                  Enter contact information manually
                </Label>
              </div>
              {useManualContact && (
                <div className="space-y-2 pl-6 border-l-2 border-muted">
                  <Input
                    placeholder="Contact name"
                    value={manualContactName}
                    onChange={(e) => setManualContactName(e.target.value)}
                  />
                  <Input
                    type="email"
                    placeholder="Email (optional)"
                    value={manualContactEmail}
                    onChange={(e) => setManualContactEmail(e.target.value)}
                  />
                  <Input
                    type="tel"
                    placeholder="Phone (optional)"
                    value={manualContactPhone}
                    onChange={(e) => setManualContactPhone(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callType">Call Type *</Label>
            <Select value={callType} onValueChange={(value: 'call_made' | 'call_received') => setCallType(value)}>
              <SelectTrigger id="callType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call_made">Outgoing Call</SelectItem>
                <SelectItem value="call_received">Incoming Call</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was discussed during the call?"
              rows={4}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 15"
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcome">Outcome</Label>
              <Select value={outcome || undefined} onValueChange={setOutcome}>
                <SelectTrigger id="outcome">
                  <SelectValue placeholder="Select outcome (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="answered">Answered</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                  <SelectItem value="no_answer">No Answer</SelectItem>
                  <SelectItem value="busy">Busy</SelectItem>
                  <SelectItem value="follow_up">Follow Up Required</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Logging Call...' : 'Log Call'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
