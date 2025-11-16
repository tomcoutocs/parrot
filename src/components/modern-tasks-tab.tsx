"use client"

import { CheckSquare, Clock, AlertCircle, MoreHorizontal, ChevronRight, Plus, Calendar, FolderKanban } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { TaskRow } from "./task-row"
import { InlineTaskCreation } from "./inline-task-creation"
import { BulkEditBar } from "./bulk-edit-bar"
import { fetchProjectsOptimized, fetchTasksOptimized, fetchUsersOptimized, updateTaskPosition } from "@/lib/simplified-database-functions"
import { supabase } from "@/lib/supabase"
import { updateTaskStatus, createTask } from "@/lib/database-functions"
import { formatDateForDatabase } from "@/lib/date-utils"
import { ProjectWithDetails, TaskWithDetails } from "@/lib/supabase"
import { format } from "date-fns"
import { useSession } from "@/components/providers/session-provider"
import CreateProjectModal from "@/components/modals/create-project-modal"
import CreateTaskModal from "@/components/modals/create-task-modal"
import TaskDetailSidebar from "@/components/task-detail-sidebar"

interface Task {
  id: string
  name: string
  assignee: string
  dueDate: string
  priority: string
  status?: string
  subtasks?: number
  completed?: boolean
}

interface StatusGroup {
  name: string
  color: string
  tasks: Task[]
}

interface Project {
  id: string
  name: string
  dueDate: string
  launchDate?: string
  statusGroups: StatusGroup[]
  taskCount?: number
}

interface ModernTasksTabProps {
  activeSpace: string | null
}

// Map database status to design status groups
const statusGroupMap: Record<string, { name: string; color: string }> = {
  "in_progress": { name: "IN PROGRESS", color: "#8b5cf6" },
  "in progress": { name: "IN PROGRESS", color: "#8b5cf6" },
  "todo": { name: "TO DO", color: "#6b7280" },
  "to_do": { name: "TO DO", color: "#6b7280" },
  "to do": { name: "TO DO", color: "#6b7280" },
  "review": { name: "REVIEW", color: "#f59e0b" },
  "done": { name: "DONE", color: "#10b981" },
  "completed": { name: "DONE", color: "#10b981" },
}

// Reverse map: status group name to database status
const statusGroupToDbStatus: Record<string, string> = {
  "IN PROGRESS": "in_progress",
  "TO DO": "todo",
  "REVIEW": "review",
  "DONE": "done",
}

function transformTaskToDesignTask(task: TaskWithDetails): Task & { originalStatus?: string } {
  const assignee = task.assigned_user?.full_name 
    ? task.assigned_user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : ""
  
  const dueDate = task.due_date 
    ? format(new Date(task.due_date), "MM/dd/yy")
    : ""
  
  const priority = task.priority 
    ? task.priority.charAt(0).toUpperCase() + task.priority.slice(1)
    : "Normal"

  return {
    id: task.id,
    name: task.title || "Untitled Task",
    assignee,
    dueDate,
    priority,
    status: task.status, // Set status for display
    subtasks: undefined, // TODO: Get subtask count if available
    completed: task.status === "done",
    originalStatus: task.status // Store original status for grouping
  } as Task & { originalStatus?: string }
}

function groupTasksByStatus(tasks: (Task & { originalStatus?: string })[]): StatusGroup[] {
  const groups: Record<string, Task[]> = {}
  
  tasks.forEach(task => {
    // Determine status group based on original database status
    let statusKey = "todo"
    const originalStatus = (task as { originalStatus?: string }).originalStatus?.toLowerCase() || ""
    
    if (task.completed || originalStatus === "done" || originalStatus === "completed") {
      statusKey = "done"
    } else if (originalStatus === "in_progress" || originalStatus === "in progress") {
      statusKey = "in_progress"
    } else if (originalStatus === "review") {
      statusKey = "review"
    } else {
      statusKey = "todo"
    }
    
    const groupInfo = statusGroupMap[statusKey] || statusGroupMap["todo"]
    const groupName = groupInfo.name
    
    if (!groups[groupName]) {
      groups[groupName] = []
    }
    // Remove originalStatus before adding to groups
    const { originalStatus: _, ...taskWithoutStatus } = task as { originalStatus?: string } & typeof task
    groups[groupName].push(taskWithoutStatus)
  })
  
  // Convert to StatusGroup array, maintaining order: TO DO, IN PROGRESS, REVIEW, DONE
  // ALWAYS show all status groups, even if empty
  const order = ["TO DO", "IN PROGRESS", "REVIEW", "DONE"]
  const orderedGroups: StatusGroup[] = []
  
  order.forEach(groupName => {
    const groupInfo = Object.values(statusGroupMap).find(g => g.name === groupName) || statusGroupMap["todo"]
    orderedGroups.push({
      name: groupName,
      color: groupInfo.color,
      tasks: groups[groupName] || [] // Always include, even if empty
    })
  })
  
  // Add any other groups that weren't in the order
  Object.entries(groups).forEach(([name, tasks]) => {
    if (!order.includes(name)) {
      const groupInfo = Object.values(statusGroupMap).find(g => g.name === name) || statusGroupMap["todo"]
      orderedGroups.push({
        name,
        color: groupInfo.color,
        tasks
      })
    }
  })
  
  return orderedGroups
}

export function ModernTasksTab({ activeSpace }: ModernTasksTabProps) {
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [expandedProjects, setExpandedProjects] = useState<string[]>([])
  const [expandedStatuses, setExpandedStatuses] = useState<string[]>([])
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [showingInlineCreate, setShowingInlineCreate] = useState<string | null>(null)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedTaskForSidebar, setSelectedTaskForSidebar] = useState<TaskWithDetails | null>(null)
  const [isTaskSidebarOpen, setIsTaskSidebarOpen] = useState(false)
  const [tasksMap, setTasksMap] = useState<Map<string, TaskWithDetails>>(new Map())

  useEffect(() => {
    const loadData = async () => {
      if (!activeSpace) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Fetch projects for this space
        const projectsData = await fetchProjectsOptimized(activeSpace)
        
        // Fetch users for this space - only show users, managers, and admins
        const usersData = await fetchUsersOptimized()
        
        // Get direct company users (users, managers, admins)
        const directSpaceUsers = usersData.filter(user => 
          user.company_id === activeSpace && 
          user.is_active !== false &&
          (user.role === 'user' || user.role === 'manager' || user.role === 'admin')
        )
        
        // Get internal users assigned to this space via internal_user_companies
        let internalUserIds: string[] = []
        if (supabase) {
          try {
            const { data: internalAssignments } = await supabase
              .from('internal_user_companies')
              .select('user_id')
              .eq('company_id', activeSpace)
            
            if (internalAssignments) {
              internalUserIds = internalAssignments.map(ia => ia.user_id)
            }
          } catch (error) {
            console.error('Error fetching internal user assignments:', error)
          }
        }
        
        // Get internal users who are assigned to this space
        const internalUsers = usersData.filter(user => 
          internalUserIds.includes(user.id) && 
          user.is_active !== false &&
          (user.role === 'admin' || user.role === 'manager')
        )
        
        // Combine and deduplicate
        const allSpaceUsers = [...directSpaceUsers, ...internalUsers]
        const uniqueUsers = Array.from(
          new Map(allSpaceUsers.map(user => [user.id, user])).values()
        )
        
        const spaceUsers = uniqueUsers.map(user => ({
          id: user.id,
          full_name: user.full_name || "",
          email: user.email || ""
        }))
        setUsers(spaceUsers)
        
        // Fetch tasks for projects in this space
        // Get all project IDs first, then fetch tasks for those projects
        const projectIds = projectsData.map(p => p.id)
        const allTasksData = projectIds.length > 0 
          ? await Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
          : []
        
        // Store tasks map for sidebar access
        const newTasksMap = new Map<string, TaskWithDetails>()
        allTasksData.forEach(task => {
          newTasksMap.set(task.id, task)
        })
        setTasksMap(newTasksMap)
        
        // Transform projects to match design structure
        const transformedProjects: Project[] = projectsData.map((project) => {
          // Get tasks for this project
          const projectTasks = allTasksData.filter(t => t.project_id === project.id)
          const designTasks = projectTasks.map(transformTaskToDesignTask)
          const statusGroups = groupTasksByStatus(designTasks)
          
          return {
            id: project.id,
            name: project.name || "Unnamed Project",
            dueDate: "-",
            launchDate: undefined,
            statusGroups,
            taskCount: projectTasks.length // Store task count
          }
        })
        
        setProjects(transformedProjects)
        
        // Check URL parameters for projectId and taskId
        const projectIdParam = searchParams?.get('projectId')
        const taskIdParam = searchParams?.get('taskId')
        
        // If projectId is in URL, expand that project
        if (projectIdParam && transformedProjects.some(p => p.id === projectIdParam)) {
          setExpandedProjects([projectIdParam])
          setSelectedProjectId(projectIdParam)
          
          // If taskId is also in URL, open the task sidebar after tasks are loaded
          if (taskIdParam) {
            const task = newTasksMap.get(taskIdParam)
            if (task) {
              setTimeout(() => {
                setSelectedTaskForSidebar(task)
                setIsTaskSidebarOpen(true)
              }, 300)
            }
          }
        } else if (transformedProjects.length > 0) {
          // Auto-expand first project and first status group
          const firstProject = transformedProjects[0]
          setExpandedProjects([firstProject.id])
          setSelectedProjectId(firstProject.id) // Set default project for task creation
          if (firstProject.statusGroups.length > 0) {
            const firstStatusId = `${firstProject.id}-${firstProject.statusGroups[0].name.toLowerCase().replace(" ", "-")}`
            setExpandedStatuses([firstStatusId])
          }
        }
      } catch (error) {
        console.error("Error loading tasks:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeSpace, searchParams])

  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => 
      prev.includes(projectId) 
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    )
    // Update selected project for task creation
    setSelectedProjectId(projectId)
  }

  const toggleStatus = (statusId: string) => {
    setExpandedStatuses(prev => 
      prev.includes(statusId) 
        ? prev.filter(id => id !== statusId)
        : [...prev, statusId]
    )
  }

  const handleToggleSelect = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
    // Enable selection mode when first task is selected
    if (selectedTasks.length === 0) {
      setIsSelectionMode(true)
    }
  }

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    console.log("Updating task", taskId, updates)
    
    // If status is being updated, update it in the database
    if ('status' in updates && updates.status && session?.user?.id) {
      try {
        const task = tasksMap.get(taskId)
        if (task) {
          await updateTaskStatus(taskId, updates.status as TaskWithDetails['status'], session.user.id)
          
          // Reload projects to reflect the change
          const loadData = async () => {
            if (!activeSpace) return
            const projectsData = await fetchProjectsOptimized(activeSpace)
            const projectIds = projectsData.map(p => p.id)
            const allTasksData = projectIds.length > 0 
              ? await Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
              : []
            
            const newTasksMap = new Map<string, TaskWithDetails>()
            allTasksData.forEach(task => {
              newTasksMap.set(task.id, task)
            })
            setTasksMap(newTasksMap)
            
            const transformedProjects: Project[] = projectsData.map((project) => {
              const projectTasks = allTasksData.filter(t => t.project_id === project.id)
              const designTasks = projectTasks.map(transformTaskToDesignTask)
              const statusGroups = groupTasksByStatus(designTasks)
              
              return {
                id: project.id,
                name: project.name || "Unnamed Project",
                dueDate: "-",
                launchDate: undefined,
                statusGroups,
                taskCount: projectTasks.length
              }
            })
            
            setProjects(transformedProjects)
          }
          loadData()
        }
      } catch (error) {
        console.error("Error updating task status:", error)
      }
    }
    // TODO: Handle other updates (priority, assignee, due date, etc.)
  }

  const handleTaskDelete = (taskId: string) => {
    console.log("Deleting task", taskId)
    // TODO: Delete task from database
  }

  const handleTaskClick = (taskId: string) => {
    const task = tasksMap.get(taskId)
    if (task) {
      setSelectedTaskForSidebar(task)
      setIsTaskSidebarOpen(true)
    }
  }

  const handleCloseTaskSidebar = () => {
    setIsTaskSidebarOpen(false)
    setSelectedTaskForSidebar(null)
  }

  const handleEditTask = (task: TaskWithDetails) => {
    // TODO: Open edit task modal
    console.log("Edit task", task)
  }

  const handleBulkUpdate = (updates: Partial<Task>) => {
    console.log("Bulk updating tasks", selectedTasks, updates)
    setSelectedTasks([])
    setIsSelectionMode(false)
    // TODO: Bulk update tasks in database
  }

  const handleBulkDelete = () => {
    console.log("Bulk deleting tasks", selectedTasks)
    setSelectedTasks([])
    setIsSelectionMode(false)
    // TODO: Bulk delete tasks from database
  }

  const handleClearSelection = () => {
    setSelectedTasks([])
    setIsSelectionMode(false)
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // If dropped outside a droppable area, do nothing
    if (!destination) return

    // If dropped in the same position, do nothing
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    // Parse the droppable ID format: "projectId-statusGroupName" (e.g., "project123-to-do")
    // Find the project ID (everything before the first dash that matches a project ID)
    let projectId = ''
    let destStatusGroupName = ''
    
    // Try to find project ID by matching against known project IDs
    for (const project of projects) {
      if (destination.droppableId.startsWith(project.id + '-')) {
        projectId = project.id
        // Extract status group name (everything after projectId-)
        const statusPart = destination.droppableId.substring(project.id.length + 1)
        // Convert from "to-do" or "in-progress" format to "TO DO" or "IN PROGRESS"
        // Map common variations to the correct uppercase format
        const statusMap: Record<string, string> = {
          'to-do': 'TO DO',
          'in-progress': 'IN PROGRESS',
          'review': 'REVIEW',
          'done': 'DONE'
        }
        destStatusGroupName = statusMap[statusPart.toLowerCase()] || statusPart.split('-').map(word => 
          word.toUpperCase()
        ).join(' ')
        break
      }
    }

    if (!projectId || !destStatusGroupName) {
      console.error("Could not parse droppable ID:", destination.droppableId)
      return
    }

    // Find the project
    const project = projects.find(p => p.id === projectId)
    if (!project) return

    // Get the task from the tasks map
    const task = tasksMap.get(draggableId)
    if (!task) return

    // Expand the destination status section if it's collapsed
    const destStatusId = `${projectId}-${destStatusGroupName.toLowerCase().replace(/\s+/g, "-")}`
    if (!expandedStatuses.includes(destStatusId)) {
      setExpandedStatuses(prev => [...prev, destStatusId])
    }

    // Convert status group name to database status
    const newStatus = statusGroupToDbStatus[destStatusGroupName] as TaskWithDetails['status']
    if (!newStatus) {
      console.error("Could not map status group name to database status:", destStatusGroupName)
      return
    }

    // Update task status in database
    if (session?.user?.id) {
      try {
        await updateTaskPosition(draggableId, destination.index, newStatus, session.user.id)
        
        // Reload projects to reflect the change
        const loadData = async () => {
          if (!activeSpace) return
          const projectsData = await fetchProjectsOptimized(activeSpace)
          const projectIds = projectsData.map(p => p.id)
          const allTasksData = projectIds.length > 0 
            ? await Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
            : []
          
          const newTasksMap = new Map<string, TaskWithDetails>()
          allTasksData.forEach(task => {
            newTasksMap.set(task.id, task)
          })
          setTasksMap(newTasksMap)
          
          const transformedProjects: Project[] = projectsData.map((project) => {
            const projectTasks = allTasksData.filter(t => t.project_id === project.id)
            const designTasks = projectTasks.map(transformTaskToDesignTask)
            const statusGroups = groupTasksByStatus(designTasks)
            
            return {
              id: project.id,
              name: project.name || "Unnamed Project",
              dueDate: "-",
              launchDate: undefined,
              statusGroups,
              taskCount: projectTasks.length
            }
          })
          
          setProjects(transformedProjects)
        }
        loadData()
      } catch (error) {
        console.error("Error updating task status:", error)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-0">
      {/* Header with Actions */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border/50">
        <div>
          <h2 className="text-base font-medium">Projects & Tasks</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (projects.length === 0) {
                // If no projects, show project creation modal instead
                setIsCreateProjectOpen(true)
              } else {
                setIsCreateTaskOpen(true)
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Task
          </button>
          <button 
            onClick={() => setIsCreateProjectOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">
          No projects yet. Create your first project to get started.
        </div>
      ) : (
        projects.map((project) => {
          const isProjectExpanded = expandedProjects.includes(project.id)
          
          // Check if launch date is in the future
          const isUpcomingLaunch = project.launchDate ? (() => {
            try {
              const [month, day, year] = project.launchDate.split('/')
              const launchDate = new Date(2000 + parseInt(year), parseInt(month) - 1, parseInt(day))
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              return launchDate >= today
            } catch (e) {
              return false
            }
          })() : false
          
          return (
            <div key={project.id} className="border-b border-border/50 last:border-0">
              {/* Project Header */}
              <button
                onClick={() => toggleProject(project.id)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors group"
              >
                <ChevronRight 
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    isProjectExpanded ? "rotate-90" : ""
                  }`}
                />
                <span className="text-sm font-medium">{project.name}</span>
                {project.taskCount !== undefined && (
                  <span className="text-xs text-muted-foreground ml-1.5">
                    ({project.taskCount})
                  </span>
                )}
                <div className="flex items-center gap-3 ml-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>{project.dueDate}</span>
                  </div>
                  {isUpcomingLaunch && project.launchDate && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-purple-50 text-purple-700 rounded-md">
                      <span className="text-[10px] font-medium">LAUNCH</span>
                      <span>{project.launchDate}</span>
                    </div>
                  )}
                </div>
                <MoreHorizontal className="w-4 h-4 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Project Content */}
              {isProjectExpanded && (
                <DragDropContext onDragEnd={handleDragEnd}>
                  <div className="bg-muted/20">
                    {project.statusGroups
                      .filter((statusGroup) => statusGroup.tasks.length > 0)
                      .map((statusGroup) => {
                      const statusId = `${project.id}-${statusGroup.name.toLowerCase().replace(" ", "-")}`
                      const isStatusExpanded = expandedStatuses.includes(statusId)
                      const droppableId = `${project.id}-${statusGroup.name.toLowerCase().replace(/\s+/g, "-")}`

                      return (
                        <Droppable droppableId={droppableId} key={statusId}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`border-t border-border/40 ${snapshot.isDraggingOver ? 'bg-muted/40' : ''}`}
                            >
                              {/* Status Group Header */}
                              <button
                                onClick={() => toggleStatus(statusId)}
                                className="w-full flex items-center gap-2 px-8 py-2.5 hover:bg-muted/50 transition-colors"
                              >
                                <ChevronRight 
                                  className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                                    isStatusExpanded ? "rotate-90" : ""
                                  }`}
                                />
                                <div 
                                  className="w-2 h-2 rounded-full"
                                  style={{ backgroundColor: statusGroup.color }}
                                />
                                <span className="text-xs font-medium tracking-wide" style={{ color: statusGroup.color }}>
                                  {statusGroup.name} {statusGroup.tasks.length}
                                </span>
                              </button>

                              {/* Tasks List */}
                              {isStatusExpanded && (
                                <div className="pb-2">
                                  {/* Table Header */}
                                  <div className="grid grid-cols-12 gap-4 px-12 py-2 text-xs text-muted-foreground border-b border-border/30 opacity-60">
                                    <div className="col-span-4">Name</div>
                                    <div className="col-span-2">Assignee</div>
                                    <div className="col-span-2">Status</div>
                                    <div className="col-span-2 text-center">Due date</div>
                                    <div className="col-span-1">Priority</div>
                                    <div className="col-span-1"></div>
                                  </div>

                                  {/* Tasks */}
                                  {statusGroup.tasks.map((task, index) => {
                                    const taskData = tasksMap.get(task.id)
                                    return (
                                      <Draggable key={task.id} draggableId={task.id} index={index}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            className={snapshot.isDragging ? 'opacity-50' : ''}
                                          >
                                            <TaskRow
                                              task={task}
                                              isSelected={selectedTasks.includes(task.id)}
                                              onToggleSelect={handleToggleSelect}
                                              onUpdate={handleTaskUpdate}
                                              onDelete={handleTaskDelete}
                                              showMultiSelect={isSelectionMode}
                                              selectedTasks={selectedTasks}
                                              onTaskClick={handleTaskClick}
                                              users={users}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    )
                                  })}

                                  {/* Inline Task Creation */}
                                  {showingInlineCreate === statusId && (
                                    <InlineTaskCreation
                                      statusColor={statusGroup.color}
                                      users={users}
                                      onSave={async (task) => {
                                        if (!session?.user?.id || !project.id) {
                                          console.error("Missing session or project ID")
                                          setShowingInlineCreate(null)
                                          return
                                        }

                                        try {
                                          // Extract status from task or use the status group's default
                                          const taskStatus = task.status || statusGroupToDbStatus[statusGroup.name] || "todo"
                                          
                                          // Map priority to database format
                                          const priorityMap: Record<string, string> = {
                                            "High": "high",
                                            "Normal": "medium",
                                            "Low": "low"
                                          }
                                          const dbPriority = task.priority ? priorityMap[task.priority] || "medium" : "medium"

                                          // Use assignee ID directly (already in correct format)
                                          const assigneeUserId = task.assignee

                                          const taskData = {
                                            project_id: project.id,
                                            title: task.name.trim(),
                                            description: undefined,
                                            status: taskStatus as TaskWithDetails['status'],
                                            priority: dbPriority as TaskWithDetails['priority'],
                                            assigned_to: assigneeUserId || undefined,
                                            due_date: task.dueDate ? formatDateForDatabase(task.dueDate) : undefined,
                                            estimated_hours: 0,
                                            actual_hours: 0,
                                            position: statusGroup.tasks.length + 1,
                                            created_by: session.user.id
                                          }

                                          const result = await createTask(taskData, session.user.id)
                                          
                                          if (result) {
                                            // Reload data to show the new task
                                            const loadData = async () => {
                                              const projectsData = await fetchProjectsOptimized(activeSpace ?? undefined)
                                              const projectIds = projectsData.map(p => p.id)
                                              const allTasksData = projectIds.length > 0 
                                                ? await Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
                                                : []
                                              
                                              const newTasksMap = new Map<string, TaskWithDetails>()
                                              allTasksData.forEach(task => {
                                                newTasksMap.set(task.id, task)
                                              })
                                              setTasksMap(newTasksMap)
                                              
                                              const transformedProjects: Project[] = projectsData.map((p) => {
                                                const projectTasks = allTasksData.filter(t => t.project_id === p.id)
                                                const designTasks = projectTasks.map(transformTaskToDesignTask)
                                                const statusGroups = groupTasksByStatus(designTasks)
                                                return {
                                                  id: p.id,
                                                  name: p.name || "Unnamed Project",
                                                  dueDate: "-",
                                                  launchDate: undefined,
                                                  statusGroups,
                                                  taskCount: projectTasks.length
                                                }
                                              })
                                              setProjects(transformedProjects)
                                            }
                                            await loadData()
                                          }
                                        } catch (error) {
                                          console.error("Error creating task:", error)
                                        }
                                        
                                        setShowingInlineCreate(null)
                                      }}
                                      onCancel={() => setShowingInlineCreate(null)}
                                    />
                                  )}

                                  {/* Add Task Button */}
                                  {showingInlineCreate !== statusId && (
                                    <button 
                                      onClick={() => setShowingInlineCreate(statusId)}
                                      className="flex items-center gap-1.5 px-12 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      <span>Add task</span>
                                    </button>
                                  )}
                                </div>
                              )}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      )
                    })}
                  </div>
                </DragDropContext>
              )}
            </div>
          )
        })
      )}

      {/* Creation Dialogs */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          onProjectCreated={() => {
            setIsCreateProjectOpen(false)
            // Reload projects
            const loadData = async () => {
              if (!activeSpace) return
              const projectsData = await fetchProjectsOptimized(activeSpace)
              const allTasksData = await fetchTasksOptimized()
              const transformedProjects: Project[] = await Promise.all(
                projectsData.map(async (project) => {
                  const projectTasks = allTasksData.filter(t => t.project_id === project.id)
                  const designTasks = projectTasks.map(transformTaskToDesignTask)
                  const statusGroups = groupTasksByStatus(designTasks)
                  return {
                    id: project.id,
                    name: project.name || "Unnamed Project",
                    dueDate: "-",
                    launchDate: undefined,
                    statusGroups,
                    taskCount: projectTasks.length
                  }
                })
              )
              setProjects(transformedProjects)
            }
            loadData()
          }}
        />
      )}
      
      {isCreateTaskOpen && selectedProjectId && (
        <CreateTaskModal
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={() => {
            setIsCreateTaskOpen(false)
            // Reload projects
            const loadData = async () => {
              if (!activeSpace) return
              const projectsData = await fetchProjectsOptimized(activeSpace)
              const projectIds = projectsData.map(p => p.id)
              const allTasksData = projectIds.length > 0 
                ? await Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
                : []
              const transformedProjects: Project[] = projectsData.map((project) => {
                const projectTasks = allTasksData.filter(t => t.project_id === project.id)
                const designTasks = projectTasks.map(transformTaskToDesignTask)
                const statusGroups = groupTasksByStatus(designTasks)
                return {
                  id: project.id,
                  name: project.name || "Unnamed Project",
                  dueDate: "-",
                  launchDate: undefined,
                  statusGroups,
                  taskCount: projectTasks.length
                }
              })
              setProjects(transformedProjects)
            }
            loadData()
          }}
          projectId={selectedProjectId}
          users={users}
        />
      )}

      {/* Task Detail Sidebar */}
      <TaskDetailSidebar
        task={selectedTaskForSidebar}
        isOpen={isTaskSidebarOpen}
        onClose={handleCloseTaskSidebar}
        onEditTask={handleEditTask}
        onDeleteTask={handleTaskDelete}
        projectTitle={projects.find(p => p.id === selectedTaskForSidebar?.project_id)?.name}
      />

      {/* Bulk Edit Bar */}
      {selectedTasks.length > 0 && (
        <BulkEditBar
          selectedCount={selectedTasks.length}
          onClearSelection={handleClearSelection}
          onBulkUpdate={handleBulkUpdate}
          onBulkDelete={handleBulkDelete}
          users={users}
        />
      )}
    </div>
  )
}

