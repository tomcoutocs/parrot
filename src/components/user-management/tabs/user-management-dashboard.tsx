"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Mail,
  Shield,
  UserCheck,
  UserX,
  Clock,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react'
import { fetchUsers, getPendingInvitations, getUserManagementActivities } from '@/lib/database-functions'
import type { User } from '@/lib/supabase'
import type { UserManagementActivity } from '@/lib/database-functions'

export function UserManagementDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvitations: 0,
    internalUsers: 0,
    adminUsers: 0,
    clientUsers: 0,
  })
  const [activities, setActivities] = useState<UserManagementActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Fetch users, invitations, and activities
        const [usersData, invitationsResult, activitiesData] = await Promise.all([
          fetchUsers(),
          getPendingInvitations(),
          getUserManagementActivities(5)
        ])

        const users = usersData || []
        const invitations = invitationsResult.success ? (invitationsResult.data || []) : []

        // Filter to only show internal users, managers, and admins (exclude client users)
        const teamUsers = users.filter(u => 
          u.role === 'admin' || 
          u.role === 'manager' || 
          u.role === 'internal'
        )

        // Filter invitations to only internal/admin/manager roles
        const teamInvitations = invitations.filter(inv => 
          inv.role === 'admin' || 
          inv.role === 'manager' || 
          inv.role === 'internal'
        )

        // Calculate stats
        const activeUsers = teamUsers.filter(u => u.is_active).length
        const adminUsers = teamUsers.filter(u => u.role === 'admin').length
        const internalUsers = teamUsers.filter(u => u.role === 'internal').length
        const managerUsers = teamUsers.filter(u => u.role === 'manager').length
        const pendingInvitations = teamInvitations.filter(inv => inv.status === 'pending').length

        setStats({
          totalUsers: teamUsers.length,
          activeUsers,
          pendingInvitations,
          internalUsers,
          adminUsers,
          clientUsers: managerUsers, // Renamed to show managers instead
        })
        
        // Set activities
        setActivities(activitiesData || [])
      } catch (error) {
        console.error('Error loading dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      description: `${stats.activeUsers} active`,
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Pending Invitations',
      value: stats.pendingInvitations.toString(),
      description: 'Awaiting acceptance',
      icon: Mail,
      color: 'text-amber-600',
    },
    {
      title: 'Internal Users',
      value: stats.internalUsers.toString(),
      description: 'Team members',
      icon: UserCheck,
      color: 'text-emerald-600',
    },
    {
      title: 'Admin Users',
      value: stats.adminUsers.toString(),
      description: 'Full access',
      icon: Shield,
      color: 'text-violet-600',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>User Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-violet-600" />
                  <span>Admin</span>
                </div>
                <span className="font-medium">{stats.adminUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Internal</span>
                </div>
                <span className="font-medium">{stats.internalUsers}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Managers</span>
                </div>
                <span className="font-medium">{stats.clientUsers}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => {
                  const getActivityIcon = () => {
                    switch (activity.type) {
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
                  
                  const getActivityBgColor = () => {
                    switch (activity.type) {
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
                  
                  return (
                    <div key={activity.id} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${getActivityBgColor()}`}>
                        {getActivityIcon()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.description}</p>
                        {activity.changed_by_name ? (
                          <p className="text-xs text-muted-foreground">by {activity.changed_by_name}</p>
                        ) : activity.changed_by_email ? (
                          <p className="text-xs text-muted-foreground">by {activity.changed_by_email}</p>
                        ) : null}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTimeAgo(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

