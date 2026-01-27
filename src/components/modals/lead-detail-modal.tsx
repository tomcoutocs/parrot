"use client"

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getLeadById, fetchLeadStages, type Lead, type LeadStage } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastError } from '@/lib/toast'
import { Calendar, Mail, Phone, Briefcase, FileText, Tag, DollarSign, Clock, User } from 'lucide-react'

interface LeadDetailModalProps {
  isOpen: boolean
  onClose: () => void
  leadId: string | null
  onLeadUpdated?: () => void
}

export default function LeadDetailModal({ 
  isOpen, 
  onClose, 
  leadId,
  onLeadUpdated 
}: LeadDetailModalProps) {
  const { data: session } = useSession()
  const [lead, setLead] = useState<Lead | null>(null)
  const [stages, setStages] = useState<LeadStage[]>([])
  const [loading, setLoading] = useState(false)
  
  // Store onClose in a ref to avoid dependency array issues
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  // Get stable references for dependencies
  const companyId = session?.user?.company_id

  useEffect(() => {
    if (!isOpen || !leadId) {
      setLead(null)
      return
    }

    const loadLead = async () => {
      setLoading(true)
      try {
        const leadResult = await getLeadById(leadId)
        if (leadResult.success && leadResult.lead) {
          setLead(leadResult.lead)
          
          // Load stages to get stage name (use company_id from session or lead's space_id)
          const stageCompanyId = companyId || leadResult.lead.space_id
          const stagesResult = await fetchLeadStages(stageCompanyId)
          if (stagesResult.success && stagesResult.stages) {
            setStages(stagesResult.stages)
          }
        } else {
          toastError(leadResult.error || 'Failed to load lead details')
          onCloseRef.current()
        }
      } catch (error: any) {
        toastError(error.message || 'Failed to load lead details')
        onCloseRef.current()
      } finally {
        setLoading(false)
      }
    }

    loadLead()
  }, [isOpen, leadId, companyId])

  const getLeadName = () => {
    if (!lead) return 'Unknown'
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    }
    return lead.email || 'Unknown'
  }

  const getInitials = () => {
    const name = getLeadName()
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'L'
  }

  const getStageName = () => {
    if (!lead?.stage_id) return 'Unassigned'
    const stage = stages.find(s => s.id === lead.stage_id)
    return stage?.name || 'Unknown'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  const getSourceName = () => {
    if (!lead?.custom_fields?.source_type) return 'Unknown'
    const sourceType = lead.custom_fields.source_type
    const sourceNames: Record<string, string> = {
      website: 'Website',
      referral: 'Referral',
      email: 'Email',
      linkedin: 'LinkedIn',
      social_media: 'Social Media',
      advertising: 'Advertising',
      event: 'Event',
      other: 'Other'
    }
    return sourceNames[sourceType] || sourceType
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Details</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading lead details...</div>
          </div>
        ) : lead ? (
          <div className="space-y-6">
            {/* Header Section */}
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{getLeadName()}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant={lead.score >= 80 ? 'default' : lead.score >= 50 ? 'secondary' : 'outline'}>
                    Score: {lead.score}
                  </Badge>
                  <Badge variant="outline">{getStageName()}</Badge>
                  <Badge variant="outline">{getSourceName()}</Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <a href={`mailto:${lead.email}`} className="text-sm font-medium hover:underline">
                        {lead.email}
                      </a>
                    </div>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <a href={`tel:${lead.phone}`} className="text-sm font-medium hover:underline">
                        {lead.phone}
                      </a>
                    </div>
                  </div>
                )}
                {lead.job_title && (
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Job Title</div>
                      <div className="text-sm font-medium">{lead.job_title}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Qualification Data (BANT) */}
            {(lead.budget !== undefined || lead.authority !== undefined || lead.need || lead.timeline) && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Qualification Data (BANT)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {lead.budget !== undefined && lead.budget !== null && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Budget</div>
                          <div className="text-sm font-medium">
                            ${typeof lead.budget === 'number' ? lead.budget.toLocaleString() : lead.budget}
                          </div>
                        </div>
                      </div>
                    )}
                    {lead.authority !== undefined && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Authority</div>
                          <div className="text-sm font-medium">
                            {lead.authority ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                    )}
                    {lead.need && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Need</div>
                          <div className="text-sm font-medium">{lead.need}</div>
                        </div>
                      </div>
                    )}
                    {lead.timeline && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm text-muted-foreground">Timeline</div>
                          <div className="text-sm font-medium">{lead.timeline}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Notes */}
            {lead.notes && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Notes</h3>
                  <div className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted p-4 rounded-lg">
                    {lead.notes}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Tags */}
            {lead.tags && lead.tags.length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {lead.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        <Tag className="h-3 w-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Custom Fields */}
            {lead.custom_fields && Object.keys(lead.custom_fields).length > 0 && (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-4">Additional Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(lead.custom_fields).map(([key, value]) => {
                      // Skip source_type as it's already shown in header
                      if (key === 'source_type') return null
                      return (
                        <div key={key}>
                          <div className="text-sm text-muted-foreground capitalize">
                            {key.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Metadata</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Created</div>
                  <div className="font-medium">{formatDate(lead.created_at)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Last Updated</div>
                  <div className="font-medium">{formatDate(lead.updated_at)}</div>
                </div>
                {lead.last_contacted_at && (
                  <div>
                    <div className="text-muted-foreground">Last Contacted</div>
                    <div className="font-medium">{formatDate(lead.last_contacted_at)}</div>
                  </div>
                )}
                {lead.last_activity_at && (
                  <div>
                    <div className="text-muted-foreground">Last Activity</div>
                    <div className="font-medium">{formatDate(lead.last_activity_at)}</div>
                  </div>
                )}
                {lead.converted_to_customer && (
                  <div>
                    <div className="text-muted-foreground">Converted to Customer</div>
                    <div className="font-medium">
                      {lead.conversion_date ? formatDate(lead.conversion_date) : 'Yes'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Lead not found</div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
