"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Filter, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { LeadKanbanBoard } from '../components/lead-kanban-board'
import { LeadFilters } from '../components/lead-filters'
import CreateLeadModal from '@/components/modals/create-lead-modal'

export function LeadPipeline() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    source: 'all',
    score: 'all',
    status: 'all',
  })
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleLeadCreated = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button variant="outline" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Lead
        </Button>
      </div>

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onLeadCreated={handleLeadCreated}
      />

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter leads by source, score, or status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <LeadFilters filters={filters} onFiltersChange={setFilters} />
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <LeadKanbanBoard key={refreshKey} searchQuery={searchQuery} filters={filters} />
    </div>
  )
}

