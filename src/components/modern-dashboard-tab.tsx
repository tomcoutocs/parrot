"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useSession } from "@/components/providers/session-provider"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { fetchCompanyEvents } from "@/lib/simplified-database-functions"
import { fetchTasksOptimized, fetchProjectsOptimized } from "@/lib/simplified-database-functions"
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { Calendar, CheckSquare, Clock, Building2, AlertCircle, ArrowRight, Circle, Users, FolderKanban } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { format, isAfter, parseISO, addDays } from "date-fns"
import { Company } from "@/lib/supabase"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface DashboardEvent {
  id: string
  title: string
  description?: string
  start_date: string
  end_date?: string
  company_id?: string
  space_id?: string
  company_name?: string
}

interface DashboardTask {
  id: string
  title: string
  due_date?: string
  status: string
  priority?: string
  project_id: string
  project_name?: string
  company_id?: string
  company_name?: string
  assigned_user?: {
    id: string
    full_name: string | null
    email: string | null
  }
}

interface ModernDashboardTabProps {
  activeSpace: string | null
}

interface SpaceInfo extends Company {
  activeProjects?: number
  upcomingTasksCount?: number
  upcomingEventsCount?: number
}

export function ModernDashboardTab({ activeSpace }: ModernDashboardTabProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([])
  const [upcomingTasks, setUpcomingTasks] = useState<DashboardTask[]>([])
  const [userSpaces, setUserSpaces] = useState<string[]>([])
  const [spacesInfo, setSpacesInfo] = useState<SpaceInfo[]>([])
  const hasLoadedRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)

  const getUserSpaces = useCallback(async (): Promise<string[]> => {
    if (!session?.user || !supabase) return []

    const spaces: string[] = []
    const userRole = session.user.role
    const userId = session.user.id

    try {
      // Regular users have a company_id
      if (userRole === 'user' && session.user.company_id) {
        spaces.push(session.user.company_id)
      }

      // Managers and admins can have multiple spaces
      if (userRole === 'manager' || userRole === 'admin' || userRole === 'internal') {
        // Get spaces from company_id if exists
        if (session.user.company_id) {
          spaces.push(session.user.company_id)
        }

        // Get additional spaces from internal_user_companies
        const { data: assignments } = await supabase
          .from('internal_user_companies')
          .select('company_id')
          .eq('user_id', userId)

        if (assignments) {
          assignments.forEach(assignment => {
            if (!spaces.includes(assignment.company_id)) {
              spaces.push(assignment.company_id)
            }
          })
        }

        // For managers/admins without specific assignments, get all their managed spaces
        if (userRole === 'manager' && spaces.length === 0) {
          // Get companies where this user is the manager
          // Try spaces table first (after migration), fallback to companies for backward compatibility
          let { data: managedCompanies } = await supabase
            .from('spaces')
            .select('id')
            .eq('manager_id', userId)

          // If spaces table doesn't exist (migration not run), try companies table
          if (!managedCompanies || (managedCompanies as any).error) {
            const fallback = await supabase
              .from('companies')
              .select('id')
              .eq('manager_id', userId)
            
            if (!fallback.error) {
              managedCompanies = fallback.data
            }
          }

          if (managedCompanies) {
            managedCompanies.forEach(company => {
              if (!spaces.includes(company.id)) {
                spaces.push(company.id)
              }
            })
          }
        }
      }

      return spaces
    } catch (error) {
      console.error("Error getting user spaces:", error)
      return spaces
    }
  }, [session?.user?.id, session?.user?.role, session?.user?.company_id])

  const loadDashboardData = useCallback(async () => {
    if (!session?.user) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Get all spaces the user/manager is part of
      const spaces = await getUserSpaces()
      
      // Only update if spaces actually changed to prevent infinite loops
      setUserSpaces(prev => {
        const spacesStr = spaces.sort().join(',')
        const prevStr = prev.sort().join(',')
        if (spacesStr === prevStr) return prev
        return spaces
      })

      // Fetch company details for spaces
      const allCompanies = await fetchCompaniesOptimized()
      const userCompanies = allCompanies.filter(c => spaces.includes(c.id))
      
      // Enrich spaces with project and task counts
      const enrichedSpaces: SpaceInfo[] = await Promise.all(
        userCompanies.map(async (company) => {
          const projects = await fetchProjectsOptimized(company.id)
          const activeProjects = projects.length
          
          // Count upcoming tasks for this space
          let upcomingTasksCount = 0
          const userId = session.user.id
          const userRole = session.user.role
          const now = new Date()
          const thirtyDaysFromNow = addDays(now, 30)
          
          for (const project of projects) {
            const tasks = await fetchTasksOptimized(project.id)
            tasks.forEach(task => {
              if (task.due_date) {
                const dueDate = parseISO(task.due_date)
                const isUpcoming = isAfter(dueDate, now) && dueDate <= thirtyDaysFromNow && task.status !== 'done'
                
                if (userRole === 'user') {
                  // For client users, only count tasks assigned to them
                  const isAssignedViaLegacy = task.assigned_to === userId
                  const isAssignedViaTable = (task as any).task_assignments?.some(
                    (assignment: any) => assignment.user_id === userId
                  )
                  const isAssigned = isAssignedViaLegacy || isAssignedViaTable
                  if (isUpcoming && isAssigned) {
                    upcomingTasksCount++
                  }
                } else {
                  // For managers/internal, count all upcoming tasks
                  if (isUpcoming) {
                    upcomingTasksCount++
                  }
                }
              }
            })
          }
          
          // Count upcoming events for this space
          const events = await fetchCompanyEvents(company.id)
          const upcomingEventsCount = events.filter(event => {
            const startDate = parseISO(event.start_date)
            return isAfter(startDate, now) && startDate <= thirtyDaysFromNow
          }).length
          
          return {
            ...company,
            activeProjects,
            upcomingTasksCount,
            upcomingEventsCount
          }
        })
      )
      
      setSpacesInfo(enrichedSpaces)

      // Fetch upcoming events from all spaces
      const events = await fetchUpcomingEvents(spaces)
      setUpcomingEvents(events)

      // Fetch upcoming tasks
      const tasks = await fetchUpcomingTasks(spaces)
      setUpcomingTasks(tasks)
    } catch (error) {
      console.error("Error loading dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, session?.user?.role, session?.user?.company_id, getUserSpaces])

  useEffect(() => {
    // Only load if we have a session and user ID changed (login/logout) or haven't loaded yet
    if (!session?.user) {
      hasLoadedRef.current = false
      lastUserIdRef.current = null
      setLoading(false)
      return
    }

    const currentUserId = session.user.id
    const userIdChanged = lastUserIdRef.current !== currentUserId
    
    if (userIdChanged || !hasLoadedRef.current) {
      hasLoadedRef.current = true
      lastUserIdRef.current = currentUserId
      loadDashboardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]) // Only reload when user ID changes (i.e., on login/logout)

  const fetchUpcomingEvents = useCallback(async (spaces: string[]): Promise<DashboardEvent[]> => {
    if (spaces.length === 0 || !supabase) return []

    try {
      const allEvents: DashboardEvent[] = []
      const now = new Date()
      const thirtyDaysFromNow = addDays(now, 30)

      // Fetch companies map for names
      const companies = await fetchCompaniesOptimized()
      const companiesMap = new Map(companies.map(c => [c.id, c.name || 'Unknown Space']))

      // Fetch events from all spaces
      for (const spaceId of spaces) {
        const events = await fetchCompanyEvents(spaceId)
        
        events.forEach(event => {
          const startDate = parseISO(event.start_date)
          // Only include upcoming events (within next 30 days)
          if (isAfter(startDate, now) && startDate <= thirtyDaysFromNow) {
            // Use space_id or company_id to get the space name
            const eventSpaceId = event.space_id || event.company_id || spaceId
            allEvents.push({
              ...event,
              company_name: companiesMap.get(eventSpaceId) || 'Unknown Space'
            })
          }
        })
      }

      // Sort by start date
      return allEvents.sort((a, b) => {
        const dateA = parseISO(a.start_date)
        const dateB = parseISO(b.start_date)
        return dateA.getTime() - dateB.getTime()
      })
    } catch (error) {
      console.error("Error fetching upcoming events:", error)
      return []
    }
  }, [])

  const fetchUpcomingTasks = useCallback(async (spaces: string[]): Promise<DashboardTask[]> => {
    if (spaces.length === 0 || !supabase) return []

    try {
      const allTasks: DashboardTask[] = []
      const now = new Date()
      const thirtyDaysFromNow = addDays(now, 30)
      const userId = session?.user?.id
      const userRole = session?.user?.role

      // Fetch companies map for names
      const companies = await fetchCompaniesOptimized()
      const companiesMap = new Map(companies.map(c => [c.id, c.name || 'Unknown Space']))

      // Fetch projects from all spaces to get project names
      const projectsMap = new Map<string, { name: string; company_id: string }>()
      for (const spaceId of spaces) {
        const projects = await fetchProjectsOptimized(spaceId)
        projects.forEach(project => {
          projectsMap.set(project.id, {
            name: project.name || 'Unnamed Project',
            company_id: project.company_id || spaceId
          })
        })
      }

      // For users: fetch tasks they're assigned to
      if (userRole === 'user' && userId) {
        // Get all tasks from user's spaces and filter by assignment
        for (const spaceId of spaces) {
          const projects = await fetchProjectsOptimized(spaceId)
          const projectIds = projects.map(p => p.id)

          if (projectIds.length > 0) {
            // Fetch all tasks from these projects
            for (const projectId of projectIds) {
              const tasks = await fetchTasksOptimized(projectId)
              tasks.forEach(task => {
                // Check if user is assigned via assigned_to field (legacy) or task_assignments (new)
                const isAssignedViaLegacy = task.assigned_to === userId
                const isAssignedViaTable = (task as any).task_assignments?.some(
                  (assignment: any) => assignment.user_id === userId
                )
                const isAssigned = isAssignedViaLegacy || isAssignedViaTable
                
                if (isAssigned && task.due_date) {
                  const dueDate = parseISO(task.due_date)
                  if (isAfter(dueDate, now) && dueDate <= thirtyDaysFromNow && task.status !== 'done') {
                    const project = projectsMap.get(task.project_id)
                    allTasks.push({
                      ...task,
                      project_name: project?.name || 'Unnamed Project',
                      company_id: project?.company_id,
                      company_name: project?.company_id ? companiesMap.get(project.company_id) : undefined
                    })
                  }
                }
              })
            }
          }
        }
      } else if ((userRole === 'manager' || userRole === 'admin' || userRole === 'internal') && userId) {
        // For managers: fetch all upcoming tasks from their spaces
        for (const spaceId of spaces) {
          const projects = await fetchProjectsOptimized(spaceId)
          const projectIds = projects.map(p => p.id)

          for (const projectId of projectIds) {
            const tasks = await fetchTasksOptimized(projectId)
            tasks.forEach(task => {
              if (task.due_date) {
                const dueDate = parseISO(task.due_date)
                if (isAfter(dueDate, now) && dueDate <= thirtyDaysFromNow && task.status !== 'done') {
                  const project = projectsMap.get(task.project_id)
                  allTasks.push({
                    ...task,
                    project_name: project?.name || 'Unnamed Project',
                    company_id: project?.company_id,
                    company_name: project?.company_id ? companiesMap.get(project.company_id) : undefined
                  })
                }
              }
            })
          }
        }
      }

      // Sort by due date
      return allTasks.sort((a, b) => {
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        const dateA = parseISO(a.due_date)
        const dateB = parseISO(b.due_date)
        return dateA.getTime() - dateB.getTime()
      })
    } catch (error) {
      console.error("Error fetching upcoming tasks:", error)
      return []
    }
  }, [session?.user?.id, session?.user?.role])

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy")
    } catch {
      return dateString
    }
  }

  const formatDateTime = (dateString: string) => {
    try {
      return format(parseISO(dateString), "MMM d, yyyy 'at' h:mm a")
    } catch {
      return dateString
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
      case 'low':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'done':
      case 'completed':
        return 'bg-green-500/10 text-green-500 border-green-500/20'
      case 'in_progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      case 'todo':
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const handleSpaceClick = (spaceId: string) => {
    router.push(`/dashboard?tab=dashboard&space=${spaceId}`)
  }

  const summaryMetrics = [
    {
      label: "My Spaces",
      value: spacesInfo.length.toString(),
      icon: Building2,
    },
    {
      label: "Upcoming Tasks",
      value: upcomingTasks.length.toString(),
      icon: CheckSquare,
    },
    {
      label: "Upcoming Events",
      value: upcomingEvents.length.toString(),
      icon: Calendar,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-3 -m-8 p-8">
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

        {/* Spaces Table */}
        {spacesInfo.length > 0 && (
          <Card className="p-3 border-border/60">
            <div className="grid grid-cols-12 gap-3 px-2 py-1.5 text-xs text-muted-foreground border-b border-border/40 mb-0.5">
              <div className="col-span-5">Space</div>
              <div className="col-span-2">Projects</div>
              <div className="col-span-2">Tasks</div>
              <div className="col-span-2">Events</div>
              <div className="col-span-1"></div>
            </div>
            <div className="space-y-0">
              {spacesInfo.map((space) => (
                <div
                  key={space.id}
                  onClick={() => handleSpaceClick(space.id)}
                  className="grid grid-cols-12 gap-3 px-2 py-2 hover:bg-muted/30 transition-colors items-center group rounded-md cursor-pointer"
                >
                  <div className="col-span-5 flex items-center gap-2">
                    {space.is_active !== false && (
                      <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)] flex-shrink-0" />
                    )}
                    {space.is_active === false && (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className="text-sm truncate">{space.name || 'Unnamed Space'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm">{space.activeProjects || 0}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm">{space.upcomingTasksCount || 0}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm">{space.upcomingEventsCount || 0}</span>
                  </div>
                  <div className="col-span-1 flex items-center justify-end">
                    <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              <CardTitle>Upcoming Events</CardTitle>
            </div>
            <CardDescription>
              Events from all your spaces in the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No upcoming events</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.slice(0, 10).map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm">{event.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {formatDate(event.start_date)}
                        </Badge>
                      </div>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                      {event.company_name && (
                        <div className="flex items-center gap-1 mt-2">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {event.company_name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {upcomingEvents.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 10 of {upcomingEvents.length} events
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5" />
              <CardTitle>Upcoming Tasks</CardTitle>
            </div>
            <CardDescription>
              {session?.user?.role === 'manager' || session?.user?.role === 'admin'
                ? 'All tasks from your spaces in the next 30 days'
                : 'Tasks assigned to you in the next 30 days'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No upcoming tasks</p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.slice(0, 10).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <CheckSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        {task.due_date && (
                          <Badge variant="outline" className="text-xs">
                            {formatDate(task.due_date)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {task.priority && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${getPriorityColor(task.priority)}`}
                          >
                            {task.priority}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${getStatusColor(task.status)}`}
                        >
                          {task.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 mt-2">
                        {task.project_name && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Project:</span>
                            <span className="text-xs font-medium">{task.project_name}</span>
                          </div>
                        )}
                        {task.company_name && (
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {task.company_name}
                            </span>
                          </div>
                        )}
                        {task.assigned_user && (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">Assigned to:</span>
                            <span className="text-xs font-medium">
                              {task.assigned_user.full_name || task.assigned_user.email}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {upcomingTasks.length > 10 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Showing 10 of {upcomingTasks.length} tasks
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </TooltipProvider>
  )
}

