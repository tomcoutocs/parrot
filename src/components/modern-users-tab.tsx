"use client"

import { useState, useEffect } from "react"
import { UserPlus, Search, MoreHorizontal, Shield, User as UserIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { fetchUsersOptimized, fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { User, Company } from "@/lib/supabase"

interface ModernUsersTabProps {
  activeSpace?: string | null
}

export function ModernUsersTab({ activeSpace }: ModernUsersTabProps) {
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<"all" | "internal" | "client">("all")
  const [filterRole, setFilterRole] = useState<"all" | "admin" | "manager" | "user">("all")
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user" as "admin" | "manager" | "user",
    type: "client" as "internal" | "client",
    spaces: [] as string[],
  })

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [usersData, companiesData] = await Promise.all([
          fetchUsersOptimized(),
          fetchCompaniesOptimized()
        ])
        
        // Filter users by activeSpace if provided
        let filteredUsers = usersData
        if (activeSpace) {
          // Show users that belong to this space (company)
          filteredUsers = usersData.filter(user => user.company_id === activeSpace)
        }
        
        setUsers(filteredUsers)
        setCompanies(companiesData)
      } catch (error) {
        console.error("Error loading users:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeSpace])

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: "bg-red-50 text-red-700 border-red-200",
      manager: "bg-blue-50 text-blue-700 border-blue-200",
      user: "bg-muted text-muted-foreground border-border",
    }
    return variants[role as keyof typeof variants] || variants.user
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Shield className="w-3 h-3" />
      case "manager":
        return <UserIcon className="w-3 h-3" />
      default:
        return <UserIcon className="w-3 h-3" />
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Creating user:", formData)
    setIsAddUserOpen(false)
    setFormData({
      name: "",
      email: "",
      role: "user",
      type: "client",
      spaces: [],
    })
  }

  const filteredUsers = users.filter(user => {
    const name = user.full_name || user.email || ""
    const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const userType = user.role === "admin" ? "internal" : (user.company_id ? "client" : "internal")
    const matchesType = filterType === "all" || userType === filterType
    const matchesRole = filterRole === "all" || user.role === filterRole
    return matchesSearch && matchesType && matchesRole
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage internal team members and client access
          </p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="w-3.5 h-3.5" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account for team members or clients
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5 mt-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="Enter full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              {/* User Type & Role */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">User Type</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: "internal" | "client") => 
                      setFormData({ ...formData, type: value })
                    }
                  >
                    <SelectTrigger id="type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="internal">Internal Team</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: "admin" | "manager" | "user") => 
                      setFormData({ ...formData, role: value })
                    }
                  >
                    <SelectTrigger id="role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="user">User</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Space Access */}
              {formData.type === "client" && (
                <div className="space-y-2">
                  <Label htmlFor="spaces">Space Access</Label>
                  <Select
                    value={formData.spaces[0] || ""}
                    onValueChange={(value) => 
                      setFormData({ ...formData, spaces: [value] })
                    }
                  >
                    <SelectTrigger id="spaces">
                      <SelectValue placeholder="Select a space" />
                    </SelectTrigger>
                    <SelectContent>
                      {companies.map((company) => (
                        <SelectItem key={company.id} value={company.id}>
                          <div className="flex items-center gap-2">
                            {company.is_active !== false && (
                              <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]" />
                            )}
                            {company.is_active === false && (
                              <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                            )}
                            {company.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Client users can only access assigned spaces
                  </p>
                </div>
              )}

              {/* Role Descriptions */}
              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Admin:</span> Full access to all features and settings
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">Manager:</span> Can manage projects and users within assigned spaces
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">User:</span> View and collaborate on assigned projects
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddUserOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Create User
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters & Search */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterType} onValueChange={(v: string) => setFilterType(v as "internal" | "all" | "client")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Users</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="client">Client</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={(v: string) => setFilterRole(v as "all" | "admin" | "manager" | "user")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="user">User</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="border-border/60 overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-muted/20 border-b border-border/40 text-xs text-muted-foreground">
          <div className="col-span-4">User</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Role</div>
          <div className="col-span-3">Spaces</div>
          <div className="col-span-1">Status</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-border/40">
          {filteredUsers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p className="text-sm">No users found</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const userType = user.role === "admin" ? "internal" : (user.company_id ? "client" : "internal")
              const userCompany = companies.find(c => c.id === user.company_id)
              
              return (
                <div
                  key={user.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-muted/20 transition-colors items-center group"
                >
                  <div className="col-span-4 flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-muted text-xs">
                        {(user.full_name || user.email || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm truncate">{user.full_name || user.email || "Unknown"}</p>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <Badge variant="outline" className="capitalize">
                      {userType}
                    </Badge>
                  </div>

                  <div className="col-span-2">
                    <Badge variant="outline" className={`gap-1 ${getRoleBadge(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </Badge>
                  </div>

                  <div className="col-span-3">
                    {userCompany ? (
                      <span className="text-xs text-muted-foreground">{userCompany.name}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">All spaces</span>
                    )}
                  </div>

                  <div className="col-span-1 flex items-center justify-between">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
                      <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Stats Footer */}
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span>{filteredUsers.length} users shown</span>
        <span>•</span>
        <span>{users.filter(u => u.role === "admin").length} internal team members</span>
        <span>•</span>
        <span>{users.filter(u => u.company_id).length} client users</span>
      </div>
    </div>
  )
}

