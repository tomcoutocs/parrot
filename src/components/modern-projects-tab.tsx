"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, Calendar, Flag, Plus, FolderKanban, Search, Edit } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { fetchProjectsOptimized } from "@/lib/simplified-database-functions"
import { ProjectWithDetails, User } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import CreateProjectModal from "@/components/modals/create-project-modal"
import EditProjectModal from "@/components/modals/edit-project-modal"
import { fetchUsers } from "@/lib/database-functions"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface ModernProjectsTabProps {
  activeSpace: string | null
}

export function ModernProjectsTab({ activeSpace }: ModernProjectsTabProps) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedProject, setSelectedProject] = useState<ProjectWithDetails | null>(null)
  const [users, setUsers] = useState<User[]>([])

  useEffect(() => {
    const loadProjects = async () => {
      if (!activeSpace) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const projectsData = await fetchProjectsOptimized(activeSpace)
        setProjects(projectsData)
      } catch (error) {
        console.error("Error loading projects:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [activeSpace])

  // Load users for the edit modal
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const usersData = await fetchUsers()
        setUsers(usersData)
      } catch (error) {
        console.error("Error loading users:", error)
      }
    }
    loadUsers()
  }, [])

  const calculateProgress = (project: ProjectWithDetails) => {
    if (!project.tasks || project.tasks.length === 0) {
      return { completed: 0, total: 0, percentage: 0 }
    }
    
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter((t: { status: string }) => 
      t.status === "done" || t.status === "completed"
    ).length
    
    const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
    
    return { completed: completedTasks, total: totalTasks, percentage }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-"
    try {
      const date = new Date(dateString)
      return format(date, "MMM d")
    } catch {
      return "-"
    }
  }

  const filteredProjects = projects.filter(project => 
    project.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleProjectCreated = () => {
    // Reload projects
    const loadProjects = async () => {
      if (!activeSpace) return
      try {
        const projectsData = await fetchProjectsOptimized(activeSpace)
        setProjects(projectsData)
      } catch (error) {
        console.error("Error reloading projects:", error)
      }
    }
    loadProjects()
    setShowCreateModal(false)
  }

  const handleProjectUpdated = () => {
    // Reload projects after update
    const loadProjects = async () => {
      if (!activeSpace) return
      try {
        const projectsData = await fetchProjectsOptimized(activeSpace)
        setProjects(projectsData)
      } catch (error) {
        console.error("Error reloading projects:", error)
      }
    }
    loadProjects()
    setShowEditModal(false)
    setSelectedProject(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    )
  }

  if (!activeSpace) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Please select a space to view projects</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium">Projects</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredProjects.length} {filteredProjects.length === 1 ? "project" : "projects"}
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search projects..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Projects Table */}
      <Card className="border-border/60">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-4 py-3 text-xs text-muted-foreground border-b border-border/40 bg-muted/20">
          <div className="col-span-4">Name</div>
          <div className="col-span-2">Progress</div>
          <div className="col-span-1">Start</div>
          <div className="col-span-1">End</div>
          <div className="col-span-2">Priority</div>
          <div className="col-span-1">Owner</div>
          <div className="col-span-1"></div>
        </div>

        {/* Projects List */}
        <div className="divide-y divide-border/40">
          {filteredProjects.length === 0 ? (
            <div className="py-12 text-center">
              <FolderKanban className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                {searchTerm ? "No projects found matching your search" : "No projects yet"}
              </p>
              {!searchTerm && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="mt-4 text-sm text-foreground hover:underline"
                >
                  Create your first project
                </button>
              )}
            </div>
          ) : (
            filteredProjects.map((project) => {
              const progress = calculateProgress(project)
              
              return (
                <div
                  key={project.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-muted/30 transition-colors items-center group"
                >
                  <div className="col-span-4 flex items-center gap-2.5">
                    <FolderKanban className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{project.name || "Unnamed Project"}</span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2.5">
                      <Progress
                        value={progress.percentage}
                        className="h-1.5 flex-1"
                      />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {progress.completed}/{progress.total}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-muted-foreground">
                      {project.created_at ? formatDate(project.created_at) : "-"}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <span className="text-sm text-muted-foreground">-</span>
                  </div>
                  <div className="col-span-2 flex items-center gap-1.5">
                    <span className="text-sm text-muted-foreground">-</span>
                  </div>
                  <div className="col-span-1">
                    {project.manager?.full_name ? (
                      <Avatar className="w-6 h-6">
                        <AvatarImage src="" />
                        <AvatarFallback className="bg-muted text-xs">
                          {project.manager.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="text-sm text-muted-foreground">-</div>
                    )}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all pointer-events-auto">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedProject(project)
                          setShowEditModal(true)
                        }}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>View Details</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={handleProjectCreated}
      />

      {/* Edit Project Modal */}
      <EditProjectModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false)
          setSelectedProject(null)
        }}
        onProjectUpdated={handleProjectUpdated}
        project={selectedProject}
        users={users}
      />
    </div>
  )
}

