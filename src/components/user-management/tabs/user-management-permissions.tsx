"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { 
  Shield,
  Briefcase,
  DollarSign,
  Users,
  BarChart3,
  Save
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface UserPermissions {
  id: string
  name: string
  email: string
  avatar?: string
  permissions: {
    crm: boolean
    invoicing: boolean
    leadGeneration: boolean
    analytics: boolean
    userManagement: boolean
  }
}

const apps = [
  { id: 'crm', name: 'CRM', icon: Briefcase, description: 'Customer Relationship Management' },
  { id: 'invoicing', name: 'Invoicing', icon: DollarSign, description: 'Billing & Invoicing' },
  { id: 'leadGeneration', name: 'Lead Generation', icon: Users, description: 'Lead Management' },
  { id: 'analytics', name: 'Analytics', icon: BarChart3, description: 'Reports & Analytics' },
  { id: 'userManagement', name: 'User Management', icon: Shield, description: 'User Administration' },
]

export function UserManagementPermissions() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [users] = useState<UserPermissions[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@company.com',
      permissions: {
        crm: true,
        invoicing: true,
        leadGeneration: true,
        analytics: false,
        userManagement: false,
      },
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane.smith@company.com',
      permissions: {
        crm: true,
        invoicing: false,
        leadGeneration: true,
        analytics: false,
        userManagement: false,
      },
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike.j@company.com',
      permissions: {
        crm: false,
        invoicing: true,
        leadGeneration: false,
        analytics: false,
        userManagement: false,
      },
    },
  ])

  const [permissions, setPermissions] = useState<UserPermissions['permissions'] | null>(null)

  const handleUserSelect = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user) {
      setSelectedUser(userId)
      setPermissions({ ...user.permissions })
    }
  }

  const handlePermissionChange = (appId: keyof UserPermissions['permissions'], checked: boolean) => {
    if (permissions) {
      setPermissions({
        ...permissions,
        [appId]: checked,
      })
    }
  }

  const handleSave = () => {
    if (!selectedUser || !permissions) return
    
    // TODO: Save permissions to database
    console.log('Saving permissions for user:', selectedUser, permissions)
    // Show success message
  }

  const selectedUserData = users.find(u => u.id === selectedUser)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">App Permissions</h1>
        <p className="text-muted-foreground mt-1">
          Manage which apps each user can access
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users List */}
        <Card>
          <CardHeader>
            <CardTitle>Select User</CardTitle>
            <CardDescription>Choose a user to manage their app permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedUser === user.id
                      ? 'bg-muted border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Avatar>
                    <AvatarImage src={user.avatar} />
                    <AvatarFallback>
                      {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions Editor */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedUserData ? `${selectedUserData.name}'s Permissions` : 'Select a User'}
            </CardTitle>
            <CardDescription>
              {selectedUserData 
                ? 'Grant or revoke access to specific apps'
                : 'Choose a user from the list to manage their permissions'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedUserData && permissions ? (
              <div className="space-y-6">
                <div className="space-y-4">
                  {apps.map((app) => {
                    const Icon = app.icon
                    const appKey = app.id as keyof UserPermissions['permissions']
                    const hasAccess = permissions[appKey]
                    
                    return (
                      <div
                        key={app.id}
                        className="flex items-start gap-4 p-4 border rounded-lg"
                      >
                        <div className={`p-2 rounded-lg ${
                          hasAccess 
                            ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                            : 'bg-gray-100 dark:bg-gray-900/30'
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            hasAccess 
                              ? 'text-emerald-600' 
                              : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div>
                              <h4 className="font-medium">{app.name}</h4>
                              <p className="text-sm text-muted-foreground">{app.description}</p>
                            </div>
                            <Checkbox
                              checked={hasAccess}
                              onCheckedChange={(checked) => 
                                handlePermissionChange(appKey, checked as boolean)
                              }
                            />
                          </div>
                          {hasAccess && (
                            <Badge variant="outline" className="mt-2">
                              Access Granted
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="w-4 h-4 mr-2" />
                    Save Permissions
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Select a user to manage their app permissions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

