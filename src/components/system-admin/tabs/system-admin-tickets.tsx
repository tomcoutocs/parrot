"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  MessageSquare, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Loader2,
  Send,
  User,
  Calendar
} from 'lucide-react'
import { 
  getSupportTickets, 
  getTicketMessages, 
  addTicketMessage, 
  updateTicketStatus,
  calculateSLAStatus,
  type SupportTicket,
  type SupportMessage
} from '@/lib/support-functions'
import { fetchUsers } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import { useSession } from '@/components/providers/session-provider'
import { formatDistanceToNow } from 'date-fns'

interface UserMap {
  [key: string]: { full_name: string; email: string; profile_picture?: string }
}

export function SystemAdminTickets() {
  const { data: session } = useSession()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<SupportMessage[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [usersMap, setUsersMap] = useState<UserMap>({})

  useEffect(() => {
    loadTickets()
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const users = await fetchUsers()
      if (users && users.length > 0) {
        const map: UserMap = {}
        users.forEach(user => {
          map[user.id] = { 
            full_name: user.full_name, 
            email: user.email, 
            profile_picture: user.profile_picture 
          }
        })
        setUsersMap(map)
      }
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  useEffect(() => {
    filterTickets()
  }, [tickets, searchTerm, statusFilter, priorityFilter])

  const loadTickets = async () => {
    setLoading(true)
    try {
      const result = await getSupportTickets() // Get all tickets (no space filter for system admin)
      if (result.success && result.data) {
        setTickets(result.data)
      } else {
        toastError(result.error || 'Failed to load tickets')
      }
    } catch (error) {
      console.error('Error loading tickets:', error)
      toastError('Failed to load tickets')
    } finally {
      setLoading(false)
    }
  }

  const filterTickets = () => {
    let filtered = [...tickets]

    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === statusFilter)
    }

    if (priorityFilter !== 'all') {
      filtered = filtered.filter(ticket => ticket.priority === priorityFilter)
    }

    setFilteredTickets(filtered)
  }

  const handleTicketSelect = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setLoadingMessages(true)
    try {
      const result = await getTicketMessages(ticket.id)
      if (result.success && result.data) {
        setMessages(result.data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSendMessage = async () => {
    if (!selectedTicket || !newMessage.trim()) return

    setSendingMessage(true)
    try {
      const result = await addTicketMessage(selectedTicket.id, newMessage.trim())
      if (result.success) {
        setNewMessage('')
        await handleTicketSelect(selectedTicket) // Reload messages
        await loadTickets() // Reload tickets to update status
        toastSuccess('Message sent')
      } else {
        toastError(result.error || 'Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toastError('Failed to send message')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleStatusChange = async (status: 'open' | 'in_progress' | 'resolved' | 'closed') => {
    if (!selectedTicket) return

    setUpdatingStatus(true)
    try {
      const result = await updateTicketStatus(selectedTicket.id, status)
      if (result.success) {
        toastSuccess('Ticket status updated')
        await loadTickets()
        if (selectedTicket) {
          const updatedTicket = tickets.find(t => t.id === selectedTicket.id)
          if (updatedTicket) {
            setSelectedTicket({ ...updatedTicket, status })
          }
        }
      } else {
        toastError(result.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Error updating status:', error)
      toastError('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      open: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      resolved: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return variants[status as keyof typeof variants] || variants.open
  }

  const getPriorityBadge = (priority: string) => {
    const variants = {
      urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      normal: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    }
    return variants[priority as keyof typeof variants] || variants.normal
  }

  const getSLABadge = (ticket: SupportTicket) => {
    const sla = calculateSLAStatus(ticket)
    if (sla.status === 'breached') {
      return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">SLA Breached</Badge>
    } else if (sla.status === 'at_risk') {
      return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">At Risk</Badge>
    }
    return null
  }

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    in_progress: tickets.filter(t => t.status === 'in_progress').length,
    resolved: tickets.filter(t => t.status === 'resolved').length,
    urgent: tickets.filter(t => t.priority === 'urgent' && t.status !== 'closed').length,
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Tickets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.open}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.urgent}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tickets..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Priority</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tickets List */}
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No tickets found</p>
                  </div>
                ) : (
                  filteredTickets.map((ticket) => {
                    const sla = calculateSLAStatus(ticket)
                    return (
                      <button
                        key={ticket.id}
                        onClick={() => handleTicketSelect(ticket)}
                        className={`w-full text-left p-3 rounded-lg border transition-colors ${
                          selectedTicket?.id === ticket.id
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-medium text-sm line-clamp-1">{ticket.subject}</h4>
                          {sla.status === 'breached' && (
                            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <Badge className={getStatusBadge(ticket.status)}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityBadge(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          {getSLABadge(ticket)}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </p>
                          {usersMap[ticket.user_id || ''] && (
                            <p className="text-xs text-muted-foreground">
                              {usersMap[ticket.user_id || '']?.full_name || usersMap[ticket.user_id || '']?.email}
                            </p>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2">
          {selectedTicket ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="mb-2">{selectedTicket.subject}</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <Badge className={getStatusBadge(selectedTicket.status)}>
                        {selectedTicket.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityBadge(selectedTicket.priority)}>
                        {selectedTicket.priority}
                      </Badge>
                      {getSLABadge(selectedTicket)}
                    </div>
                    {usersMap[selectedTicket.user_id || ''] && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <User className="w-4 h-4" />
                        <span>
                          Submitted by: <span className="font-medium text-foreground">
                            {usersMap[selectedTicket.user_id || '']?.full_name || 'Unknown User'}
                          </span>
                          {usersMap[selectedTicket.user_id || '']?.email && (
                            <span className="text-muted-foreground">
                              {' '}({usersMap[selectedTicket.user_id || '']?.email})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value: any) => handleStatusChange(value)}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-40">
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
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedTicket.description}</p>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-4">Messages</h4>
                  <div className="space-y-4 max-h-[400px] overflow-y-auto mb-4">
                    {loadingMessages ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">No messages yet</p>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex gap-3 ${
                            message.is_staff ? 'flex-row-reverse' : ''
                          }`}
                        >
                          <div className={`flex-1 ${message.is_staff ? 'text-right' : ''}`}>
                            <div
                              className={`inline-block p-3 rounded-lg ${
                                message.is_staff
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted'
                              }`}
                            >
                              <p className="text-sm whitespace-pre-wrap">{message.message}</p>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {message.is_staff ? 'Staff' : 'User'} • {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your response..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      rows={3}
                      disabled={sendingMessage}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendingMessage}
                      className="w-full"
                    >
                      {sendingMessage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[600px]">
                <div className="text-center text-muted-foreground">
                  <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Select a ticket to view details</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

