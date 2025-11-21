"use client"

import { MetricsCard } from "./metrics-card"
import { QuickLinksCard } from "./quick-links-card"
import { ProjectsOverview } from "./projects-overview"

interface ModernOverviewTabProps {
  activeSpace: string | null
}

export function ModernOverviewTab({ activeSpace }: ModernOverviewTabProps) {
  return (
    <div className="space-y-4 -m-8 p-8">
      {/* Top Row: Metrics and Bookmarks */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <MetricsCard activeSpace={activeSpace || "1"} />
        </div>
        <div className="col-span-1">
          <QuickLinksCard activeSpace={activeSpace} />
        </div>
      </div>

      {/* Projects/Lists Table */}
      <ProjectsOverview activeSpace={activeSpace || "1"} />
    </div>
  )
}

