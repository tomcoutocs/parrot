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

export function UserManagementDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingInvitations: 0,
    internalUsers: 0,
    adminUsers: 0,
    clientUsers: 0,
  })

  useEffect(() => {
    // TODO: Fetch real data from database
    setStats({
      totalUsers: 1247,
      activeUsers: 1156,
      pendingInvitations: 12,
      internalUsers: 45,
      adminUsers: 8,
      clientUsers: 1184,
    })
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of users, invitations, and permissions
          </p>
        </div>
      </div>

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
                  <span>Client Users</span>
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
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <UserCheck className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">New user invited</p>
                  <p className="text-xs text-muted-foreground">john.doe@company.com</p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Shield className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Permissions updated</p>
                  <p className="text-xs text-muted-foreground">Jane Smith - CRM access granted</p>
                  <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                  <Mail className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Invitation sent</p>
                  <p className="text-xs text-muted-foreground">3 new internal users</p>
                  <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

