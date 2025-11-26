"use client"

import { CheckSquare, Clock, AlertCircle, MoreHorizontal, ChevronRight, Plus, Calendar, FolderKanban, Edit, Archive } from "lucide-react"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { TaskRow } from "./task-row"
import { InlineTaskCreation } from "./inline-task-creation"
import { BulkEditBar } from "./bulk-edit-bar"
import { fetchProjectsOptimized, fetchTasksOptimized, fetchUsersOptimized, updateTaskPosition } from "@/lib/simplified-database-functions"
import { supabase } from "@/lib/supabase"
import { updateTaskStatus, createTask, fetchUsers, updateTask, deleteTask, archiveProject, updateProjectPosition } from "@/lib/database-functions"
import { formatDateForDatabase } from "@/lib/date-utils"
import { toastSuccess, toastError } from "@/lib/toast"
import { ProjectWithDetails, TaskWithDetails, User, Task } from "@/lib/supabase"
import { format } from "date-fns"
import { useSession } from "@/components/providers/session-provider"
import CreateProjectModal from "@/components/modals/create-project-modal"
import CreateTaskModal from "@/components/modals/create-task-modal"
import TaskDetailSidebar from "@/components/task-detail-sidebar"
import EditProjectModal from "@/components/modals/edit-project-modal"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { LoadingSpinner } from "@/components/ui/loading-states"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"

interface DesignTask {
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
  tasks: DesignTask[]
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

function transformTaskToDesignTask(task: TaskWithDetails): DesignTask & { originalStatus?: string } {
  const assignee = task.assigned_user?.full_name 
    ? task.assigned_user.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : ""
  
  // Parse date using local timezone to avoid shifts
  let dueDate = ""
  if (task.due_date) {
    try {
      // Handle both ISO string and YYYY-MM-DD format
      let date: Date
      if (typeof task.due_date === 'string' && task.due_date.includes('T')) {
        // ISO string - extract date components in UTC to avoid timezone shifts
        const isoDate = new Date(task.due_date)
        const utcYear = isoDate.getUTCFullYear()
        const utcMonth = isoDate.getUTCMonth()
        const utcDay = isoDate.getUTCDate()
        date = new Date(utcYear, utcMonth, utcDay) // Create in local timezone
      } else {
        // YYYY-MM-DD format - parse directly as local date
        const [yearStr, monthStr, dayStr] = task.due_date.split('-')
        date = new Date(parseInt(yearStr), parseInt(monthStr) - 1, parseInt(dayStr))
      }
      // Format using local date components
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      dueDate = `${month}/${day}/${year}`
    } catch (e) {
      console.error("Error parsing due_date:", e)
      dueDate = ""
    }
  }
  
  const priority = task.priority 
    ? ((task.priority as string) === 'medium' ? 'Normal' : task.priority.charAt(0).toUpperCase() + task.priority.slice(1))
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
  } as DesignTask & { originalStatus?: string }
}

function groupTasksByStatus(tasks: (DesignTask & { originalStatus?: string })[]): StatusGroup[] {
  const groups: Record<string, DesignTask[]> = {}
  
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
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false)
  const [deletingTasks, setDeletingTasks] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>("")
  const [selectedTaskForSidebar, setSelectedTaskForSidebar] = useState<TaskWithDetails | null>(null)
  const [isTaskSidebarOpen, setIsTaskSidebarOpen] = useState(false)
  const [tasksMap, setTasksMap] = useState<Map<string, TaskWithDetails>>(new Map())
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [selectedProjectForEdit, setSelectedProjectForEdit] = useState<ProjectWithDetails | null>(null)
  const [editModalUsers, setEditModalUsers] = useState<User[]>([])
  const [projectsData, setProjectsData] = useState<ProjectWithDetails[]>([])

  useEffect(() => {
    const loadData = async () => {
      if (!activeSpace) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        // Fetch projects and users in parallel
        const [projectsData, usersData, internalAssignmentsResult] = await Promise.all([
          fetchProjectsOptimized(activeSpace || undefined),
          fetchUsersOptimized(),
          supabase ? (async () => {
            try {
              const result = await supabase
                .from('internal_user_companies')
                .select('user_id')
                .eq('company_id', activeSpace)
              return result
            } catch {
              return { data: null, error: null }
            }
          })() : Promise.resolve({ data: null, error: null })
        ])
        
        // Get direct company users (users, managers, admins)
        const directSpaceUsers = usersData.filter(user => 
          user.company_id === activeSpace && 
          user.is_active !== false &&
          (user.role === 'user' || user.role === 'manager' || user.role === 'admin')
        )
        
        // Get internal user IDs
        const internalUserIds: string[] = []
        if (internalAssignmentsResult && !internalAssignmentsResult.error && internalAssignmentsResult.data) {
          internalUserIds.push(...internalAssignmentsResult.data.map((ia: { user_id: string }) => ia.user_id))
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
        
        // Store projects data for edit modal
        setProjectsData(projectsData)
        
        // Fetch tasks for projects in this space in parallel
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

  // Load users for edit modal
  useEffect(() => {
    const loadEditModalUsers = async () => {
      try {
        const usersData = await fetchUsers()
        setEditModalUsers(usersData)
      } catch (error) {
        console.error("Error loading users for edit modal:", error)
      }
    }
    loadEditModalUsers()
  }, [])

  const handleProjectUpdated = () => {
    // Reload projects after update
    const loadData = async () => {
      if (!activeSpace) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
        setProjectsData(projectsData)
        
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
      } catch (error) {
        console.error("Error reloading projects:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
    setShowEditProjectModal(false)
    setSelectedProjectForEdit(null)
  }

  const handleArchiveProject = async (projectId: string) => {
    const result = await archiveProject(projectId)
    if (result.success) {
      // Reload projects after archiving
      const loadData = async () => {
        if (!activeSpace) {
          setLoading(false)
          return
        }

        setLoading(true)
        try {
          const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
          setProjectsData(projectsData)
          
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
        } catch (error) {
          console.error("Error reloading projects:", error)
        } finally {
          setLoading(false)
        }
      }
      loadData()
    } else {
      console.error("Error archiving project:", result.error)
      alert(`Failed to archive project: ${result.error}`)
    }
  }

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

  const handleTaskUpdate = async (taskId: string, updates: Partial<DesignTask>) => {
    
    if (!session?.user?.id) return
    
    const task = tasksMap.get(taskId)
    if (!task) return

    try {
      // Map TaskRow field names to database field names
      const dbUpdates: Partial<{
        title: string
        assigned_to: string | null
        status: string
        priority: string
        due_date: string | null
      }> = {}

      // Handle name -> title
      if ('name' in updates && updates.name !== undefined && updates.name !== null && typeof updates.name === 'string') {
        dbUpdates.title = updates.name
      }

      // Handle assignee -> assigned_to
      if ('assignee' in updates && updates.assignee !== undefined) {
        dbUpdates.assigned_to = (typeof updates.assignee === 'string' ? updates.assignee : null)
      }

      // Handle status
      if ('status' in updates && updates.status) {
        dbUpdates.status = updates.status
      }

      // Handle priority - map TaskRow labels to database values
      // Database still uses 'medium', but we display it as 'normal'
      if ('priority' in updates && updates.priority) {
        const priorityMap: Record<string, string> = {
          'urgent': 'urgent',
          'high': 'high',
          'normal': 'medium', // Map 'normal' to 'medium' for database compatibility
          'low': 'low',
          'medium': 'medium' // Keep 'medium' as is for backwards compatibility
        }
        const normalizedPriority = updates.priority.toLowerCase()
        dbUpdates.priority = priorityMap[normalizedPriority] || 'medium'
      }

      // Handle dueDate -> due_date (convert MM/dd/yy to database format)
      if ('dueDate' in updates) {
        if (updates.dueDate && typeof updates.dueDate === 'string') {
          try {
            const [month, day, year] = updates.dueDate.split("/")
            const fullYear = `20${year}`
            // Store as YYYY-MM-DD string (date-only, no time)
            const dbDate = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
            dbUpdates.due_date = dbDate
          } catch (e) {
            console.error("Error parsing date:", e)
            dbUpdates.due_date = null
          }
        } else {
          dbUpdates.due_date = null
        }
      }

      // Optimistically update UI immediately
      const updatedTask = { ...task }
      if (dbUpdates.title) updatedTask.title = dbUpdates.title
      if (dbUpdates.assigned_to !== undefined) updatedTask.assigned_to = dbUpdates.assigned_to || undefined
      if (dbUpdates.status) updatedTask.status = dbUpdates.status as TaskWithDetails['status']
      if (dbUpdates.priority) {
        // Use the mapped database value for priority
        updatedTask.priority = dbUpdates.priority as TaskWithDetails['priority']
      }
      if (dbUpdates.due_date !== undefined) updatedTask.due_date = dbUpdates.due_date || undefined

      // Update tasksMap optimistically
      const newTasksMap = new Map(tasksMap)
      newTasksMap.set(taskId, updatedTask)
      setTasksMap(newTasksMap)

      // Update projects optimistically
      setProjects(prevProjects => {
        return prevProjects.map(project => {
          const projectTasks = Array.from(newTasksMap.values()).filter(t => t.project_id === project.id)
          const designTasks = projectTasks.map(transformTaskToDesignTask)
          const statusGroups = groupTasksByStatus(designTasks)
          
          return {
            ...project,
            statusGroups,
            taskCount: projectTasks.length
          }
        })
      })

      // Update database
      const result = await updateTask(taskId, dbUpdates as Partial<Task>, session.user.id)
      
      if (!result.success) {
        // Revert optimistic update on error
        setTasksMap(tasksMap)
        // Reload to get correct state
        const loadData = async () => {
          if (!activeSpace) return
          const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
        console.error("Error updating task:", result.error)
      } else {
        // For assignee changes, reload to get user info
        if ('assignee' in updates) {
          const loadData = async () => {
            if (!activeSpace) return
            const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
      }
    } catch (error) {
      console.error("Error updating task:", error)
      // Reload on error to ensure consistency
      const loadData = async () => {
        if (!activeSpace) return
        const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
  }

  const handleTaskDelete = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        // Optimistically remove task from UI
        const newTasksMap = new Map(tasksMap)
        newTasksMap.delete(taskId)
        setTasksMap(newTasksMap)

        // Update projects to remove the task
        setProjects(prevProjects => {
          return prevProjects.map(project => {
            const updatedStatusGroups = project.statusGroups.map(statusGroup => ({
              ...statusGroup,
              tasks: statusGroup.tasks.filter(task => task.id !== taskId)
            }))
            
            const totalTasks = updatedStatusGroups.reduce((sum, sg) => sum + sg.tasks.length, 0)
            
            return {
              ...project,
              statusGroups: updatedStatusGroups,
              taskCount: totalTasks
            }
          })
        })

        // Close sidebar if the deleted task was open
        if (selectedTaskForSidebar?.id === taskId) {
          setIsTaskSidebarOpen(false)
          setSelectedTaskForSidebar(null)
        }

        toastSuccess("Task deleted successfully")

        // Reload data in background to ensure consistency
        const loadData = async () => {
          if (!activeSpace) return
          const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
        
        // Reload in background
        loadData().catch(error => {
          console.error("Error reloading data after delete:", error)
        })
      } else {
        console.error("Failed to delete task:", result.error)
        toastError(result.error || "Failed to delete task")
        // Reload data on error to ensure consistency
        const loadData = async () => {
          if (!activeSpace) return
          const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
      console.error("Error deleting task:", error)
      toastError("An error occurred while deleting the task")
      // Reload data on error
      const loadData = async () => {
        if (!activeSpace) return
        const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
  }

  const handleBulkUpdate = (updates: Partial<Task>) => {
    setSelectedTasks([])
    setIsSelectionMode(false)
    // TODO: Bulk update tasks in database
  }

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return

    setDeletingTasks(true)
    const tasksToDelete = [...selectedTasks]
    
    try {
      // Delete all selected tasks
      const deletePromises = tasksToDelete.map(taskId => deleteTask(taskId))
      const results = await Promise.all(deletePromises)
      
      // Check if any deletions failed
      const failedDeletions = results.filter(result => !result.success)
      
      if (failedDeletions.length > 0) {
        const errorMessages = failedDeletions.map(r => r.error).filter(Boolean).join(", ")
        toastError(`Failed to delete ${failedDeletions.length} task(s): ${errorMessages}`)
      }

      // Optimistically remove tasks from UI
      const newTasksMap = new Map(tasksMap)
      tasksToDelete.forEach(taskId => {
        newTasksMap.delete(taskId)
      })
      setTasksMap(newTasksMap)

      // Update projects to remove the deleted tasks
      setProjects(prevProjects => {
        return prevProjects.map(project => {
          const updatedStatusGroups = project.statusGroups.map(statusGroup => ({
            ...statusGroup,
            tasks: statusGroup.tasks.filter(task => !tasksToDelete.includes(task.id))
          }))
          
          const totalTasks = updatedStatusGroups.reduce((sum, sg) => sum + sg.tasks.length, 0)
          
          return {
            ...project,
            statusGroups: updatedStatusGroups,
            taskCount: totalTasks
          }
        })
      })

      // Close sidebar if any deleted task was open
      if (selectedTaskForSidebar && tasksToDelete.includes(selectedTaskForSidebar.id)) {
        setIsTaskSidebarOpen(false)
        setSelectedTaskForSidebar(null)
      }

      // Clear selection
      setSelectedTasks([])
      setIsSelectionMode(false)
      setShowBulkDeleteDialog(false)

      const successCount = results.filter(r => r.success).length
      if (successCount > 0) {
        toastSuccess(`Successfully deleted ${successCount} task(s)`)
      }

      // Reload data in background to ensure consistency
      const loadData = async () => {
        if (!activeSpace) return
        const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
            dueDate: (project as any).due_date ? format(new Date((project as any).due_date), "MM/dd/yy") : "-",
            launchDate: (project as any).launch_date ? format(new Date((project as any).launch_date), "MM/dd/yy") : undefined,
            statusGroups,
            taskCount: projectTasks.length
          }
        })
        setProjects(transformedProjects)
      }
      
      loadData()
    } catch (error) {
      console.error("Error bulk deleting tasks:", error)
      toastError("An unexpected error occurred while deleting tasks")
    } finally {
      setDeletingTasks(false)
    }
  }

  const handleClearSelection = () => {
    setSelectedTasks([])
    setIsSelectionMode(false)
  }

  const handleProjectDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.index === source.index) return

    // Reorder projects
    const reorderedProjects = Array.from(projects)
    const [removed] = reorderedProjects.splice(source.index, 1)
    reorderedProjects.splice(destination.index, 0, removed)

    // Optimistically update UI
    setProjects(reorderedProjects)

    // Update position in database
    try {
      await updateProjectPosition(
        draggableId,
        destination.index,
        activeSpace || undefined
      )
      
      // Silently refresh in background to ensure consistency
      setTimeout(async () => {
        try {
          const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
          const projectIds = projectsData.map(p => p.id)
          const allTasksData = projectsData.length > 0
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
        } catch (error) {
          console.error("Error reloading projects:", error)
        }
      }, 500)
    } catch (error) {
      console.error("Error updating project position:", error)
      // Revert on error
      try {
        const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
        const projectIds = projectsData.map(p => p.id)
        const allTasksData = projectsData.length > 0
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
      } catch (error) {
        console.error("Error reloading projects:", error)
      }
    }
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

    // Find source status group name
    let sourceStatusGroupName = ''
    for (const project of projects) {
      if (source.droppableId.startsWith(project.id + '-')) {
        const sourceStatusPart = source.droppableId.substring(project.id.length + 1)
        const statusMap: Record<string, string> = {
          'to-do': 'TO DO',
          'in-progress': 'IN PROGRESS',
          'review': 'REVIEW',
          'done': 'DONE'
        }
        sourceStatusGroupName = statusMap[sourceStatusPart.toLowerCase()] || sourceStatusPart.split('-').map(word => 
          word.toUpperCase()
        ).join(' ')
        break
      }
    }

    // Optimistically update UI immediately for smooth experience
    const updatedTask = { ...task, status: newStatus }
    const newTasksMap = new Map(tasksMap)
    newTasksMap.set(draggableId, updatedTask)
    setTasksMap(newTasksMap)

    // Optimistically update projects state
    setProjects(prevProjects => {
      return prevProjects.map(p => {
        if (p.id !== projectId) return p

        // Find source and destination status groups
        const sourceStatusGroup = p.statusGroups.find(sg => sg.name === sourceStatusGroupName)
        const destStatusGroup = p.statusGroups.find(sg => sg.name === destStatusGroupName)
        
        if (!sourceStatusGroup || !destStatusGroup) return p

        // Remove task from source group
        const sourceTasks = sourceStatusGroup.tasks.filter(t => t.id !== draggableId)
        const movedTask = sourceStatusGroup.tasks.find(t => t.id === draggableId)
        
        if (!movedTask) return p

        // Add task to destination group at the correct position
        const destTasks = [...destStatusGroup.tasks]
        destTasks.splice(destination.index, 0, { ...movedTask, status: newStatus })

        // Update status groups
        const updatedStatusGroups = p.statusGroups.map(sg => {
          if (sg.name === sourceStatusGroupName) {
            return { ...sg, tasks: sourceTasks }
          }
          if (sg.name === destStatusGroupName) {
            return { ...sg, tasks: destTasks }
          }
          return sg
        })

        return {
          ...p,
          statusGroups: updatedStatusGroups
        }
      })
    })

    // Update database in the background (no loading state)
    if (session?.user?.id) {
      updateTaskPosition(draggableId, destination.index, newStatus, session.user.id)
        .then(() => {
          // Silently refresh data in background to ensure consistency
          if (!activeSpace) return
          fetchProjectsOptimized(activeSpace || undefined)
            .then(projectsData => {
              // Update projectsData state to keep it in sync
              setProjectsData(projectsData)
              
              const projectIds = projectsData.map(p => p.id)
              return Promise.all([
                Promise.resolve(projectsData),
                projectIds.length > 0 
                  ? Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
                  : Promise.resolve([])
              ])
            })
            .then(([projectsData, allTasksData]) => {
              const refreshedTasksMap = new Map<string, TaskWithDetails>()
              allTasksData.forEach(task => {
                refreshedTasksMap.set(task.id, task)
              })
              setTasksMap(refreshedTasksMap)
              
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
            })
            .catch(error => {
              console.error("Error refreshing data after drag:", error)
            })
        })
        .catch(error => {
          console.error("Error updating task position:", error)
          // Revert optimistic update on error by reloading
          if (!activeSpace) return
          fetchProjectsOptimized(activeSpace || undefined)
            .then(projectsData => {
              // Update projectsData state to keep it in sync
              setProjectsData(projectsData)
              
              const projectIds = projectsData.map(p => p.id)
              return Promise.all([
                Promise.resolve(projectsData),
                projectIds.length > 0 
                  ? Promise.all(projectIds.map(id => fetchTasksOptimized(id))).then(results => results.flat())
                  : Promise.resolve([])
              ])
            })
            .then(([projectsData, allTasksData]) => {
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
            })
        })
    }
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
        <DragDropContext onDragEnd={handleProjectDragEnd}>
          <Droppable droppableId="projects-list">
            {(provided) => (
              <div 
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="space-y-4"
              >
                {projects.map((project, index) => {
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
                    <Draggable key={project.id} draggableId={project.id} index={index}>
                      {(provided, snapshot) => (
                        <Card 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          style={{
                            ...provided.draggableProps.style,
                          }}
                          className={`border-border/60 shadow-[0_0.5px_1.5px_0_rgba(0,0,0,0.05),0_0.5px_1px_-0.5px_rgba(0,0,0,0.05)] ${
                            snapshot.isDragging ? 'opacity-50 shadow-lg z-50' : ''
                          }`}
                        >
                          <CardContent className="p-0">
                            {/* Project Header */}
                            <div
                              {...provided.dragHandleProps}
                              onClick={(e) => {
                                // Only toggle if not dragging
                                if (!snapshot.isDragging) {
                                  toggleProject(project.id)
                                }
                              }}
                              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-muted/50 transition-colors group cursor-grab active:cursor-grabbing rounded-t-lg"
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
                <div className="ml-auto" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
                        <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        const projectData = projectsData.find(p => p.id === project.id)
                        if (projectData) {
                          setSelectedProjectForEdit(projectData)
                          setShowEditProjectModal(true)
                        }
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Project
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => {
                          if (confirm(`Are you sure you want to archive "${project.name}"? This will hide it from the project list but keep all data.`)) {
                            handleArchiveProject(project.id)
                          }
                        }}
                        className="text-muted-foreground"
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

                  {/* Project Content */}
                  {isProjectExpanded && (
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <div className="bg-muted/20">
                    {project.statusGroups
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
                                  {/* Table Header - Only show when there are tasks */}
                                  {statusGroup.tasks.length > 0 && (
                                    <div className="grid grid-cols-12 gap-4 px-12 py-2 text-xs text-muted-foreground border-b border-border/30 opacity-60">
                                      <div className="col-span-4">Name</div>
                                      <div className="col-span-2 text-center">Assignee</div>
                                      <div className="col-span-2 text-center">Status</div>
                                      <div className="col-span-2 text-center">Due date</div>
                                      <div className="col-span-1 text-center">Priority</div>
                                      <div className="col-span-1"></div>
                                    </div>
                                  )}

                                  {/* Tasks */}
                                  {statusGroup.tasks.length === 0 ? (
                                    <div className="px-12 py-4 text-center text-muted-foreground text-sm">
                                      No tasks in {statusGroup.name.toLowerCase()}
                                    </div>
                                  ) : (
                                    statusGroup.tasks.map((task, index) => {
                                      const taskData = tasksMap.get(task.id)
                                      return (
                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                          {(provided, snapshot) => (
                                            <div
                                              ref={provided.innerRef}
                                              {...provided.draggableProps}
                                              {...provided.dragHandleProps}
                                              style={{
                                                ...provided.draggableProps.style,
                                                // Ensure smooth animations for same-section dragging
                                                willChange: snapshot.isDragging ? 'transform' : 'auto',
                                              }}
                                              className={`${
                                                snapshot.isDragging 
                                                  ? 'opacity-50 shadow-lg z-50' 
                                                  : ''
                                              }`}
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
                                    })
                                  )}

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
                                            "Low": "low",
                                            "Normal": "normal",
                                            "High": "high",
                                            "Urgent": "urgent"
                                          }
                                          const dbPriority = task.priority ? priorityMap[task.priority] || "normal" : "normal"

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
                                          // Show error to user
                                          if (error instanceof Error) {
                                            alert(`Failed to create task: ${error.message}`)
                                          } else {
                                            alert('Failed to create task. Please check the console for details.')
                                          }
                                        }
                                        
                                        setShowingInlineCreate(null)
                                      }}
                                      onCancel={() => setShowingInlineCreate(null)}
                                    />
                                  )}

                                  {/* Add Task Button - Move after placeholder when dragging */}
                                  {!snapshot.isDraggingOver && showingInlineCreate !== statusId && (
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
                              {/* Add Task Button - Show after placeholder when dragging over */}
                              {snapshot.isDraggingOver && showingInlineCreate !== statusId && (
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
                        </Droppable>
                      )
                      })}
                      </div>
                    </DragDropContext>
                  )}
                </CardContent>
                      </Card>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      )}

      {/* Creation Dialogs */}
      {isCreateProjectOpen && (
        <CreateProjectModal
          isOpen={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
          activeSpace={activeSpace}
          onProjectCreated={() => {
            setIsCreateProjectOpen(false)
            // Reload projects
            const loadData = async () => {
              if (!activeSpace) return
              const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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
              const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
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

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditProjectModal}
        onClose={() => {
          setShowEditProjectModal(false)
          setSelectedProjectForEdit(null)
        }}
        onProjectUpdated={handleProjectUpdated}
        project={selectedProjectForEdit}
        users={editModalUsers}
      />

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
          onBulkDelete={() => setShowBulkDeleteDialog(true)}
          users={users}
        />
      )}

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Selected Tasks
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedTasks.length} task{selectedTasks.length !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowBulkDeleteDialog(false)}
              disabled={deletingTasks}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deletingTasks}
              className="gap-2"
            >
              {deletingTasks ? (
                <>
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                  Deleting...
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Delete {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

