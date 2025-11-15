"use client"

import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { MoreHorizontal, Calendar, Flag, Plus } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { fetchProjectsOptimized } from "@/lib/simplified-database-functions"
import { ProjectWithDetails } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import CreateProjectModal from "@/components/modals/create-project-modal"

interface ProjectsOverviewProps {
  activeSpace?: string | null
}

export function ProjectsOverview({ activeSpace }: ProjectsOverviewProps) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      try {
        const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
        setProjects(projectsData)
      } catch (error) {
        console.error("Error loading projects:", error)
      } finally {
        setLoading(false)
      }
    }

    loadProjects()
  }, [activeSpace])

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

  if (loading) {
    return (
      <Card className="p-4 border-border/60">
        <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
      </Card>
    )
  }

  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center justify-between mb-3">
        <h4>Projects</h4>
        <button className="text-sm text-muted-foreground hover:text-foreground">
          View all
        </button>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-muted-foreground border-b border-border/40 mb-0.5">
        <div className="col-span-4">Name</div>
        <div className="col-span-2">Progress</div>
        <div className="col-span-1">Start</div>
        <div className="col-span-1">End</div>
        <div className="col-span-2">Priority</div>
        <div className="col-span-1">Owner</div>
        <div className="col-span-1"></div>
      </div>

      {/* Projects List */}
      <div className="space-y-0">
        {projects.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No projects yet
          </div>
        ) : (
          projects.map((project) => {
            const progress = calculateProgress(project)
            
            return (
              <div
                key={project.id}
                className="grid grid-cols-12 gap-4 px-3 py-2.5 hover:bg-muted/30 transition-colors items-center group rounded-md"
              >
                <div className="col-span-4 flex items-center gap-2.5">
                  <svg
                    className="w-4 h-4 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span className="text-sm">{project.name || "Unnamed Project"}</span>
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
                  <span className="text-sm text-muted-foreground">
                    -
                  </span>
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
                    <div className="text-sm text-muted-foreground">
                      -
                    </div>
                  )}
                </div>
                <div className="col-span-1 flex justify-end">
                  <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* New Project Button */}
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-md transition-colors w-full mt-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={() => {
            setShowCreateModal(false)
            // Reload projects
            const loadProjects = async () => {
              setLoading(true)
              try {
                const projectsData = await fetchProjectsOptimized(activeSpace || undefined)
                setProjects(projectsData)
              } catch (error) {
                console.error("Error loading projects:", error)
              } finally {
                setLoading(false)
              }
            }
            loadProjects()
          }}
        />
      )}
    </Card>
  )
}

