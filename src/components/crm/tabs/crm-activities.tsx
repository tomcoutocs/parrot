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
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  CheckSquare,
  Clock,
  Loader2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchLeads, fetchLeadActivities, type Lead, type LeadActivity } from '@/lib/database-functions'
import { formatDistanceToNow } from 'date-fns'
import { supabase } from '@/lib/supabase'
import CreateActivityModal from '@/components/modals/create-activity-modal'

interface Activity {
  id: string
  type: 'call' | 'email' | 'meeting' | 'task' | 'note'
  title: string
  relatedTo: string
  assignedTo: string
  dueDate: string
  status: 'completed' | 'pending' | 'overdue'
  description: string
}

export function CRMActivities() {
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    loadActivities()
  }, [session?.user?.company_id])

  const loadActivities = async () => {
    if (!session?.user?.company_id || !supabase) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const spaceId = session.user.company_id

      // Fetch all leads first
      const leadsResult = await fetchLeads({ spaceId })
      const leads = leadsResult.success ? leadsResult.leads || [] : []

      // Fetch all lead activities
      const allActivities: Activity[] = []
      
      // Fetch activities for each lead
      for (const lead of leads.slice(0, 50)) { // Limit to avoid too many requests
        const activitiesResult = await fetchLeadActivities(lead.id)
        if (activitiesResult.success && activitiesResult.activities) {
          const leadName = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
          
          activitiesResult.activities.forEach((activity: LeadActivity) => {
            // Map activity_type to our type
            const typeMap: Record<string, 'call' | 'email' | 'meeting' | 'task' | 'note'> = {
              'call': 'call',
              'email': 'email',
              'meeting': 'meeting',
              'task': 'task',
              'note': 'note',
              'form_submitted': 'note',
              'stage_changed': 'note',
            }
            const type = typeMap[activity.activity_type] || 'note'

            // Determine status based on created date
            const createdDate = new Date(activity.created_at)
            const now = new Date()
            const daysDiff = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
            const status: 'completed' | 'pending' | 'overdue' = daysDiff > 0 ? 'completed' : 'pending'

            allActivities.push({
              id: activity.id,
              type,
              title: activity.description || `${type} with ${leadName}`,
              relatedTo: leadName,
              assignedTo: session.user?.name || 'Unknown',
              dueDate: activity.created_at.split('T')[0],
              status,
              description: activity.description || '',
            })
          })
        }
      }

      // Sort by date (newest first)
      allActivities.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
      
      setActivities(allActivities)
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredActivities = activities.filter(activity =>
    activity.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.relatedTo.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'call':
        return Phone
      case 'email':
        return Mail
      case 'meeting':
        return Calendar
      case 'task':
        return CheckSquare
      case 'note':
        return MessageSquare
      default:
        return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'pending':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
      case 'overdue':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const completedActivities = filteredActivities.filter(a => a.status === 'completed')
  const pendingActivities = filteredActivities.filter(a => a.status === 'pending')
  const overdueActivities = filteredActivities.filter(a => a.status === 'overdue')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Activity
        </Button>
      </div>

      {/* Create Activity Modal */}
      <CreateActivityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onActivityCreated={() => {
          setIsCreateModalOpen(false)
          loadActivities()
        }}
      />

      {/* Activity Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {completedActivities.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {pendingActivities.length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueActivities.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search activities..."
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

      {/* Activities List */}
      <Card>
        <CardHeader>
          <CardTitle>All Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All ({filteredActivities.length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({pendingActivities.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedActivities.length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({overdueActivities.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <ActivityList activities={filteredActivities} getActivityIcon={getActivityIcon} getStatusColor={getStatusColor} />
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <ActivityList activities={pendingActivities} getActivityIcon={getActivityIcon} getStatusColor={getStatusColor} />
              </TabsContent>
              <TabsContent value="completed" className="mt-4">
                <ActivityList activities={completedActivities} getActivityIcon={getActivityIcon} getStatusColor={getStatusColor} />
              </TabsContent>
              <TabsContent value="overdue" className="mt-4">
                <ActivityList activities={overdueActivities} getActivityIcon={getActivityIcon} getStatusColor={getStatusColor} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function ActivityList({ activities, getActivityIcon, getStatusColor }: { 
  activities: Activity[], 
  getActivityIcon: (type: string) => any,
  getStatusColor: (status: string) => string 
}) {
  if (activities.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No activities found</div>
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => {
        const Icon = getActivityIcon(activity.type)
        return (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="p-2 rounded-lg bg-muted">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{activity.title}</h3>
                <Badge className={getStatusColor(activity.status)}>
                  {activity.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{activity.description}</p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Related to: {activity.relatedTo}</span>
                <span>Assigned to: {activity.assignedTo}</span>
                <span>Due: {activity.dueDate}</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

