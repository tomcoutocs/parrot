"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { getClients, getClientStats, createClient, updateClient, deleteClient, type Client } from '@/lib/client-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Mail,
  Phone,
  Building2,
  DollarSign,
  MoreVertical,
  Loader2,
  Edit,
  Trash2,
  FileText
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toastSuccess, toastError } from '@/lib/toast'

interface ClientWithStats extends Client {
  totalInvoiced?: number
  totalPaid?: number
  outstanding?: number
}

export function InvoicingClients() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [clients, setClients] = useState<ClientWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadClients()
  }, [spaceId])

  const loadClients = async () => {
    setLoading(true)
    try {
      const result = await getClients(spaceId || undefined)
      if (result.success && result.data) {
        // Load stats for each client
        const clientsWithStats = await Promise.all(
          result.data.map(async (client) => {
            const statsResult = await getClientStats(client.id)
            if (statsResult.success && statsResult.data) {
              return {
                ...client,
                totalInvoiced: statsResult.data.totalInvoiced,
                totalPaid: statsResult.data.totalPaid,
                outstanding: statsResult.data.outstanding,
              }
            }
            return { ...client, totalInvoiced: 0, totalPaid: 0, outstanding: 0 }
          })
        )
        setClients(clientsWithStats)
      }
    } catch (error) {
      console.error('Error loading clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Client
        </Button>
      </div>

      {/* Create/Edit Client Modal */}
      {(isCreateModalOpen || isEditModalOpen) && (
        <ClientModal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false)
            setIsEditModalOpen(false)
            setSelectedClient(null)
          }}
          onSuccess={() => {
            loadClients()
            setIsCreateModalOpen(false)
            setIsEditModalOpen(false)
            setSelectedClient(null)
          }}
          client={selectedClient}
          spaceId={spaceId}
        />
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle>All Clients ({filteredClients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No clients found</div>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar>
                      <AvatarFallback>
                        {client.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{client.name}</h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-sm">
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">Invoiced:</span>
                          <span className="font-medium">${(client.totalInvoiced || 0).toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-green-600" />
                          <span className="text-muted-foreground">Paid:</span>
                          <span className="font-medium text-green-600">${(client.totalPaid || 0).toLocaleString()}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3 text-amber-600" />
                          <span className="text-muted-foreground">Outstanding:</span>
                          <span className="font-medium text-amber-600">${(client.outstanding || 0).toLocaleString()}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setSelectedClient(client)
                        setIsEditModalOpen(true)
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Client
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <FileText className="w-4 h-4 mr-2" />
                        View Invoices
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={async () => {
                          if (confirm('Are you sure you want to delete this client?')) {
                            const result = await deleteClient(client.id)
                            if (result.success) {
                              toastSuccess('Client deleted')
                              loadClients()
                            } else {
                              toastError(result.error || 'Failed to delete client')
                            }
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ClientModal({
  isOpen,
  onClose,
  onSuccess,
  client,
  spaceId,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  client?: Client | null
  spaceId: string | null
}) {
  const [name, setName] = useState(client?.name || '')
  const [email, setEmail] = useState(client?.email || '')
  const [phone, setPhone] = useState(client?.phone || '')
  const [address, setAddress] = useState(client?.address || '')
  const [taxId, setTaxId] = useState(client?.tax_id || '')
  const [notes, setNotes] = useState(client?.notes || '')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (client) {
      setName(client.name || '')
      setEmail(client.email || '')
      setPhone(client.phone || '')
      setAddress(client.address || '')
      setTaxId(client.tax_id || '')
      setNotes(client.notes || '')
    } else {
      setName('')
      setEmail('')
      setPhone('')
      setAddress('')
      setTaxId('')
      setNotes('')
    }
  }, [client, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toastError('Client name is required')
      return
    }

    setSubmitting(true)
    try {
      if (client) {
        const result = await updateClient(client.id, { name, email, phone, address, tax_id: taxId, notes })
        if (result.success) {
          toastSuccess('Client updated')
          onSuccess()
        } else {
          toastError(result.error || 'Failed to update client')
        }
      } else {
        const result = await createClient({ name, email, phone, address, tax_id: taxId, notes }, spaceId || undefined)
        if (result.success) {
          toastSuccess('Client created')
          onSuccess()
        } else {
          toastError(result.error || 'Failed to create client')
        }
      }
    } catch (error) {
      toastError('Failed to save client')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Create New Client'}</DialogTitle>
          <DialogDescription>
            {client ? 'Update client information' : 'Add a new client to your system'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Client Name *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="123 Main St, City, State ZIP"
              rows={2}
            />
          </div>
          <div>
            <Label>Tax ID</Label>
            <Input
              value={taxId}
              onChange={(e) => setTaxId(e.target.value)}
              placeholder="Tax identification number"
            />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes about this client..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : client ? 'Update' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

