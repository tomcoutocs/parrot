"use client"

import { useState, useEffect } from "react"
import { Search, Plus, Clock, AlertCircle, CheckSquare, Circle, Calendar, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { fetchTasksOptimized, fetchProjectsOptimized, fetchCompaniesOptimized, fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { TaskWithDetails, ProjectWithDetails, Company, User } from "@/lib/supabase"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import { LoadingSpinner } from "@/components/ui/loading-states"
import CreateTaskModal from "@/components/modals/create-task-modal"

interface TaskWithProject extends TaskWithDetails {
  project?: ProjectWithDetails & { company?: Company }
}

export function AdminAllTasks() {
  const router = useRouter()
  const [tasks, setTasks] = useState<TaskWithProject[]>([])
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [filterCompany, setFilterCompany] = useState<string>("all")
  const [filterProject, setFilterProject] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [filterAssignee, setFilterAssignee] = useState<string>("all")
  const [showProjectSelectModal, setShowProjectSelectModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [selectedProjectForTask, setSelectedProjectForTask] = useState<string>("")

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
        // Fetch all data in parallel for better performance
        const [tasksData, allProjectsData, companiesData, usersData] = await Promise.all([
          fetchTasksOptimized(),
          fetchProjectsOptimized(),
          fetchCompaniesOptimized(),
          fetchUsersOptimized()
        ])

        // Enrich projects with company data
        // Handle both space_id and company_id for backward compatibility
        const enrichedProjects = allProjectsData.map(project => {
          // Try space_id first (after migration), fallback to company_id
          const spaceId = (project as any).space_id || project.company_id
          const company = companiesData.find(c => c.id === spaceId)
          return { 
            ...project, 
            company,
            // Normalize: ensure both space_id and company_id are available
            company_id: spaceId || project.company_id,
            space_id: spaceId || (project as any).space_id
          }
        })

        // Create a set of active project IDs for quick lookup
        const activeProjectIds = new Set(enrichedProjects.map(p => p.id))

        // Enrich tasks with project and company data, and filter out tasks from archived projects
        const enrichedTasks = tasksData
          .map(task => {
            const project = enrichedProjects.find(p => p.id === task.project_id)
            return { ...task, project }
          })
          .filter(task => {
            // Filter out tasks from archived projects
            // If project is not in enrichedProjects (which excludes archived), the project is archived
            return activeProjectIds.has(task.project_id) && task.project !== undefined
          })

        setTasks(enrichedTasks)
        setProjects(enrichedProjects)
        setCompanies(companiesData)
        setUsers(usersData)
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
    
    // Handle both space_id and company_id for matching
    const taskSpaceId = task.project ? ((task.project as any).space_id || task.project.company_id) : null
    const matchesCompany = filterCompany === "all" || taskSpaceId === filterCompany
    const matchesProject = filterProject === "all" || task.project_id === filterProject
    const matchesStatus = filterStatus === "all" || task.status === filterStatus
    const matchesPriority = filterPriority === "all" || task.priority === filterPriority
    const matchesAssignee = filterAssignee === "all" || task.assigned_to === filterAssignee
    
    return matchesSearch && matchesCompany && matchesProject && matchesStatus && matchesPriority && matchesAssignee
  })

  const activeFilterCount = 
    (filterCompany !== "all" ? 1 : 0) + 
    (filterProject !== "all" ? 1 : 0) + 
    (filterStatus !== "all" ? 1 : 0) + 
    (filterPriority !== "all" ? 1 : 0) + 
    (filterAssignee !== "all" ? 1 : 0)
  const hasActiveFilters = activeFilterCount > 0

  const clearFilters = () => {
    setFilterCompany("all")
    setFilterProject("all")
    setFilterStatus("all")
    setFilterPriority("all")
    setFilterAssignee("all")
  }

  // Get filtered projects based on company filter
  // Handle both space_id and company_id for matching
  const filteredProjectsForSelect = filterCompany === "all" 
    ? projects 
    : projects.filter(p => {
        const projectSpaceId = (p as any).space_id || p.company_id
        return projectSpaceId === filterCompany
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
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </div>
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
            if (projects.length === 0) {
              alert("No projects available. Please create a project first.")
              return
            }
            setShowProjectSelectModal(true)
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
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCompany} onValueChange={(value) => {
              setFilterCompany(value)
              // Reset project filter when company changes
              if (value !== filterCompany) {
                setFilterProject("all")
              }
            }}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Spaces" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Spaces</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {filteredProjectsForSelect.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterAssignee} onValueChange={setFilterAssignee}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Assignees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name || user.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-9 text-xs"
              >
                Clear filters
              </Button>
            )}
          </div>
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2">
              {filterCompany !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {companies.find(c => c.id === filterCompany)?.name || "Company"}
                  <button
                    onClick={() => {
                      setFilterCompany("all")
                      setFilterProject("all")
                    }}
                    className="ml-1.5 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterProject !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {projects.find(p => p.id === filterProject)?.name || "Project"}
                  <button
                    onClick={() => setFilterProject("all")}
                    className="ml-1.5 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterStatus !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {getStatusLabel(filterStatus)}
                  <button
                    onClick={() => setFilterStatus("all")}
                    className="ml-1.5 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterPriority !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {filterPriority.charAt(0).toUpperCase() + filterPriority.slice(1)}
                  <button
                    onClick={() => setFilterPriority("all")}
                    className="ml-1.5 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
              {filterAssignee !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  {users.find(u => u.id === filterAssignee)?.full_name || users.find(u => u.id === filterAssignee)?.email || "Assignee"}
                  <button
                    onClick={() => setFilterAssignee("all")}
                    className="ml-1.5 hover:bg-muted rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Tasks List */}
      <Card className="p-4 border-border/60">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-12 py-2 text-xs text-muted-foreground border-b border-border/30 opacity-60">
          <div className="col-span-4">Name</div>
          <div className="col-span-1 text-center">Space</div>
          <div className="col-span-1 text-center">Project</div>
          <div className="col-span-2 text-center">Assignee</div>
          <div className="col-span-2 text-center">Due date</div>
          <div className="col-span-1 text-center">Priority</div>
          <div className="col-span-1 text-center">Status</div>
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
              
              // Map priority to match TaskRow format
              const priorityMap: Record<string, string> = {
                "urgent": "Urgent",
                "high": "High",
                "normal": "Normal",
                "medium": "Normal", // Backwards compatibility
                "low": "Low"
              }
              const priorityLabel = priorityMap[task.priority || "normal"] || "Normal"
              
              // Map status to match TaskRow format
              const statusMap: Record<string, string> = {
                "todo": "TO DO",
                "in_progress": "IN PROGRESS",
                "review": "REVIEW",
                "done": "DONE"
              }
              const statusLabel = statusMap[task.status || "todo"] || "TO DO"
              
              // Get status color
              const statusColors: Record<string, { dot: string; text: string }> = {
                "todo": { dot: "bg-gray-500", text: "text-gray-600" },
                "in_progress": { dot: "bg-purple-500", text: "text-purple-600" },
                "review": { dot: "bg-yellow-500", text: "text-yellow-600" },
                "done": { dot: "bg-green-500", text: "text-green-600" }
              }
              const currentStatus = statusColors[task.status || "todo"] || statusColors["todo"]
              
              // Get priority color
              const priorityColors: Record<string, { dot: string; text: string }> = {
                "urgent": { dot: "bg-red-500", text: "text-red-600" },
                "high": { dot: "bg-orange-500", text: "text-orange-600" },
                "normal": { dot: "bg-gray-400", text: "text-muted-foreground" },
                "medium": { dot: "bg-gray-400", text: "text-muted-foreground" }, // Backwards compatibility
                "low": { dot: "bg-blue-500", text: "text-blue-600" }
              }
              const currentPriority = priorityColors[task.priority || "normal"] || priorityColors["normal"]
              
              return (
                <div
                  key={task.id}
                  onClick={() => handleTaskClick(task)}
                  className="grid grid-cols-12 gap-4 px-12 py-2.5 hover:bg-muted/50 transition-colors items-center group rounded-md cursor-pointer"
                >
                  {/* Name Column */}
                  <div className="col-span-4 flex items-center gap-2 -ml-8">
                    <button 
                      onClick={(e) => e.stopPropagation()}
                      className="relative w-4 h-4 rounded border-2 border-border hover:border-muted-foreground transition-all flex items-center justify-center flex-shrink-0" 
                    />
                    <span className="text-sm truncate">{task.title || "Untitled Task"}</span>
                  </div>
                  
                  {/* Space Column */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground truncate">{task.project?.company?.name || "-"}</span>
                  </div>
                  
                  {/* Project Column */}
                  <div className="col-span-1 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground truncate">{task.project?.name || "-"}</span>
                  </div>
                  
                  {/* Assignee Column */}
                  <div className="col-span-2 flex items-center justify-center">
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
                  
                  {/* Due Date Column */}
                  <div className="col-span-2 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">{formatDate(task.due_date)}</span>
                  </div>
                  
                  {/* Priority Column */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${currentPriority.dot}`} />
                      <span className={`text-xs ${currentPriority.text}`}>
                        {priorityLabel}
                      </span>
                    </div>
                  </div>
                  
                  {/* Status Column */}
                  <div className="col-span-1 flex items-center justify-center">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`} />
                      <span className={`text-xs font-medium ${currentStatus.text}`}>
                        {statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Project Selection Modal */}
      <Dialog open={showProjectSelectModal} onOpenChange={setShowProjectSelectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Project</DialogTitle>
            <DialogDescription>
              Choose a project to create a task in
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Select value={selectedProjectForTask} onValueChange={setSelectedProjectForTask}>
              <SelectTrigger>
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => {
                  const projectWithCompany = project as ProjectWithDetails & { company?: Company }
                  return (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} {projectWithCompany.company ? `(${projectWithCompany.company.name})` : ''}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowProjectSelectModal(false)
                setSelectedProjectForTask("")
              }}>
                Cancel
              </Button>
              <Button onClick={() => {
                if (selectedProjectForTask) {
                  setShowProjectSelectModal(false)
                  setShowCreateTaskModal(true)
                }
              }} disabled={!selectedProjectForTask}>
                Continue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Task Modal */}
      {showCreateTaskModal && selectedProjectForTask && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => {
            setShowCreateTaskModal(false)
            setSelectedProjectForTask("")
          }}
          onTaskCreated={async () => {
            setShowCreateTaskModal(false)
            setSelectedProjectForTask("")
            // Reload tasks
            const tasksData = await fetchTasksOptimized()
            const enrichedTasks = tasksData
              .map(task => {
                const project = projects.find(p => p.id === task.project_id)
                return { ...task, project }
              })
              .filter(task => {
                const activeProjectIds = new Set(projects.map(p => p.id))
                return activeProjectIds.has(task.project_id) && task.project !== undefined
              })
            setTasks(enrichedTasks)
          }}
          projectId={selectedProjectForTask}
          users={users}
        />
      )}
    </div>
  )
}

