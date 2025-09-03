"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { 
  Plus, 
  MoreVertical, 
  Calendar, 
  Clock,
  MessageSquare,
  Search,
  Edit,
  Trash2,
  Users,
  CheckSquare
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import { Task, TaskWithDetails, Project, ProjectWithDetails, User } from '@/lib/supabase'
import { 
  fetchProjects, 
  fetchTasks, 
  fetchUsers,
  updateTaskPosition, 
  subscribeToTasks, 
  subscribeToProjects,
  testDatabaseConnection,
  deleteTask
} from '@/lib/database-functions'
import CreateProjectModal from '@/components/modals/create-project-modal'
import CreateTaskModal from '@/components/modals/create-task-modal'
import EditProjectModal from '@/components/modals/edit-project-modal'
import { ManageProjectUsersModal } from '@/components/modals/manage-project-users-modal'
import { EditTaskModal } from '@/components/modals/edit-task-modal'
import { ManageTaskAssignmentsModal } from '@/components/modals/manage-task-assignments-modal'



const columns = [
  { id: 'todo', title: 'To Do', bgColor: 'bg-gray-50', borderColor: 'border-gray-200' },
  { id: 'in_progress', title: 'In Progress', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
  { id: 'review', title: 'Review', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { id: 'done', title: 'Done', bgColor: 'bg-green-50', borderColor: 'border-green-200' }
]

const priorityColors = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800', 
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800'
}

interface TaskCardProps {
  task: TaskWithDetails
  index: number
  userRole: string
  onEditTask: (task: TaskWithDetails) => void
  onDeleteTask: (taskId: string) => void
  onManageAssignments: (task: TaskWithDetails) => void
}

function TaskCard({ task, index, userRole, onEditTask, onDeleteTask, onManageAssignments }: TaskCardProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const canEdit = userRole === 'admin' || userRole === 'manager'

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`mb-3 ${snapshot.isDragging ? 'rotate-3 scale-105' : ''}`}
        >
          <Card className="cursor-move hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <CardTitle className="text-sm font-medium leading-tight">
                  {task.title}
                </CardTitle>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditTask(task)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit Task
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageAssignments(task)}>
                        <Users className="mr-2 h-4 w-4" />
                        Manage Assignments
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => onDeleteTask(task.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Task
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {task.description && (
                <p className="text-xs text-gray-600 mt-1">
                  {task.description.length > 60 
                    ? `${task.description.substring(0, 60)}...` 
                    : task.description
                  }
                </p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-1 mb-2">
                <Badge variant="secondary" className={priorityColors[task.priority]}>
                  {task.priority}
                </Badge>
                {task.due_date && (
                  <Badge 
                    variant={isOverdue ? "destructive" : "outline"}
                    className="text-xs"
                  >
                    <Calendar className="mr-1 h-3 w-3" />
                    {format(new Date(task.due_date), 'MMM d')}
                  </Badge>
                )}
              </div>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  {task.estimated_hours > 0 && (
                    <span className="flex items-center">
                      <Clock className="mr-1 h-3 w-3" />
                      {task.actual_hours}h/{task.estimated_hours}h
                    </span>
                  )}
                  {(task.comment_count ?? 0) > 0 && (
                    <span className="flex items-center">
                      <MessageSquare className="mr-1 h-3 w-3" />
                      {task.comment_count}
                    </span>
                  )}
                </div>
                
                {task.assigned_to && (
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assigned_user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  )
}

interface KanbanColumnProps {
  column: typeof columns[0]
  tasks: TaskWithDetails[]
  userRole: string
  onAddTask: (status: Task['status']) => void
  onEditTask: (task: TaskWithDetails) => void
  onDeleteTask: (taskId: string) => void
  onManageAssignments: (task: TaskWithDetails) => void
}

function KanbanColumn({ column, tasks, userRole, onAddTask, onEditTask, onDeleteTask, onManageAssignments }: KanbanColumnProps) {
  const canCreateTask = userRole === 'admin' || userRole === 'manager'

  return (
    <div className="flex-1 min-w-72">
      <div className={`${column.bgColor} ${column.borderColor} border-2 border-dashed rounded-lg p-4 h-full`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            {column.title}
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </h3>
          {canCreateTask && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 px-2"
              onClick={() => onAddTask(column.id as Task['status'])}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <Droppable droppableId={column.id}>
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`min-h-32 ${snapshot.isDraggingOver ? 'bg-opacity-50' : ''}`}
            >
              {tasks.map((task, index) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  index={index}
                  userRole={userRole}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  onManageAssignments={onManageAssignments}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  )
}

export default function ProjectsTab() {
  const { data: session } = useSession()
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPriority, setFilterPriority] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false)
  const [showEditProjectModal, setShowEditProjectModal] = useState(false)
  const [showManageUsersModal, setShowManageUsersModal] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [showManageTaskAssignmentsModal, setShowManageTaskAssignmentsModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<TaskWithDetails | null>(null)
  const [selectedTaskStatus, setSelectedTaskStatus] = useState<Task['status']>('todo')
  const [users, setUsers] = useState<User[]>([])

  const userRole = session?.user?.role || 'user'
  const currentProject = projects.find(p => p.id === selectedProject)
  
  // Filter tasks for selected project
  const projectTasks = tasks.filter(task => 
    task.project_id === selectedProject &&
    (searchTerm === '' || task.title.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterPriority === 'all' || task.priority === filterPriority)
  )

  // Group tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = projectTasks
      .filter(task => task.status === column.id)
      .sort((a, b) => a.position - b.position)
    return acc
  }, {} as Record<string, TaskWithDetails[]>)

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        // Test database connection first
        await testDatabaseConnection()
        
        // Get user's company ID for filtering (only non-admin users should be filtered)
        const userCompanyId = session?.user?.role === 'admin' ? undefined : session?.user?.company_id
        
        const [projectsData, tasksData] = await Promise.all([
          fetchProjects(userCompanyId),
          fetchTasks()
        ])
        
        setProjects(projectsData)
        setTasks(tasksData)
        
        // Set first project as selected if available
        if (projectsData.length > 0 && !selectedProject) {
          setSelectedProject(projectsData[0].id)
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [session?.user?.role, session?.user?.company_id])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!selectedProject) return

    const tasksSubscription = subscribeToTasks(selectedProject, (updatedTasks) => {
      setTasks(updatedTasks)
    })

    const projectsSubscription = subscribeToProjects((updatedProjects) => {
      setProjects(updatedProjects)
    })

    return () => {
      tasksSubscription?.unsubscribe()
      projectsSubscription?.unsubscribe()
    }
  }, [selectedProject])

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return
    if (destination.droppableId === source.droppableId && destination.index === source.index) return

    const task = tasks.find(t => t.id === draggableId)
    if (!task || !session?.user?.id) return

    // Update task status and position
    const updatedTask = {
      ...task,
      status: destination.droppableId as Task['status'],
      position: destination.index + 1
    }

    // Optimistic update
    setTasks(prevTasks => 
      prevTasks.map(t => t.id === draggableId ? updatedTask : t)
    )

    // Update in database
    try {
      await updateTaskPosition(draggableId, destination.index + 1, destination.droppableId as Task['status'], session.user.id)
    } catch (error) {
      // Revert optimistic update on error
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === draggableId ? task : t)
      )
    }
  }

  const handleProjectCreated = async () => {
    // Refresh projects list
    try {
      const projectsData = await fetchProjects()
      setProjects(projectsData)
      
      // Select the newly created project if it's the first one
      if (projectsData.length === 1) {
        setSelectedProject(projectsData[0].id)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const handleAddTask = (status: Task['status']) => {
    setSelectedTaskStatus(status)
    setShowCreateTaskModal(true)
  }

  const handleTaskCreated = async () => {
    // Refresh tasks and projects list
    try {
      const [tasksData, projectsData] = await Promise.all([
        fetchTasks(selectedProject),
        fetchProjects()
      ])
      setTasks(tasksData)
      setProjects(projectsData)
      
      // Also update the current project's task count immediately
      if (currentProject) {
        const updatedProject = projectsData.find(p => p.id === currentProject.id)
        if (updatedProject) {
          setProjects(prevProjects => 
            prevProjects.map(p => 
              p.id === currentProject.id 
                ? { ...p, task_count: updatedProject.task_count }
                : p
            )
          )
        }
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const handleEditTask = (task: TaskWithDetails) => {
    setSelectedTask(task)
    setShowEditTaskModal(true)
  }

  const handleTaskUpdated = async () => {
    try {
      const updatedTasks = await fetchTasks(selectedProject)
      setTasks(updatedTasks)
    } catch (error) {
      // Handle error silently
    }
  }

  const handleManageTaskAssignments = (task: TaskWithDetails) => {
    setSelectedTask(task)
    setShowManageTaskAssignmentsModal(true)
  }

  const handleAssignmentsUpdated = async () => {
    try {
      const updatedTasks = await fetchTasks(selectedProject)
      setTasks(updatedTasks)
    } catch (error) {
      // Handle error silently
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) {
      return
    }

    try {
      const result = await deleteTask(taskId)
      if (result.success) {
        // Refresh tasks
        const updatedTasks = await fetchTasks(selectedProject)
        setTasks(updatedTasks)
      } else {
        // Handle error silently
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const handleEditProject = () => {
    setShowEditProjectModal(true)
  }

  const handleManageUsers = () => {
    setShowManageUsersModal(true)
  }

  const handleProjectUpdated = async () => {
    // Refresh projects list
    try {
      const projectsData = await fetchProjects()
      setProjects(projectsData)
    } catch (error) {
      // Handle error silently
    }
  }

  // Load users for task assignment
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers()
        setUsers(usersData)
      } catch (error) {
        // Handle error silently
      }
    }
    loadUsers()
  }, [])

  if (!session) {
    return <div>Loading...</div>
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Project Management</h2>
          <p className="text-gray-600 mt-1">
            Organize and track your project tasks with our kanban board
          </p>
          {projects.length === 0 && tasks.length === 0 && (
            <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Demo Mode:</strong> No database connected. Projects and tasks will be empty until you configure Supabase.
                <br />
                <span className="text-xs">See the setup guide for database configuration instructions.</span>
              </p>
            </div>
          )}
        </div>
        
        {(userRole === 'admin' || userRole === 'manager') && (
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
            {selectedProject ? (
              <Button 
                variant="outline" 
                className="gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all duration-200 border-green-200" 
                onClick={() => {
                  setSelectedTaskStatus('todo')
                  setShowCreateTaskModal(true)
                }}
                title={`Create new task in ${currentProject?.name || 'selected project'}`}>
                <CheckSquare className="h-4 w-4" />
                New Task
              </Button>
            ) : (
              <Button 
                variant="outline" 
                className="gap-2 opacity-50 cursor-not-allowed transition-all duration-200" 
                disabled
                title="Select a project first to create tasks">
                <CheckSquare className="h-4 w-4" />
                New Task
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Project Selection & Filters */}
      <div className="flex gap-4 flex-wrap">
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                <div className="flex items-center gap-2">
                  <span>{project.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {project.task_count || 0} tasks
                  </Badge>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project Info */}
      {currentProject && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {currentProject.name}
                  <Badge variant={currentProject.status === 'active' ? 'default' : 'secondary'}>
                    {currentProject.status}
                  </Badge>
                </CardTitle>
                {currentProject.description && (
                  <p className="text-gray-600 mt-1">{currentProject.description}</p>
                )}
              </div>
              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleEditProject}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleManageUsers}>
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(column => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={tasksByStatus[column.id] || []}
              userRole={userRole}
              onAddTask={handleAddTask}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onManageAssignments={handleManageTaskAssignments}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {tasksByStatus.todo?.length || 0}
            </div>
            <div className="text-sm text-gray-600">To Do</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {tasksByStatus.in_progress?.length || 0}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {tasksByStatus.review?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Review</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              {tasksByStatus.done?.length || 0}
            </div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={showCreateTaskModal}
        onClose={() => setShowCreateTaskModal(false)}
        onTaskCreated={handleTaskCreated}
        projectId={selectedProject}
        initialStatus={selectedTaskStatus}
        users={users}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditProjectModal}
        onClose={() => setShowEditProjectModal(false)}
        onProjectUpdated={handleProjectUpdated}
        project={currentProject || null}
        users={users}
      />

      {/* Manage Project Users Modal */}
      <ManageProjectUsersModal
        isOpen={showManageUsersModal}
        onClose={() => setShowManageUsersModal(false)}
        onProjectUpdated={handleProjectUpdated}
        project={currentProject || null}
      />

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={showEditTaskModal}
        onClose={() => setShowEditTaskModal(false)}
        onTaskUpdated={handleTaskUpdated}
        task={selectedTask}
        users={users}
      />

      {/* Manage Task Assignments Modal */}
      <ManageTaskAssignmentsModal
        isOpen={showManageTaskAssignmentsModal}
        onClose={() => setShowManageTaskAssignmentsModal(false)}
        onAssignmentsUpdated={handleAssignmentsUpdated}
        task={selectedTask}
        users={users}
      />
    </div>
  )
} 