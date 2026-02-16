"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical,
  Mail,
  Phone,
  Building2,
  User,
  Loader2
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { fetchLeads, type Lead } from '@/lib/database-functions'
import { formatDistanceToNow } from 'date-fns'
import CreateLeadModal from '@/components/modals/create-lead-modal'
import ImportLeadModal from '@/components/modals/import-lead-modal'
import { MergeDuplicatesModal } from '@/components/modals/merge-duplicates-modal'

interface Contact {
  id: string
  name: string
  email?: string
  phone?: string
  company?: string
  title?: string
  status: 'active' | 'inactive' | 'lead'
  lastContact: string
  avatar?: string
}

export function CRMContacts() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)

  useEffect(() => {
    loadContacts()
  }, [session?.user?.company_id])

  const loadContacts = async () => {
    if (!session?.user?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Fetch only closed_won leads for contacts
      const result = await fetchLeads({ 
        spaceId: session.user.company_id,
        status: 'closed_won'
      })

      if (result.success && result.leads) {
        const mappedContacts: Contact[] = result.leads.map((lead: Lead) => {
          const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
          // All contacts are closed_won, so they're active contacts
          const status = 'active'
          
          const lastContact = lead.last_contacted_at 
            ? formatDistanceToNow(new Date(lead.last_contacted_at), { addSuffix: true })
            : lead.created_at 
            ? formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })
            : 'Never'

          return {
            id: lead.id,
            name: fullName,
            email: lead.email,
            phone: lead.phone,
            company: undefined, // Could fetch from company_id if needed
            title: lead.job_title,
            status,
            lastContact,
          }
        })
        setContacts(mappedContacts)
      }
    } catch (error) {
      console.error('Error loading contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (contact.company && contact.company.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      case 'lead':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => setIsMergeModalOpen(true)}>
          Merge Duplicates
        </Button>
        <Button variant="outline" onClick={() => setIsImportModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Import from Leads
        </Button>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Contact
        </Button>
      </div>

      {/* Create Lead Modal */}
      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLeadCreated={() => {
          setIsCreateModalOpen(false)
          loadContacts()
        }}
      />

      {/* Import Lead Modal */}
      <ImportLeadModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onLeadImported={() => {
          setIsImportModalOpen(false)
          loadContacts()
        }}
      />

      {/* Merge Duplicates Modal */}
      <MergeDuplicatesModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        spaceId={session?.user?.company_id}
        onMerged={loadContacts}
      />

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
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

      {/* Contacts List */}
      <Card>
        <CardHeader>
          <CardTitle>All Contacts ({filteredContacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No contacts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar>
                      <AvatarImage src={contact.avatar} />
                      <AvatarFallback>
                        {contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{contact.name}</h3>
                        <Badge className={getStatusColor(contact.status)}>
                          {contact.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {contact.email}
                          </span>
                        )}
                        {contact.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {contact.phone}
                          </span>
                        )}
                        {contact.company && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {contact.company}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {contact.title && `${contact.title} • `}Last contact: {contact.lastContact}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Edit Contact</DropdownMenuItem>
                      <DropdownMenuItem>Add Activity</DropdownMenuItem>
                      <DropdownMenuItem>Create Deal</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
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

