"use client"

import { useState } from 'react'
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
  Clock
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  const [searchTerm, setSearchTerm] = useState('')
  const [activities] = useState<Activity[]>([
    {
      id: '1',
      type: 'call',
      title: 'Follow-up call with John Smith',
      relatedTo: 'Acme Corp - Enterprise License',
      assignedTo: 'John Doe',
      dueDate: '2024-02-10',
      status: 'completed',
      description: 'Discuss pricing and implementation timeline',
    },
    {
      id: '2',
      type: 'meeting',
      title: 'Product demo for TechStart',
      relatedTo: 'TechStart - Annual Subscription',
      assignedTo: 'Jane Smith',
      dueDate: '2024-02-12',
      status: 'pending',
      description: 'Showcase new features and answer questions',
    },
    {
      id: '3',
      type: 'email',
      title: 'Send proposal to GlobalTech',
      relatedTo: 'GlobalTech - Implementation',
      assignedTo: 'John Doe',
      dueDate: '2024-02-08',
      status: 'overdue',
      description: 'Include pricing and contract terms',
    },
    {
      id: '4',
      type: 'task',
      title: 'Update CRM records',
      relatedTo: 'Acme Corp',
      assignedTo: 'John Doe',
      dueDate: '2024-02-11',
      status: 'pending',
      description: 'Sync latest contact information',
    },
  ])

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Activities</h1>
          <p className="text-muted-foreground mt-1">
            Track calls, meetings, emails, and tasks
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Activity
        </Button>
      </div>

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

