"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search,
  Check,
  User,
  Mail,
  Phone,
  Briefcase,
  Loader2
} from 'lucide-react'
import { fetchLeads, updateLead, type Lead } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface ImportLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onLeadImported: () => void
}

export default function ImportLeadModal({ 
  isOpen, 
  onClose, 
  onLeadImported 
}: ImportLeadModalProps) {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [qualifiedLeads, setQualifiedLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && session?.user?.company_id) {
      loadQualifiedLeads()
    }
  }, [isOpen, session?.user?.company_id])

  const loadQualifiedLeads = async () => {
    if (!session?.user?.company_id) return

    try {
      setLoading(true)
      // Fetch qualified leads (status = 'qualified' or score >= 70)
      const result = await fetchLeads({ 
        spaceId: session.user.company_id 
      })

      if (result.success && result.leads) {
        // Filter for qualified leads (not closed_won, not closed_lost, and either status='qualified' or score >= 70)
        const qualified = result.leads.filter((lead: Lead) => {
          const isQualifiedStatus = lead.status === 'qualified'
          const isHighScore = (lead.score || 0) >= 70
          const isNotClosed = lead.status !== 'closed_won' && lead.status !== 'closed_lost'
          return isNotClosed && (isQualifiedStatus || isHighScore)
        })
        setQualifiedLeads(qualified)
      }
    } catch (error) {
      console.error('Error loading qualified leads:', error)
      toastError('Failed to load qualified leads')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (lead: Lead) => {
    if (!lead.id) return

    try {
      setImporting(lead.id)
      
      // Update the lead status to closed_won to convert it to a contact
      const result = await updateLead(lead.id, {
        status: 'closed_won'
      })

      if (result.success) {
        toastSuccess('Lead imported as contact successfully')
        onLeadImported()
        onClose()
      } else {
        toastError(result.error || 'Failed to import lead')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while importing the lead')
    } finally {
      setImporting(null)
    }
  }

  const filteredLeads = qualifiedLeads.filter(lead => {
    const fullName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || ''
    const searchLower = searchTerm.toLowerCase()
    return (
      fullName.toLowerCase().includes(searchLower) ||
      (lead.email && lead.email.toLowerCase().includes(searchLower)) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchLower)) ||
      (lead.job_title && lead.job_title.toLowerCase().includes(searchLower))
    )
  })

  const getLeadDisplayName = (lead: Lead) => {
    return [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Qualified Lead as Contact</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search qualified leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No qualified leads found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {filteredLeads.map((lead) => {
                const isImporting = importing === lead.id
                return (
                  <Card key={lead.id} className="hover:bg-muted/50 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-lg">{getLeadDisplayName(lead)}</h3>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                              Score: {lead.score || 0}
                            </Badge>
                            {lead.status && (
                              <Badge variant="outline">
                                {lead.status}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                            {lead.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            {lead.job_title && (
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4" />
                                <span>{lead.job_title}</span>
                              </div>
                            )}
                            {lead.budget && (
                              <div className="flex items-center gap-2">
                                <span className="font-medium">Budget: ${lead.budget.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                          {lead.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{lead.notes}</p>
                          )}
                        </div>
                        <Button
                          onClick={() => handleImport(lead)}
                          disabled={isImporting}
                          className="ml-4"
                        >
                          {isImporting ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Importing...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Import
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
