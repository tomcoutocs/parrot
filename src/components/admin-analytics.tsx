"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, DollarSign, Target, Users } from "lucide-react"
import { useState, useEffect } from "react"
import { fetchCompaniesOptimized, fetchProjectsOptimized } from "@/lib/simplified-database-functions"

export function AdminAnalytics() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    activeClients: 0,
    projectsDelivered: 0,
    avgProjectTime: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const companies = await fetchCompaniesOptimized()
        const projects = await fetchProjectsOptimized()
        
        const activeClients = companies.filter(c => c.is_active !== false).length
        
        // Calculate projects delivered this month
        const thisMonth = new Date()
        thisMonth.setDate(1)
        thisMonth.setHours(0, 0, 0, 0)
        const projectsDelivered = projects.filter(p => {
          if (!p.updated_at) return false
          const updatedDate = new Date(p.updated_at)
          return updatedDate >= thisMonth
        }).length
        
        // Calculate average project time (simplified - would need more data)
        const avgProjectTime = 18 // Placeholder
        
        // Calculate total revenue (would need actual revenue data)
        const totalRevenue = 64900 // Placeholder
        
        setMetrics({
          totalRevenue,
          activeClients,
          projectsDelivered,
          avgProjectTime
        })
      } catch (error) {
        console.error("Error loading analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg">Analytics Overview</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Performance metrics across all spaces
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Total Revenue</div>
              <div className="text-2xl">${(metrics.totalRevenue / 1000).toFixed(1)}k</div>
              <div className="text-xs text-green-600 mt-1">+12.5% vs last month</div>
            </div>
            <DollarSign className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Active Clients</div>
              <div className="text-2xl">{metrics.activeClients}</div>
              <div className="text-xs text-green-600 mt-1">+1 this month</div>
            </div>
            <Users className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Projects Delivered</div>
              <div className="text-2xl">{metrics.projectsDelivered}</div>
              <div className="text-xs text-blue-600 mt-1">This month</div>
            </div>
            <Target className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-4 border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Avg Project Time</div>
              <div className="text-2xl">{metrics.avgProjectTime}d</div>
              <div className="text-xs text-green-600 mt-1">-3 days</div>
            </div>
            <TrendingUp className="w-5 h-5 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Charts Placeholder */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 border-border/60">
          <h3 className="text-sm mb-3">Revenue by Client</h3>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-md">
            <div className="text-sm text-muted-foreground">Chart visualization</div>
          </div>
        </Card>
        <Card className="p-4 border-border/60">
          <h3 className="text-sm mb-3">Project Completion Rate</h3>
          <div className="h-64 flex items-center justify-center bg-muted/30 rounded-md">
            <div className="text-sm text-muted-foreground">Chart visualization</div>
          </div>
        </Card>
      </div>

      {/* Client Performance */}
      <Card className="p-4 border-border/60">
        <h3 className="text-sm mb-3">Client Performance</h3>
        <div className="space-y-3">
          {["SMERCASE", "TechFlow Solutions", "GreenLeaf Organics", "Coastal Real Estate", "Half Past Seven"].map((client, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <span className="text-sm">{client}</span>
              <div className="flex items-center gap-3">
                <div className="w-32 bg-muted rounded-full h-2">
                  <div 
                    className="h-full bg-foreground rounded-full" 
                    style={{ width: `${Math.random() * 40 + 60}%` }}
                  />
                </div>
                <span className="text-sm text-muted-foreground min-w-[60px] text-right">
                  ${(Math.random() * 10 + 5).toFixed(1)}k
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

