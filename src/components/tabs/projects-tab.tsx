"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { useSearchParams } from 'next/navigation'
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
  CheckSquare,
  Building2,
  List,
  Grid3X3,
  User as UserIcon,
  Flag
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarIcon } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { Task, TaskWithDetails, Project, ProjectWithDetails, User, Company } from '@/lib/supabase'
import { supabase } from '@/lib/supabase'
import {
  fetchProjectsOptimized, 
  fetchTasksOptimized, 
  fetchUsersOptimized,
  fetchCompaniesOptimized,
  updateTaskPosition, 
  subscribeToTasksOptimized, 
  subscribeToProjectsOptimized,
  testDatabaseConnection,
  deleteTask,
  invalidateProjectCache
} from '@/lib/simplified-database-functions'
import { formatDateForDatabase } from '@/lib/date-utils'
import type { Subscription } from '@/lib/performance-optimizations'
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
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-sm font-medium leading-tight flex-1 min-w-0">
                  <span className="truncate block">{task.title}</span>
                </CardTitle>
                {canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-6 w-6 p-0 flex-shrink-0">
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
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  <Avatar className="h-6 w-6 flex-shrink-0">
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
    <div className="flex-1 min-w-0 xl:min-w-72">
      <div className={`${column.bgColor} ${column.borderColor} border-2 border-dashed rounded-lg p-3 sm:p-4 h-full`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm sm:text-base">
            {column.title}
            <Badge variant="secondary" className="text-xs">
              {tasks.length}
            </Badge>
          </h3>
          {canCreateTask && (
            <Button 
              size="sm" 
              variant="outline" 
              className="h-6 px-2 w-full sm:w-auto"
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

// List View Components
interface TaskRowProps {
  task: TaskWithDetails
  index: number
  userRole: string
  onEditTask: (task: TaskWithDetails) => void
  onDeleteTask: (taskId: string) => void
  onManageAssignments: (task: TaskWithDetails) => void
  onQuickEdit: (task: TaskWithDetails, field: string, value: string | null) => void
}

function TaskRow({ task, index, userRole, onEditTask, onDeleteTask, onManageAssignments, onQuickEdit }: TaskRowProps) {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date()
  const canEdit = userRole === 'admin' || userRole === 'manager'
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckSquare className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-purple-600" />
      case 'review':
        return <MessageSquare className="h-4 w-4 text-yellow-600" />
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Flag className="h-4 w-4 text-red-600" />
      case 'high':
        return <Flag className="h-4 w-4 text-orange-600" />
      case 'medium':
        return <Flag className="h-4 w-4 text-yellow-600" />
      case 'low':
        return <Flag className="h-4 w-4 text-green-600" />
      default:
        return <Flag className="h-4 w-4 text-gray-400" />
    }
  }

  const handleTitleEdit = async () => {
    if (editTitle.trim() !== task.title) {
      await onQuickEdit(task, 'title', editTitle.trim())
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleTitleEdit()
    } else if (e.key === 'Escape') {
      setEditTitle(task.title)
      setIsEditingTitle(false)
    }
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // Convert the selected date to YYYY-MM-DD format for the input
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const dateString = `${year}-${month}-${day}`
      
      onQuickEdit(task, 'due_date', formatDateForDatabase(dateString))
    }
  }

  const handlePrioritySelect = (priority: string) => {
    onQuickEdit(task, 'priority', priority)
  }

    return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`hidden sm:grid sm:grid-cols-12 gap-4 px-4 sm:px-6 py-3 border-b hover:bg-gray-50 cursor-move ${
            snapshot.isDragging ? 'bg-blue-50 shadow-lg' : ''
          }`}
        >
          {/* Desktop View */}
          {/* Name Column */}
          <div className="col-span-6 flex items-center space-x-3">
            {isEditingTitle ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleEdit}
                onKeyDown={handleTitleKeyDown}
                className="h-8 text-sm"
                autoFocus
              />
            ) : (
              <span 
                className="font-medium text-gray-900 cursor-pointer hover:bg-gray-100 px-2 py-1 rounded truncate"
                onClick={() => canEdit && setIsEditingTitle(true)}
              >
                {task.title}
              </span>
            )}
          </div>

          {/* Assignee Column */}
          <div className="col-span-2 flex items-center justify-center">
            {task.assigned_user ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs hover:bg-gray-100"
                onClick={() => onManageAssignments(task)}
              >
                <div className="flex items-center space-x-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {task.assigned_user?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-gray-600 truncate max-w-16">
                    {task.assigned_user?.full_name || 'Unknown'}
                  </span>
                </div>
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                onClick={() => onManageAssignments(task)}
              >
                <UserIcon className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Due Date Column */}
          <div className="col-span-2 flex items-center justify-center">
            {task.due_date ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs hover:bg-gray-100"
                  >
                    <Badge 
                      variant={isOverdue ? "destructive" : "outline"}
                      className="text-xs"
                    >
                      {format(new Date(task.due_date), 'MMM d')}
                    </Badge>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarIcon
                    mode="single"
                    selected={new Date(task.due_date)}
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            ) : (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="center">
                  <CalendarIcon
                    mode="single"
                    onSelect={handleDateSelect}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Priority Column */}
          <div className="col-span-1 flex items-center justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                >
                  {task.priority ? (
                    <div className="flex items-center space-x-1">
                      {getPriorityIcon(task.priority)}
                      <span className="text-xs text-gray-600">{task.priority}</span>
                    </div>
                  ) : (
                    <Flag className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                <DropdownMenuItem onClick={() => handlePrioritySelect('urgent')}>
                  <Flag className="mr-2 h-4 w-4 text-red-600" />
                  Urgent
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrioritySelect('high')}>
                  <Flag className="mr-2 h-4 w-4 text-orange-600" />
                  High
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrioritySelect('medium')}>
                  <Flag className="mr-2 h-4 w-4 text-yellow-600" />
                  Medium
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePrioritySelect('low')}>
                  <Flag className="mr-2 h-4 w-4 text-green-600" />
                  Low
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Actions Column */}
          <div className="col-span-1 flex justify-end">
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
        </div>
      )}
    </Draggable>
  )
}

interface ListViewProps {
  tasks: TaskWithDetails[]
  userRole: string
  onAddTask: (status: Task['status']) => void
  onEditTask: (task: TaskWithDetails) => void
  onDeleteTask: (taskId: string) => void
  onManageAssignments: (task: TaskWithDetails) => void
  onQuickEdit: (task: TaskWithDetails, field: string, value: string | null) => void
}

function ListView({ tasks, userRole, onAddTask, onEditTask, onDeleteTask, onManageAssignments, onQuickEdit }: ListViewProps) {
  const canCreateTask = userRole === 'admin' || userRole === 'manager'

  // Group tasks by status
  const tasksByStatus = columns.reduce((acc, column) => {
    acc[column.id] = tasks
      .filter(task => task.status === column.id)
      .sort((a, b) => a.position - b.position)
    return acc
  }, {} as Record<string, TaskWithDetails[]>)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'text-green-600 bg-green-100'
      case 'in_progress':
        return 'text-purple-600 bg-purple-100'
      case 'review':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckSquare className="h-4 w-4" />
      case 'in_progress':
        return <Clock className="h-4 w-4" />
      case 'review':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 rounded-full" />
    }
  }

    return (
    <div className="space-y-6">
      {columns.map(column => (
        <div key={column.id} className="bg-white rounded-lg border">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 sm:px-6 py-3 border-b bg-gray-50 gap-2">
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(column.id)}`}>
                {getStatusIcon(column.id)}
                {column.title}
              </div>
              <Badge variant="secondary" className="text-xs">
                {tasksByStatus[column.id]?.length || 0}
              </Badge>
            </div>
            {canCreateTask && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => onAddTask(column.id as Task['status'])}
                className="h-8 px-3 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            )}
          </div>

          {/* List Header - Hidden on mobile */}
          <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b bg-gray-50 text-sm font-medium text-gray-600">
            <div className="col-span-6">Name</div>
            <div className="col-span-2 text-center">Assignee</div>
            <div className="col-span-2 text-center">Due Date</div>
            <div className="col-span-1 text-center">Priority</div>
            <div className="col-span-1"></div>
          </div>

          {/* Tasks */}
          <Droppable droppableId={column.id}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`${snapshot.isDraggingOver ? 'bg-blue-50' : ''}`}
              >
                {tasksByStatus[column.id]?.map((task, index) => (
                  <TaskRow 
                    key={task.id} 
                    task={task} 
                    index={index}
                    userRole={userRole}
                    onEditTask={onEditTask}
                    onDeleteTask={onDeleteTask}
                    onManageAssignments={onManageAssignments}
                    onQuickEdit={onQuickEdit}
                  />
                ))}
                
                {/* Add Task Row */}
                {canCreateTask && (
                  <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-gray-50 cursor-pointer transition-colors">
                    <div className="col-span-6 flex items-center space-x-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onAddTask(column.id as Task['status'])}
                        className="h-8 px-3 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Task
                      </Button>
                    </div>
                    <div className="col-span-2"></div>
                    <div className="col-span-2"></div>
                    <div className="col-span-1"></div>
                    <div className="col-span-1"></div>
                  </div>
                )}
                
                {/* Mobile Add Task Button */}
                {canCreateTask && (
                  <div className="sm:hidden p-4 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAddTask(column.id as Task['status'])}
                      className="w-full h-10 text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                  </div>
                )}
                
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      ))}
    </div>
  )
  }

export default function ProjectsTab() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
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
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string | undefined>(undefined)
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('list')

  const userRole = session?.user?.role || 'user'
  const currentProject = projects.find(p => p.id === selectedProject)
  
  // Filter projects by selected company
  const filteredProjects = projects.filter(project => 
    selectedCompany ? project.company_id === selectedCompany : true
  )
  
  // Get current company info
  const currentCompany = companies.find(c => c.id === selectedCompany)
  
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
        
        const [projectsData, tasksData, companiesData] = await Promise.all([
          fetchProjectsOptimized(userCompanyId),
          fetchTasksOptimized(),
          fetchCompaniesOptimized()
        ])
        
        setProjects(projectsData)
        setTasks(tasksData)
        setCompanies(companiesData)
        
        // Check URL parameters first before setting default company
        const companyParam = searchParams.get('company')
        if (companyParam && companiesData.find(c => c.id === companyParam)) {
          console.log('Setting company from URL parameter:', companyParam)
          setSelectedCompany(companyParam)
        } else {
          // Set first company as selected if available (for admin users)
          if (session?.user?.role === 'admin' && companiesData.length > 0 && !selectedCompany) {
            setSelectedCompany(companiesData[0].id)
          }
          
          // For non-admin users, set their company automatically
          if (session?.user?.role !== 'admin' && session?.user?.company_id) {
            setSelectedCompany(session.user.company_id)
          }
        }
        
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

  // Handle company selection change
  useEffect(() => {
    if (selectedCompany) {
      // Find first project in selected company
      const firstProjectInCompany = projects.find(p => p.company_id === selectedCompany)
      if (firstProjectInCompany) {
        setSelectedProject(firstProjectInCompany.id)
      } else {
        setSelectedProject('')
      }
    }
  }, [selectedCompany, projects])

  // Handle URL parameters for company selection - with better timing
  useEffect(() => {
    const companyParam = searchParams.get('company')
    console.log('URL company parameter:', companyParam)
    console.log('Available companies:', companies.map(c => ({ id: c.id, name: c.name })))
    
    if (companyParam) {
      // Wait for companies to be loaded
      if (companies.length > 0) {
        // Check if the company exists in our companies list
        const companyExists = companies.find(c => c.id === companyParam)
        console.log('Company exists:', companyExists)
        if (companyExists) {
          console.log('Setting selected company to:', companyParam)
          setSelectedCompany(companyParam)
        }
      } else {
        console.log('Companies not loaded yet, will retry when loaded')
      }
    }
  }, [searchParams, companies])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!selectedProject) return

    let tasksSubscription: Subscription | null = null
    let projectsSubscription: Subscription | null = null

         try {
       tasksSubscription = subscribeToTasksOptimized(selectedProject, (updatedTasks) => {
         setTasks(updatedTasks)
       })

       projectsSubscription = subscribeToProjectsOptimized((updatedProjects) => {
         setProjects(updatedProjects)
       })
     } catch (error) {
       console.error('Error setting up subscriptions:', error)
     }

    return () => {
      try {
        if (tasksSubscription && typeof tasksSubscription.unsubscribe === 'function') {
          tasksSubscription.unsubscribe()
        }
        if (projectsSubscription && typeof projectsSubscription.unsubscribe === 'function') {
          projectsSubscription.unsubscribe()
        }
      } catch (error) {
        console.error('Error cleaning up subscriptions:', error)
      }
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
      const projectsData = await fetchProjectsOptimized()
      setProjects(projectsData)
      
      // Select the newly created project if it's the first one
      if (projectsData.length === 1) {
        setSelectedProject(projectsData[0].id)
      }
    } catch (error) {
      // Handle error silently
    }
  }

  const handleAddTask = async (status: Task['status']) => {
    if (!session?.user?.id || !selectedProject || !supabase) return

    try {
      // Get the next position for the new task
      const tasksInStatus = tasks.filter(task => task.status === status)
      const nextPosition = tasksInStatus.length + 1

      // Create a new blank task with placeholder content
      const newTask = {
        id: crypto.randomUUID(),
        title: 'Task',
        description: '',
        status: status,
        priority: 'medium' as const, // Default priority
        due_date: undefined, // Will show placeholder calendar icon
        assigned_to: undefined, // Will show placeholder user icon
        position: nextPosition,
        project_id: selectedProject,
        created_by: session.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        estimated_hours: 0,
        actual_hours: 0
      } as TaskWithDetails

      // Optimistic update
      setTasks(prevTasks => [...prevTasks, newTask as TaskWithDetails])

      // Insert into database
      const { error } = await supabase
        .from('tasks')
        .insert(newTask)

      if (error) {
        // Revert optimistic update on error
        setTasks(prevTasks => prevTasks.filter(t => t.id !== newTask.id))
        throw error
      }

      // Update project task count
      setProjects(prevProjects => 
        prevProjects.map(p => 
          p.id === selectedProject 
            ? { ...p, task_count: (p.task_count || 0) + 1 }
            : p
        )
      )
    } catch (error) {
      console.error('Error creating task:', error)
    }
  }

  const handleTaskCreated = async () => {
    // Refresh tasks and projects list
    try {
      const [tasksData, projectsData] = await Promise.all([
        fetchTasksOptimized(selectedProject),
        fetchProjectsOptimized()
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
      const updatedTasks = await fetchTasksOptimized(selectedProject)
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
      const updatedTasks = await fetchTasksOptimized(selectedProject)
      setTasks(updatedTasks)
    } catch (error) {
      // Handle error silently
    }
  }

  const handleQuickEdit = async (task: TaskWithDetails, field: string, value: string | null) => {
    if (!session?.user?.id || !supabase) return

    try {
      // For assignment updates, we need to refresh the task data to get the assigned_user info
      if (field === 'assigned_to') {
        // Update in database first
        const { error } = await supabase
          .from('tasks')
          .update({ [field]: value, updated_at: new Date().toISOString() })
          .eq('id', task.id)

        if (error) throw error

        // Then refresh the entire tasks list to get updated assigned_user data
        const updatedTasks = await fetchTasksOptimized(selectedProject)
        setTasks(updatedTasks)
        return
      }

      // For other fields, use optimistic update
      const updatedTask = { ...task, [field]: value }
      setTasks(prevTasks => 
        prevTasks.map(t => t.id === task.id ? updatedTask : t)
      )

      // Update in database
      const { error } = await supabase
        .from('tasks')
        .update({ [field]: value, updated_at: new Date().toISOString() })
        .eq('id', task.id)

      if (error) {
        // Revert optimistic update on error
        setTasks(prevTasks => 
          prevTasks.map(t => t.id === task.id ? task : t)
        )
        throw error
      }
    } catch (error) {
      console.error('Error updating task:', error)
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
        const updatedTasks = await fetchTasksOptimized(selectedProject)
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
      const projectsData = await fetchProjectsOptimized()
      setProjects(projectsData)
    } catch (error) {
      // Handle error silently
    }
  }

  // Load users for task assignment
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsersOptimized()
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
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Project Management</h2>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button className="gap-2 w-full sm:w-auto" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4" />
              New Project
            </Button>
            {selectedProject ? (
              <Button 
                variant="outline" 
                className="gap-2 hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all duration-200 border-green-200 w-full sm:w-auto" 
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
                className="gap-2 opacity-50 cursor-not-allowed transition-all duration-200 w-full sm:w-auto" 
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
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Company Selector - Only show for admin users */}
        {session?.user?.role === 'admin' && (
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-full lg:w-64">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent>
              {companies.map(company => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    <span>{company.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {projects.filter(p => p.company_id === company.id).length} projects
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger className="w-full lg:w-64">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {filteredProjects.map(project => (
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
          <SelectTrigger className="w-full lg:w-40">
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

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">View:</span>
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('kanban')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Project Info */}
      {currentProject && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <span className="truncate">{currentProject.name}</span>
                  <Badge variant={currentProject.status === 'active' ? 'default' : 'secondary'}>
                    {currentProject.status}
                  </Badge>
                </CardTitle>
                {currentCompany && session?.user?.role === 'admin' && (
                  <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span className="truncate">{currentCompany.name}</span>
                  </div>
                )}
                {currentProject.description && (
                  <p className="text-gray-600 mt-1 text-sm">{currentProject.description}</p>
                )}
              </div>
              {(userRole === 'admin' || userRole === 'manager') && (
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button variant="outline" size="sm" onClick={handleEditProject} className="w-full sm:w-auto">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Project
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleManageUsers} className="w-full sm:w-auto">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Content */}
      {viewMode === 'kanban' ? (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col xl:flex-row gap-4 overflow-x-auto pb-4">
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
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <ListView
            tasks={projectTasks}
            userRole={userRole}
            onAddTask={handleAddTask}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onManageAssignments={handleManageTaskAssignments}
            onQuickEdit={handleQuickEdit}
          />
        </DragDropContext>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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