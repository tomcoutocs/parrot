"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Search,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Download,
  Calendar,
  BarChart3
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SavedReport {
  id: string
  name: string
  description: string
  type: 'dashboard' | 'report' | 'visualization'
  lastRun: string
  createdBy: string
  schedule?: 'daily' | 'weekly' | 'monthly' | null
}

export function AnalyticsSavedReports() {
  const [searchTerm, setSearchTerm] = useState('')
  const [reports] = useState<SavedReport[]>([
    {
      id: '1',
      name: 'Monthly User Growth Report',
      description: 'User growth trends and metrics',
      type: 'report',
      lastRun: '2024-02-01',
      createdBy: 'John Doe',
      schedule: 'monthly',
    },
    {
      id: '2',
      name: 'Traffic Sources Dashboard',
      description: 'Overview of traffic sources and performance',
      type: 'dashboard',
      lastRun: '2024-02-10',
      createdBy: 'Jane Smith',
      schedule: 'daily',
    },
    {
      id: '3',
      name: 'Conversion Funnel Analysis',
      description: 'Detailed conversion funnel visualization',
      type: 'visualization',
      lastRun: '2024-02-12',
      createdBy: 'Mike Johnson',
    },
  ])

  const filteredReports = reports.filter(report =>
    report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    report.description.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'dashboard':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'report':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400'
      case 'visualization':
        return 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button>
          <BarChart3 className="w-4 h-4 mr-2" />
          Create Report
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search saved reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">{report.name}</CardTitle>
                    <Badge className={getTypeColor(report.type)}>
                      {report.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{report.description}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Eye className="w-4 h-4 mr-2" />
                      View Report
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Run</span>
                  <span className="font-medium">{report.lastRun}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created By</span>
                  <span className="font-medium">{report.createdBy}</span>
                </div>
                {report.schedule && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Schedule</span>
                    <Badge variant="outline">{report.schedule}</Badge>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

