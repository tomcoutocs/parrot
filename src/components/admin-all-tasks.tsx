"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, Clock, AlertCircle, CheckSquare, Circle, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fetchTasksOptimized, fetchProjectsOptimized, fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { TaskWithDetails, ProjectWithDetails, Company } from "@/lib/supabase"
import { format } from "date-fns"
import { useRouter } from "next/navigation"

interface TaskWithProject extends TaskWithDetails {
  project?: ProjectWithDetails & { company?: Company }
}

export function AdminAllTasks() {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  const handleTaskClick = (task: TaskWithProject) => {
    // Navigate to projects tab with the selected task, project, and space
    // Use window.location to ensure full navigation and state reset
    if (task.project_id) {
      const spaceId = task.project?.company_id
      if (spaceId) {
        window.location.href = `/dashboard?tab=projects&taskId=${task.id}&projectId=${task.project_id}&space=${spaceId}`
      } else {
        window.location.href = `/dashboard?tab=projects&taskId=${task.id}&projectId=${task.project_id}`
      }
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Fetch all tasks (no project filter = all tasks)
        const tasksData = await fetchTasksOptimized()
        
        // Fetch all projects and companies to enrich task data
        const [projectsData, companiesData] = await Promise.all([
          fetchProjectsOptimized(),
          fetchCompaniesOptimized()
        ])

        // Enrich projects with company data
        const enrichedProjects = projectsData.map(project => {
          const company = companiesData.find(c => c.id === project.company_id)
          return { ...project, company }
        })

        // Enrich tasks with project and company data
        const enrichedTasks = tasksData.map(task => {
          const project = enrichedProjects.find(p => p.id === task.project_id)
          return { ...task, project }
        })

        setTasks(enrichedTasks)
        setProjects(enrichedProjects)
        setCompanies(companiesData)
      } catch (error) {
        console.error("Error loading tasks:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate statistics
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
    const status = t.status?.toLowerCase() || ""
    return dueDate.getTime() === now.getTime() && status !== "done" && status !== "completed"
  }).length

  const overdue = tasks.filter(t => {
    if (!t.due_date) return false
    const dueDate = new Date(t.due_date)
    dueDate.setHours(0, 0, 0, 0)
    const status = t.status?.toLowerCase() || ""
    return dueDate < now && status !== "done" && status !== "completed"
  }).length

  const completed = tasks.filter(t => {
    const status = t.status?.toLowerCase() || ""
    return status === "done" || status === "completed"
  }).length

  const openTasks = tasks.filter(t => {
    const status = t.status?.toLowerCase() || ""
    return status !== "done" && status !== "completed"
  })

  const filteredTasks = openTasks.filter(task => {
    const matchesSearch = 
      task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.project?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.assigned_user?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const getPriorityColor = (priority: string) => {
    const priorityLower = priority?.toLowerCase() || ""
    if (priorityLower === "high") {
      return { dot: "bg-red-500", text: "text-red-700" }
    }
    if (priorityLower === "normal" || priorityLower === "medium") {
      return { dot: "bg-blue-500", text: "text-blue-700" }
    }
    if (priorityLower === "low") {
      return { dot: "bg-gray-500", text: "text-gray-700" }
    }
    return { dot: "bg-gray-500", text: "text-gray-700" }
  }

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    if (statusLower.includes("progress") || statusLower === "in_progress") {
      return { dot: "bg-purple-500", text: "text-purple-700" }
    }
    if (statusLower.includes("todo") || statusLower === "to_do" || statusLower === "to do") {
      return { dot: "bg-gray-500", text: "text-gray-700" }
    }
    if (statusLower.includes("done") || statusLower === "completed") {
      return { dot: "bg-green-500", text: "text-green-700" }
    }
    return { dot: "bg-gray-500", text: "text-gray-700" }
  }

  const getStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    if (statusLower.includes("progress") || statusLower === "in_progress") {
      return "In Progress"
    }
    if (statusLower.includes("todo") || statusLower === "to_do" || statusLower === "to do") {
      return "To Do"
    }
    if (statusLower.includes("done") || statusLower === "completed") {
      return "Done"
    }
    return status || "To Do"
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      return format(date, "M/d/yy")
    } catch {
      return "-"
    }
  }

  const getAssigneeInitials = (user: { full_name?: string; email?: string } | null | undefined) => {
    if (!user) return "-"
    if (user.full_name) {
      return user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (user.email) {
      return user.email[0].toUpperCase()
    }
    return "-"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">All Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {openTasks.length} open task{openTasks.length !== 1 ? 's' : ''} across all projects
          </p>
        </div>
        <Button 
          onClick={() => {
            // TODO: Implement task creation with project selection
            // For now, this could navigate to a project or show a project selection modal
            console.log("Create new task - needs project selection")
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-3">
        <Card className="p-3 border-border/60">
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Total Open</div>
              <div className="text-lg">{totalOpen}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-border/60">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <div className="text-xs text-muted-foreground">Due Today</div>
              <div className="text-lg">{dueToday}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-border/60">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div>
              <div className="text-xs text-muted-foreground">Overdue</div>
              <div className="text-lg">{overdue}</div>
            </div>
          </div>
        </Card>
        <Card className="p-3 border-border/60">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-green-600" />
            <div>
              <div className="text-xs text-muted-foreground">Completed</div>
              <div className="text-lg">{completed}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter
          </Button>
        </div>
      </Card>

      {/* Tasks List */}
      <Card className="p-4 border-border/60">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-muted-foreground border-b border-border/40 mb-1">
          <div className="col-span-3">Task</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-2">Project</div>
          <div className="col-span-1">Assignee</div>
          <div className="col-span-2">Due Date</div>
          <div className="col-span-1">Priority</div>
          <div className="col-span-1">Status</div>
        </div>

        {/* Tasks */}
        <div className="space-y-0">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No tasks found
            </div>
          ) : (
            filteredTasks.map((task) => {
              const priorityColor = getPriorityColor(task.priority || "")
              const statusColor = getStatusColor(task.status || "")
              
              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="grid grid-cols-12 gap-4 px-3 py-3 hover:bg-muted/30 rounded-md transition-colors items-center group cursor-pointer"
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-4 h-4 rounded-full border-2 border-border hover:border-muted-foreground transition-all flex items-center justify-center flex-shrink-0" 
                    />
                    <span className="text-sm truncate">{task.title || "Untitled Task"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">{task.project?.company?.name || "-"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">{task.project?.name || "-"}</span>
                  </div>
                  <div className="col-span-1">
                    {task.assigned_user ? (
                      <Avatar className="w-6 h-6 border border-border">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-muted text-xs">
                          {getAssigneeInitials(task.assigned_user)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm">{formatDate(task.due_date)}</span>
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: priorityColor.dot === "bg-red-500" ? "#ef4444" : priorityColor.dot === "bg-blue-500" ? "#3b82f6" : "#6b7280" }}
                      />
                      <span className="text-xs" style={{ color: priorityColor.dot === "bg-red-500" ? "#ef4444" : priorityColor.dot === "bg-blue-500" ? "#3b82f6" : "#6b7280" }}>
                        {task.priority || "Normal"}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: statusColor.dot === "bg-purple-500" ? "#8b5cf6" : statusColor.dot === "bg-gray-500" ? "#6b7280" : statusColor.dot === "bg-green-500" ? "#10b981" : "#6b7280" }}
                      />
                      <span className="text-xs" style={{ color: statusColor.dot === "bg-purple-500" ? "#8b5cf6" : statusColor.dot === "bg-gray-500" ? "#6b7280" : statusColor.dot === "bg-green-500" ? "#10b981" : "#6b7280" }}>
                        {getStatusLabel(task.status || "")}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Create Task Modal - Note: CreateTaskModal requires a projectId, so we'll need to handle this differently */}
      {/* For now, the create button is disabled until we implement project selection */}
    </div>
  )
}

