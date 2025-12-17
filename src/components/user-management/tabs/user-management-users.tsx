"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Plus, 
  Search, 
  Filter,
  Users,
  Mail,
  Shield,
  UserCheck,
  MoreVertical,
  Edit,
  Trash2,
  Key
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'manager' | 'user' | 'internal'
  status: 'active' | 'inactive'
  lastLogin: string
  appPermissions: {
    crm: boolean
    invoicing: boolean
    leadGeneration: boolean
    analytics: boolean
  }
  avatar?: string
}

export function UserManagementUsers() {
  const [searchTerm, setSearchTerm] = useState('')
  const [users] = useState<User[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@company.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2024-02-10',
      appPermissions: {
        crm: true,
        invoicing: true,
        leadGeneration: true,
        analytics: true,
      },
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      role: 'internal',
      status: 'active',
      lastLogin: '2024-02-12',
      appPermissions: {
        crm: true,
        invoicing: false,
        leadGeneration: true,
        analytics: false,
      },
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.j@company.com',
      role: 'internal',
      status: 'active',
      lastLogin: '2024-02-11',
      appPermissions: {
        crm: false,
        invoicing: true,
        leadGeneration: false,
        analytics: false,
      },
    },
  ])

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
      case 'internal':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'manager':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const adminUsers = filteredUsers.filter(u => u.role === 'admin')
  const internalUsers = filteredUsers.filter(u => u.role === 'internal')
  const clientUsers = filteredUsers.filter(u => u.role === 'user' || u.role === 'manager')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground mt-1">
            Manage internal users and their app permissions
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
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

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({filteredUsers.length})</TabsTrigger>
              <TabsTrigger value="admin">Admin ({adminUsers.length})</TabsTrigger>
              <TabsTrigger value="internal">Internal ({internalUsers.length})</TabsTrigger>
              <TabsTrigger value="client">Client ({clientUsers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-4">
              <UserList users={filteredUsers} getRoleColor={getRoleColor} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="admin" className="mt-4">
              <UserList users={adminUsers} getRoleColor={getRoleColor} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="internal" className="mt-4">
              <UserList users={internalUsers} getRoleColor={getRoleColor} getStatusColor={getStatusColor} />
            </TabsContent>
            <TabsContent value="client" className="mt-4">
              <UserList users={clientUsers} getRoleColor={getRoleColor} getStatusColor={getStatusColor} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function UserList({ users, getRoleColor, getStatusColor }: { 
  users: User[], 
  getRoleColor: (role: string) => string,
  getStatusColor: (status: string) => string 
}) {
  if (users.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No users found</div>
  }

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <div
          key={user.id}
          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-4 flex-1">
            <Avatar>
              <AvatarImage src={user.avatar} />
              <AvatarFallback>
                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium">{user.name}</h3>
                <Badge className={getRoleColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge className={getStatusColor(user.status)}>
                  {user.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-2">{user.email}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-muted-foreground">Last login: {user.lastLogin}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Apps:</span>
                  {user.appPermissions.crm && <Badge variant="outline" className="text-xs">CRM</Badge>}
                  {user.appPermissions.invoicing && <Badge variant="outline" className="text-xs">Invoicing</Badge>}
                  {user.appPermissions.leadGeneration && <Badge variant="outline" className="text-xs">Lead Gen</Badge>}
                  {user.appPermissions.analytics && <Badge variant="outline" className="text-xs">Analytics</Badge>}
                </div>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit User
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Key className="w-4 h-4 mr-2" />
                Manage Permissions
              </DropdownMenuItem>
              <DropdownMenuItem>Reset Password</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ))}
    </div>
  )
}

