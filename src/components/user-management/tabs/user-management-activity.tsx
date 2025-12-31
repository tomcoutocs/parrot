"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Mail,
  Shield,
  UserCheck,
  Clock,
  RefreshCw,
  Download
} from 'lucide-react'
import { getUserManagementActivities } from '@/lib/database-functions'
import type { UserManagementActivity } from '@/lib/database-functions'

export function UserManagementActivity() {
  const [activities, setActivities] = useState<UserManagementActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [limit, setLimit] = useState(50)

  const loadActivities = async () => {
    setLoading(true)
    try {
      const activitiesData = await getUserManagementActivities(limit)
      setActivities(activitiesData || [])
    } catch (error) {
      console.error('Error loading activities:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadActivities()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadActivities, 30000)
    return () => clearInterval(interval)
  }, [limit])

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'invitation_sent':
        return <Mail className="w-4 h-4 text-amber-600" />
      case 'invitation_accepted':
        return <UserCheck className="w-4 h-4 text-green-600" />
      case 'permissions_updated':
        return <Shield className="w-4 h-4 text-blue-600" />
      case 'user_created':
        return <UserCheck className="w-4 h-4 text-green-600" />
      case 'user_updated':
        return <Shield className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }
  
  const getActivityBgColor = (type: string) => {
    switch (type) {
      case 'invitation_sent':
        return 'bg-amber-100 dark:bg-amber-900/30'
      case 'invitation_accepted':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'permissions_updated':
        return 'bg-blue-100 dark:bg-blue-900/30'
      case 'user_created':
        return 'bg-green-100 dark:bg-green-900/30'
      case 'user_updated':
        return 'bg-blue-100 dark:bg-blue-900/30'
      default:
        return 'bg-gray-100 dark:bg-gray-900/30'
    }
  }
  
  const formatTimeAgo = (date: Date) => {
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'Just now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`
    return date.toLocaleDateString()
  }

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Description', 'Changed By', 'Changed By Email']
    const rows = activities.map(activity => [
      activity.timestamp.toISOString(),
      activity.type,
      activity.description,
      activity.changed_by_name || '',
      activity.changed_by_email || ''
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `user-management-activity-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Activity Feed</h2>
          <p className="text-muted-foreground mt-1">
            Track all user management activities and changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadActivities}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {activities.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p className="text-sm">Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No activity found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-full ${getActivityBgColor(activity.type)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.description}</p>
                    {activity.changed_by_name ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {activity.changed_by_name}
                      </p>
                    ) : activity.changed_by_email ? (
                      <p className="text-xs text-muted-foreground mt-1">
                        by {activity.changed_by_email}
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {activities.length >= limit && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => setLimit(prev => prev + 50)}
            disabled={loading}
          >
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}

