"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchLeads, createLeadActivity, type Lead } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { Mail } from 'lucide-react'

interface SendEmailModalProps {
  isOpen: boolean
  onClose: () => void
  onEmailSent?: () => void
  initialContactId?: string
}

export default function SendEmailModal({ 
  isOpen, 
  onClose, 
  onEmailSent,
  initialContactId 
}: SendEmailModalProps) {
  const { data: session } = useSession()
  const [contactId, setContactId] = useState<string>(initialContactId || '')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [contacts, setContacts] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(true)

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

    if (!contactId) {
      toastError('Please select a contact')
      return
    }

    if (!subject.trim()) {
      toastError('Please enter a subject')
      return
    }

    if (!body.trim()) {
      toastError('Please enter email content')
      return
    }

    setLoading(true)
    try {
      const selectedContact = contacts.find(c => c.id === contactId)
      const emailDescription = `Email sent to ${selectedContact?.email || 'contact'}: ${subject}`

      const result = await createLeadActivity({
        lead_id: contactId,
        activity_type: 'email_sent',
        description: emailDescription,
        activity_data: {
          subject,
          body,
          to: selectedContact?.email,
        },
      })

      if (result.success) {
        toastSuccess('Email activity logged successfully')
        // Reset form
        setContactId('')
        setSubject('')
        setBody('')
        onEmailSent?.()
        onClose()
      } else {
        toastError(result.error || 'Failed to log email')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while sending the email')
    } finally {
      setLoading(false)
    }
  }

  const getContactName = (lead: Lead) => {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ')
    return name || lead.email || 'Unknown'
  }

  const selectedContact = contacts.find(c => c.id === contactId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Send Email
          </DialogTitle>
          <DialogDescription>
            Log an email sent to a contact
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contact">Contact *</Label>
            <Select 
              value={contactId} 
              onValueChange={setContactId}
              disabled={loadingContacts}
            >
              <SelectTrigger id="contact">
                <SelectValue placeholder={loadingContacts ? "Loading contacts..." : "Select a contact"} />
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
            {selectedContact?.email && (
              <p className="text-sm text-muted-foreground">To: {selectedContact.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Email Content *</Label>
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content..."
              rows={8}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Log Email'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
