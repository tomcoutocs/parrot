"use client"

import { Card } from "@/components/ui/card"
import { Users, Mail, Calendar, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { fetchUsersOptimized, fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { User } from "@/lib/supabase"

export function AdminTeam() {
  const [team, setTeam] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const users = await fetchUsersOptimized()
        const companies = await fetchCompaniesOptimized()
        
        // Filter to internal team members (admins and managers)
        const teamMembers = users.filter(u => u.role === "admin" || u.role === "manager")
        
        // Enrich with client count
        const enrichedTeam = teamMembers.map(member => {
          const clientCount = member.company_id 
            ? 1 // If they have a company_id, they manage 1 client
            : companies.filter(c => c.is_active !== false).length // Admins see all clients
          return {
            ...member,
            clients: clientCount
          }
        })
        
        setTeam(enrichedTeam)
      } catch (error) {
        console.error("Error loading team:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading team...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">Team Members</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {team.length} team members managing {team.reduce((sum, m) => sum + ((m as { clients?: number }).clients || 0), 0)} clients
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Team Grid */}
      <div className="grid grid-cols-2 gap-4">
        {team.map((member) => (
          <Card key={member.id} className="p-4 border-border/60">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-muted">
                  {member.full_name?.split(' ').map((n: string) => n[0]).join('') || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm truncate">{member.full_name || member.email}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {member.role === "admin" ? "Admin" : member.role === "manager" ? "Account Manager" : "User"}
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    <span>{((member as { clients?: number }).clients || 0)} {((member as { clients?: number }).clients || 0) === 1 ? 'client' : 'clients'}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Activity Log */}
      <Card className="p-4 border-border/60">
        <h3 className="text-sm mb-3">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-xs">NF</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span>Nicolas Figari</span>
                <span className="text-muted-foreground"> created project </span>
                <span>Onboarding</span>
                <span className="text-muted-foreground"> for Half Past Seven</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-xs">SC</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span>Sarah Chen</span>
                <span className="text-muted-foreground"> completed task </span>
                <span>Q3 Report</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
            </div>
          </div>
          <div className="flex items-start gap-3 pb-3 border-b border-border/40 last:border-0 last:pb-0">
            <Avatar className="w-8 h-8">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-xs">EW</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span>Emily Watson</span>
                <span className="text-muted-foreground"> commented on </span>
                <span>Brand Guidelines Development</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Yesterday</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

