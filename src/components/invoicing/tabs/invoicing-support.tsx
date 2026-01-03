"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from '@/components/providers/session-provider'
import {
  createSupportTicket,
  getSupportTickets,
  getTicketMessages,
  addTicketMessage,
  updateTicketStatus,
  calculateSLAStatus,
  type SupportTicket,
  type SupportMessage,
} from '@/lib/support-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Plus,
  Send,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toastSuccess, toastError } from '@/lib/toast'

export function InvoicingSupport() {
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadTickets()
  }, [spaceId])

  useEffect(() => {
    if (selectedTicket) {
      loadMessages(selectedTicket.id)
    }
  }, [selectedTicket])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const result = await getSupportTickets(spaceId || undefined)
      if (result.success && result.data) {
        setTickets(result.data)
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (ticketId: string) => {
    try {
      const result = await getTicketMessages(ticketId)
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
      case 'normal':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="space-y-6 h-full flex">
      {/* Tickets List */}
      <div className="w-1/3 border-r pr-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Support Tickets</h2>
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No support tickets yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const slaStatus = calculateSLAStatus(ticket)
              return (
                <Card
                  key={ticket.id}
                  className={`cursor-pointer hover:bg-muted/50 ${
                    selectedTicket?.id === ticket.id ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  <CardContent className="pt-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-sm">{ticket.subject}</h3>
                        <Badge className={getPriorityColor(ticket.priority)}>
                          {ticket.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={getStatusColor(ticket.status)}>
                          {ticket.status}
                        </Badge>
                        {slaStatus.status === 'breached' && (
                          <Badge variant="destructive" className="text-xs">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            SLA Breached
                          </Badge>
                        )}
                        {slaStatus.status === 'at_risk' && (
                          <Badge variant="outline" className="text-xs text-orange-600">
                            <Clock className="w-3 h-3 mr-1" />
                            {Math.round(slaStatus.hoursRemaining || 0)}h left
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Messages View */}
      <div className="flex-1 pl-6">
        {selectedTicket ? (
          <TicketChat
            ticket={selectedTicket}
            messages={messages}
            messagesEndRef={messagesEndRef}
            onMessageSent={() => {
              loadMessages(selectedTicket.id)
              loadTickets()
            }}
            onStatusUpdated={() => {
              loadTickets()
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Select a ticket to view conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      <CreateTicketModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTicketCreated={() => {
          loadTickets()
          setIsCreateModalOpen(false)
        }}
        spaceId={spaceId}
      />
    </div>
  )
}

function TicketChat({
  ticket,
  messages,
  messagesEndRef,
  onMessageSent,
  onStatusUpdated,
}: {
  ticket: SupportTicket
  messages: SupportMessage[]
  messagesEndRef: React.RefObject<HTMLDivElement | null>
  onMessageSent: () => void
  onStatusUpdated: () => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const slaStatus = calculateSLAStatus(ticket)

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setSending(true)
    try {
      const result = await addTicketMessage(ticket.id, message)
      if (result.success) {
        setMessage('')
        onMessageSent()
      } else {
        toastError(result.error || 'Failed to send message')
      }
    } catch (error) {
      toastError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    try {
      const result = await updateTicketStatus(ticket.id, status)
      if (result.success) {
        toastSuccess('Ticket status updated')
        onStatusUpdated()
      } else {
        toastError(result.error || 'Failed to update status')
      }
    } catch (error) {
      toastError('Failed to update status')
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>{ticket.subject}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{ticket.description}</p>
          </div>
          <Select
            value={ticket.status}
            onValueChange={(value: any) => handleStatusChange(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {slaStatus.status !== 'on_time' && (
          <div className="mt-2">
            {slaStatus.status === 'breached' ? (
              <Badge variant="destructive">
                <AlertCircle className="w-3 h-3 mr-1" />
                SLA Breached ({Math.round(slaStatus.hoursElapsed)}h elapsed)
              </Badge>
            ) : (
              <Badge variant="outline" className="text-orange-600">
                <Clock className="w-3 h-3 mr-1" />
                {Math.round(slaStatus.hoursRemaining || 0)}h remaining
              </Badge>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.is_staff ? 'justify-start' : 'justify-end'}`}
            >
              <div
                className={`rounded-lg px-4 py-2 max-w-[70%] ${
                  msg.is_staff
                    ? 'bg-muted'
                    : 'bg-primary text-primary-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(msg.created_at).toLocaleString()}
                  {msg.is_staff && ' • Staff'}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={sending}
            className="flex-1"
            rows={2}
          />
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

function CreateTicketModal({
  isOpen,
  onClose,
  onTicketCreated,
  spaceId,
}: {
  isOpen: boolean
  onClose: () => void
  onTicketCreated: () => void
  spaceId: string | null
}) {
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject || !description) {
      toastError('Subject and description are required')
      return
    }

    setSubmitting(true)
    try {
      const result = await createSupportTicket(
        { subject, description, priority },
        spaceId || undefined
      )
      if (result.success) {
        toastSuccess('Ticket created successfully')
        onTicketCreated()
        setSubject('')
        setDescription('')
        setPriority('normal')
      } else {
        toastError(result.error || 'Failed to create ticket')
      }
    } catch (error) {
      toastError('Failed to create ticket')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Support Ticket</DialogTitle>
          <DialogDescription>
            We'll respond within the SLA timeframe shown below
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Subject *</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of the issue"
              required
            />
          </div>
          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of your issue..."
              rows={5}
              required
            />
          </div>
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low (48h SLA)</SelectItem>
                <SelectItem value="normal">Normal (24h SLA)</SelectItem>
                <SelectItem value="high">High (4h SLA)</SelectItem>
                <SelectItem value="urgent">Urgent (2h SLA)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

