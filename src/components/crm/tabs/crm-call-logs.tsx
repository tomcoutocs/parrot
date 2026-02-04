"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Phone, Search, Plus, Calendar, Clock, User } from 'lucide-react'
import { fetchLeadActivities, fetchLeads, type Lead, type LeadActivity } from '@/lib/database-functions'
import { formatDistanceToNow, format } from 'date-fns'
import LogCallModal from '@/components/modals/log-call-modal'

interface CallLog {
  id: string
  lead_id: string
  contactName: string
  contactEmail?: string
  contactPhone?: string
  description: string
  callType: 'call_made' | 'call_received'
  duration?: number
  outcome?: string
  createdAt: string
  userId: string
}

export function CRMCallLogs() {
  const { data: session } = useSession()
  const [callLogs, setCallLogs] = useState<CallLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLogCallModalOpen, setIsLogCallModalOpen] = useState(false)

  useEffect(() => {
    loadCallLogs()
  }, [session?.user?.company_id])

  const loadCallLogs = async () => {
    if (!session?.user?.company_id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      // Fetch all leads to get contact info
      const leadsResult = await fetchLeads({ spaceId: session.user.company_id })
      
      if (!leadsResult.success || !leadsResult.leads) {
        setCallLogs([])
        return
      }

      const leads = leadsResult.leads
      const leadsMap = new Map<string, Lead>()
      leads.forEach(lead => {
        leadsMap.set(lead.id, lead)
      })

      // Fetch all call activities
      const allActivities: CallLog[] = []
      for (const lead of leads) {
        const activitiesResult = await fetchLeadActivities(lead.id)
        if (activitiesResult.success && activitiesResult.activities) {
          const callActivities = activitiesResult.activities.filter(
            activity => activity.activity_type === 'call_made' || activity.activity_type === 'call_received'
          )
          
          callActivities.forEach(activity => {
            const leadData = leadsMap.get(activity.lead_id) || lead
            const name = [leadData.first_name, leadData.last_name].filter(Boolean).join(' ')
            const contactName = name || leadData.email || 'Unlinked Call'
            
            allActivities.push({
              id: activity.id,
              lead_id: activity.lead_id,
              contactName,
              contactEmail: leadData?.email,
              contactPhone: leadData?.phone,
              description: activity.description,
              callType: activity.activity_type as 'call_made' | 'call_received',
              duration: activity.activity_data?.duration,
              outcome: activity.activity_data?.outcome,
              createdAt: activity.created_at,
              userId: activity.user_id || '',
            })
          })
        }
      }

      // Sort by most recent first
      allActivities.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      setCallLogs(allActivities)
    } catch (error) {
      console.error('Error loading call logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCallLogs = callLogs.filter(log =>
    log.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CL'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Call Logs</h2>
          <p className="text-muted-foreground">Track and manage all your call interactions</p>
        </div>
        <Button onClick={() => setIsLogCallModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Log Call
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search call logs by contact name, email, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Call Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>All Call Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading call logs...</div>
          ) : filteredCallLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {searchTerm ? 'No call logs match your search' : 'No call logs yet. Log your first call to get started.'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCallLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(log.contactName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{log.contactName}</h3>
                          <Badge variant={log.callType === 'call_made' ? 'default' : 'secondary'}>
                            {log.callType === 'call_made' ? 'Outgoing' : 'Incoming'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                          {log.contactEmail && (
                            <span>{log.contactEmail}</span>
                          )}
                          {log.contactPhone && (
                            <span>{log.contactPhone}</span>
                          )}
                        </div>
                        <p className="text-sm mb-2">{log.description}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(log.createdAt), 'MMM d, yyyy')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(log.createdAt), 'h:mm a')}
                          </div>
                          {log.duration && (
                            <span>Duration: {log.duration} min</span>
                          )}
                          {log.outcome && (
                            <Badge variant="outline" className="text-xs">
                              {log.outcome}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Call Modal */}
      <LogCallModal
        isOpen={isLogCallModalOpen}
        onClose={() => setIsLogCallModalOpen(false)}
        onCallLogged={() => {
          setIsLogCallModalOpen(false)
          loadCallLogs()
        }}
      />
    </div>
  )
}
