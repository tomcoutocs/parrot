'use client'

import { useEffect, useState } from 'react'
import { FolderOpen, Loader2, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { fetchProjectsOptimized } from '@/lib/simplified-database-functions'
import type { ProjectWithDetails } from '@/lib/supabase'
import EmptyState from '@/components/ui/empty-state'

interface ProjectsSummaryWidgetProps {
  companyId: string
  config?: Record<string, unknown>
  onNavigateToTab?: (tab: string) => void
}

export default function ProjectsSummaryWidget({ companyId, config, onNavigateToTab }: ProjectsSummaryWidgetProps) {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [loading, setLoading] = useState(true)

  const showCount = (config?.showCount as number) || 5

  useEffect(() => {
    loadProjects()
  }, [companyId])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const data = await fetchProjectsOptimized(companyId)
      // Show only active projects
      const activeProjects = data
        .filter(p => p.status === 'active')
        .slice(0, showCount)
      setProjects(activeProjects)
    } catch (err) {
      console.error('Error loading projects:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="parrot-card-enhanced h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
        <CardTitle className="flex items-center">
          <FolderOpen className="h-5 w-5 mr-2" />
          Projects Summary
        </CardTitle>
        {onNavigateToTab && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onNavigateToTab('projects')}
            className="h-8"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            title="No active projects"
            description="Create your first project to get started."
            variant="compact"
          />
        ) : (
          <div className="space-y-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {project.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {project.task_count || 0} tasks
                    </Badge>
                    {project.manager && (
                      <span className="text-xs text-gray-500">
                        {project.manager.full_name}
                      </span>
                    )}
                  </div>
                </div>
                <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                  {project.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

