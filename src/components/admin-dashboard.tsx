"use client"

import { Card } from "@/components/ui/card"
import { Users, DollarSign, FolderKanban, ArrowRight, CheckSquare, Clock, AlertCircle, Circle } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState, useEffect } from "react"
import { fetchCompaniesOptimized, fetchProjectsOptimized, fetchTasksOptimized } from "@/lib/simplified-database-functions"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { Company, ProjectWithDetails, TaskWithDetails, User } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/ui/loading-states"

interface AdminDashboardProps {
  spaces: Array<{ id: string; name: string; active: boolean }>
  spaceData: Record<string, unknown>
  onSpaceClick: (spaceId: string) => void
  refreshKey?: number // Add refresh key to trigger reloads
}

// Service color mapping
const serviceColors: Record<string, string> = {
  "E-commerce": "#8b5cf6",
  "Paid Media": "#ef4444",
  "Email Marketing": "#f59e0b",
  "Brand Strategy": "#ec4899",
  "SEO": "#3b82f6",
  "Content Marketing": "#10b981",
  "LinkedIn Ads": "#0891b2",
  "Website": "#6366f1",
  "Social Media": "#a855f7",
  "Influencer Marketing": "#f472b6",
  "Meta Ads": "#8b5cf6",
  "Content": "#84cc16",
  "Local SEO": "#3b82f6",
  "Google Ads": "#22c55e",
  "PPC": "#ef4444",
  "Landing Pages": "#f59e0b",
  "CRM": "#6366f1",
}

export function AdminDashboard({ spaces, spaceData, onSpaceClick, refreshKey = 0 }: AdminDashboardProps) {
  const [allSpaces, setAllSpaces] = useState<Array<{ id: string; name: string; active: boolean }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const companies = await fetchCompaniesOptimized()
        const projects = await fetchProjectsOptimized()
        const tasks = await fetchTasksOptimized()
        
        // Fetch all users to get manager information
        const allUsers = await fetchUsersOptimized()
        const usersMap = new Map<string, User>()
        allUsers.forEach(user => {
          usersMap.set(user.id, user)
        })
        
        // Fetch companies with manager_id
        let companiesWithManagers = companies
        if (supabase) {
          try {
            const { data: companiesData, error } = await supabase
              .from('companies')
              .select('id, manager_id')
            
            if (!error && companiesData) {
              // Enrich companies with manager_id
              companiesWithManagers = companies.map(company => {
                const companyData = companiesData.find((c: any) => c.id === company.id)
                return {
                  ...company,
                  manager_id: companyData?.manager_id || null
                }
              })
            }
          } catch (err) {
            console.error("Error fetching company managers:", err)
          }
        }
        
        const enrichedSpaces = companiesWithManagers.map(company => {
          const companyProjects = projects.filter(p => p.company_id === company.id)
          const activeProjects = companyProjects.filter(p => {
            const projectTasks = tasks.filter(t => t.project_id === p.id)
            const hasOpenTasks = projectTasks.some(t => {
              const status = t.status?.toLowerCase() || ""
              return status !== "done" && status !== "completed"
            })
            return hasOpenTasks
          }).length
          
          // Get manager from company's manager_id
          let manager = { name: "Unassigned", avatar: "" }
          if ((company as any).manager_id) {
            const managerUser = usersMap.get((company as any).manager_id)
            if (managerUser) {
              manager = {
                name: managerUser.full_name || managerUser.email || "Unknown",
                avatar: ""
              }
            }
          }
          
          return {
            id: company.id,
            name: company.name,
            active: company.is_active !== false,
            manager,
            startDate: company.created_at ? new Date(company.created_at).toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            }) : "-",
            services: ((spaceData[company.id] as { services?: string[] })?.services) || [],
            description: company.description || "",
            monthlySpend: ((spaceData[company.id] as { monthlySpend?: string })?.monthlySpend) || "$0",
            activeProjects
          }
        }).sort((a, b) => {
          // Active clients first
          if (a.active && !b.active) return -1
          if (!a.active && b.active) return 1
          return 0
        })
        
        setAllSpaces(enrichedSpaces)
      } catch (error) {
        console.error("Error loading admin dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [spaceData, refreshKey])

  const totalMonthlyRevenue = allSpaces.reduce((sum, client) => {
    const monthlySpend = (client as { monthlySpend?: string }).monthlySpend || "$0"
    const amount = parseFloat(monthlySpend.replace(/[$,]/g, ''))
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  const totalProjects = allSpaces.reduce((sum, client) => sum + ((client as { activeProjects?: number }).activeProjects || 0), 0)

  const summaryMetrics = [
    {
      label: "Total Clients",
      value: allSpaces.length.toString(),
      icon: Users,
    },
    {
      label: "Monthly Revenue",
      value: `$${(totalMonthlyRevenue / 1000).toFixed(1)}k`,
      icon: DollarSign,
    },
    {
      label: "Active Projects",
      value: totalProjects.toString(),
      icon: FolderKanban,
    },
  ]

  // Calculate task metrics
  const [taskMetrics, setTaskMetrics] = useState([
    { label: "Total Open", value: "0", icon: Circle, color: "text-muted-foreground" },
    { label: "Due Today", value: "0", icon: Clock, color: "text-blue-600" },
    { label: "Overdue", value: "0", icon: AlertCircle, color: "text-red-600" },
    { label: "Completed This Week", value: "0", icon: CheckSquare, color: "text-green-600" },
  ])

  useEffect(() => {
    const calculateTaskMetrics = async () => {
      try {
        // Fetch both tasks and projects to filter out tasks from archived projects
        const [tasksData, projectsData] = await Promise.all([
          fetchTasksOptimized(),
          fetchProjectsOptimized()
        ])

        // Create a set of active project IDs (fetchProjectsOptimized already excludes archived)
        const activeProjectIds = new Set(projectsData.map(p => p.id))

        // Filter tasks to only include those from active (non-archived) projects
        const tasks = tasksData.filter(task => activeProjectIds.has(task.project_id))

        const now = new Date()
        now.setHours(0, 0, 0, 0)
        
        const totalOpen = tasks.filter(t => {
          const status = t.status?.toLowerCase() || ""
          return status !== "done" && status !== "completed"
        }).length

        const dueToday = tasks.filter(t => {
          if (!t.due_date) return false
          const dueDate = new Date(t.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate.getTime() === now.getTime()
        }).length

        const overdue = tasks.filter(t => {
          if (!t.due_date) return false
          const dueDate = new Date(t.due_date)
          dueDate.setHours(0, 0, 0, 0)
          return dueDate < now && t.status?.toLowerCase() !== "done" && t.status?.toLowerCase() !== "completed"
        }).length

        const weekAgo = new Date(now)
        weekAgo.setDate(weekAgo.getDate() - 7)
        const completedThisWeek = tasks.filter(t => {
          const status = t.status?.toLowerCase() || ""
          if (status !== "done" && status !== "completed") return false
          if (!t.updated_at) return false
          const updatedDate = new Date(t.updated_at)
          return updatedDate >= weekAgo
        }).length

        setTaskMetrics([
          { label: "Total Open", value: totalOpen.toString(), icon: Circle, color: "text-muted-foreground" },
          { label: "Due Today", value: dueToday.toString(), icon: Clock, color: "text-blue-600" },
          { label: "Overdue", value: overdue.toString(), icon: AlertCircle, color: "text-red-600" },
          { label: "Completed This Week", value: completedThisWeek.toString(), icon: CheckSquare, color: "text-green-600" },
        ])
      } catch (error) {
        console.error("Error calculating task metrics:", error)
      }
    }

    calculateTaskMetrics()
  }, [refreshKey ?? 0])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Summary Metrics */}
        <div className="grid grid-cols-3 gap-3">
          {summaryMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.label} className="p-3 border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-0.5">{metric.label}</div>
                    <div className="text-xl">{metric.value}</div>
                  </div>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </Card>
            )
          })}
        </div>

        {/* Clients Table */}
        <Card className="p-3 border-border/60">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-2 py-1.5 text-xs text-muted-foreground border-b border-border/40 mb-0.5">
            <div className="col-span-4">Client</div>
            <div className="col-span-2">Manager</div>
            <div className="col-span-2">Services</div>
            <div className="col-span-2">Spend</div>
            <div className="col-span-2">Projects</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-0">
            {allSpaces.map((client) => (
              <div
                key={client.id}
                onClick={() => onSpaceClick(client.id)}
                className="grid grid-cols-12 gap-3 px-2 py-2 hover:bg-muted/30 transition-colors items-center group rounded-md cursor-pointer"
              >
                <div className="col-span-4 flex items-center gap-2">
                  {client.active && (
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] flex-shrink-0" />
                  )}
                  {!client.active && (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                  )}
                  <span className="text-sm truncate">{client.name}</span>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="w-5 h-5 flex-shrink-0">
                      <AvatarImage src={((client as { manager?: { avatar?: string; name: string } }).manager?.avatar) || ""} />
                      <AvatarFallback className="bg-muted text-xs">
                        {((client as { manager?: { name: string } }).manager?.name || "Unassigned").split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm truncate">{((client as { manager?: { name: string } }).manager?.name || "Unassigned").split(' ')[0]}</span>
                  </div>
                </div>
                <div className="col-span-2">
                  <div className="flex flex-wrap gap-1">
                    {(((client as { services?: string[] }).services) || []).slice(0, 2).map((service: string, idx: number) => (
                      <span key={idx} className="text-xs text-muted-foreground">
                        {service}{idx < Math.min((((client as { services?: string[] }).services) || []).length - 1, 1) ? ',' : ''}
                      </span>
                    ))}
                    {(((client as { services?: string[] }).services) || []).length > 2 && (
                      <span className="text-xs text-muted-foreground">+{(((client as { services?: string[] }).services) || []).length - 2}</span>
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-sm">{((client as { monthlySpend?: string }).monthlySpend) || "$0"}</span>
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <span className="text-sm">{((client as { activeProjects?: number }).activeProjects) || 0}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Task Summary */}
        <div className="grid grid-cols-4 gap-3">
          {taskMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.label} className="p-2.5 border-border/60">
                <div className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${metric.color}`} />
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">{metric.label}</div>
                    <div className="text-lg">{metric.value}</div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}

