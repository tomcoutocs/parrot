"use client"

import { useState, useEffect } from "react"
import { Search, Filter, Plus, FolderKanban } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Card } from "@/components/ui/card"
import { fetchProjectsOptimized, fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { ProjectWithDetails, Company } from "@/lib/supabase"
import { format } from "date-fns"
import CreateProjectModal from "@/components/modals/create-project-modal"
import { useRouter } from "next/navigation"

interface ProjectWithCompany extends ProjectWithDetails {
  company?: Company
}

export function AdminAllProjects() {
  const router = useRouter()
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const handleProjectClick = (project: ProjectWithCompany) => {
    // Navigate to projects tab with the selected project and space
    // Use window.location to ensure full navigation and state reset
    if (project.company_id) {
      window.location.href = `/dashboard?tab=projects&projectId=${project.id}&space=${project.company_id}`
    } else {
      window.location.href = `/dashboard?tab=projects&projectId=${project.id}`
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [projectsData, companiesData] = await Promise.all([
          fetchProjectsOptimized(), // No company filter = all projects
          fetchCompaniesOptimized()
        ])

        // Enrich projects with company data
        const enrichedProjects = projectsData.map(project => {
          const company = companiesData.find(c => c.id === project.company_id)
          return { ...project, company }
        })

        setProjects(enrichedProjects)
        setCompanies(companiesData)
      } catch (error) {
        console.error("Error loading projects:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredProjects = projects.filter(project => {
    const matchesSearch = 
      project.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.company?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const activeProjects = filteredProjects.filter(p => {
    // Consider a project active if it's not archived
    return p.status !== "archived"
  })

  const getStatusColor = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    if (statusLower.includes("progress") || statusLower === "in_progress") {
      return { dot: "bg-purple-500", text: "text-purple-700" }
    }
    if (statusLower.includes("planning") || statusLower === "planning") {
      return { dot: "bg-blue-500", text: "text-blue-700" }
    }
    if (statusLower.includes("done") || statusLower === "done") {
      return { dot: "bg-green-500", text: "text-green-700" }
    }
    return { dot: "bg-gray-500", text: "text-gray-700" }
  }

  const getStatusLabel = (status: string) => {
    const statusLower = status?.toLowerCase() || ""
    if (statusLower.includes("progress") || statusLower === "in_progress") {
      return "In Progress"
    }
    if (statusLower.includes("planning") || statusLower === "planning") {
      return "Planning"
    }
    if (statusLower.includes("done") || statusLower === "done") {
      return "Done"
    }
    return status || "Unknown"
  }

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
      return format(date, "M/d/yy")
    } catch {
      return "-"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg">All Projects</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {activeProjects.length} active project{activeProjects.length !== 1 ? "s" : ""} across all clients
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Project
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4 border-border/60">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
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

      {/* Projects List */}
      <Card className="p-4 border-border/60">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 px-3 py-2 text-xs text-muted-foreground border-b border-border/40 mb-1">
          <div className="col-span-3">Project</div>
          <div className="col-span-2">Client</div>
          <div className="col-span-1">Due Date</div>
          <div className="col-span-1">Launch</div>
          <div className="col-span-2">Status</div>
          <div className="col-span-3">Progress</div>
        </div>

        {/* Projects */}
        <div className="space-y-0">
          {activeProjects.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No projects found
            </div>
          ) : (
            activeProjects.map((project) => {
              const progress = calculateProgress(project)
              const statusColors = getStatusColor(project.status || "")
              
              return (
                <div
                  key={project.id}
                  onClick={() => handleProjectClick(project)}
                  className="grid grid-cols-12 gap-4 px-3 py-3 hover:bg-muted/30 rounded-md transition-colors items-center group cursor-pointer"
                >
                  <div className="col-span-3 flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm truncate">{project.name || "Unnamed Project"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-sm text-muted-foreground">{project.company?.name || "Unknown"}</span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1.5">
                    <span className="text-sm">-</span>
                  </div>
                  <div className="col-span-1 flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">-</span>
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: statusColors.dot === "bg-purple-500" ? "#8b5cf6" : statusColors.dot === "bg-blue-500" ? "#3b82f6" : statusColors.dot === "bg-green-500" ? "#10b981" : "#6b7280" }}
                      />
                      <span className="text-sm" style={{ color: statusColors.dot === "bg-purple-500" ? "#8b5cf6" : statusColors.dot === "bg-blue-500" ? "#3b82f6" : statusColors.dot === "bg-green-500" ? "#10b981" : "#6b7280" }}>
                        {getStatusLabel(project.status || "")}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-3 flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-foreground transition-all"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {progress.completed}/{progress.total}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </Card>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={() => {
            setShowCreateModal(false)
            // Reload projects
            const loadData = async () => {
              const [projectsData, companiesData] = await Promise.all([
                fetchProjectsOptimized(),
                fetchCompaniesOptimized()
              ])
              const enrichedProjects = projectsData.map(project => {
                const company = companiesData.find(c => c.id === project.company_id)
                return { ...project, company }
              })
              setProjects(enrichedProjects)
              setCompanies(companiesData)
            }
            loadData()
          }}
        />
      )}
    </div>
  )
}

