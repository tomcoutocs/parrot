"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ArrowRight, Trash2 } from 'lucide-react'
import { fetchLeads, deleteLead, type Lead } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { useRouter } from 'next/navigation'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

function formatTimeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
  return `${Math.floor(diffInSeconds / 86400)} days ago`
}

export function RecentLeads() {
  const { data: session } = useSession()
  const router = useRouter()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteLeadId, setDeleteLeadId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadLeads = async () => {
      if (!session?.user?.id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const result = await fetchLeads({
          spaceId: session.user.company_id,
        })

        if (result.success && result.leads) {
          // Get the 5 most recent leads
          setLeads(result.leads.slice(0, 5))
        }
      } catch (error) {
        console.error('Error loading recent leads:', error)
      } finally {
        setLoading(false)
      }
    }

    loadLeads()
  }, [session?.user?.id, session?.user?.company_id])

  const getLeadName = (lead: Lead) => {
    if (lead.first_name || lead.last_name) {
      return `${lead.first_name || ''} ${lead.last_name || ''}`.trim()
    }
    return lead.email || 'Unknown'
  }

  const getInitials = (lead: Lead) => {
    const name = getLeadName(lead)
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'L'
  }

  const handleDelete = async () => {
    if (!deleteLeadId) return

    setDeleting(true)
    try {
      const result = await deleteLead(deleteLeadId)
      if (result.success) {
        toastSuccess('Lead deleted successfully')
        setLeads(leads.filter(lead => lead.id !== deleteLeadId))
        setDeleteLeadId(null)
      } else {
        toastError(result.error || 'Failed to delete lead')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while deleting the lead')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest leads added to your pipeline</CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/apps/lead-generation?tab=pipeline')}
          >
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No leads yet</div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{getInitials(lead)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">{getLeadName(lead)}</div>
                    <div className="text-sm text-muted-foreground">{lead.email || 'No email'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={lead.score >= 80 ? 'default' : 'secondary'}>
                    Score: {lead.score}
                  </Badge>
                  <Badge variant="outline">{lead.status}</Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteLeadId(lead.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <AlertDialog open={!!deleteLeadId} onOpenChange={(open) => !open && setDeleteLeadId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Lead</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this lead? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}

