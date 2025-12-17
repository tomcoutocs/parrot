"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Search,
  Filter,
  Download,
  Database,
  Table as TableIcon,
  RefreshCw,
  Plus
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AnalyticsDataExplorer() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTable, setSelectedTable] = useState('users')
  const [data] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', lastActive: '2024-02-10' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', lastActive: '2024-02-12' },
    { id: 3, name: 'Mike Johnson', email: 'mike@example.com', role: 'user', lastActive: '2024-02-11' },
  ])

  const tables = [
    { id: 'users', name: 'Users', description: 'User data and activity' },
    { id: 'sessions', name: 'Sessions', description: 'Session tracking data' },
    { id: 'events', name: 'Events', description: 'User events and interactions' },
    { id: 'pages', name: 'Pages', description: 'Page view data' },
    { id: 'conversions', name: 'Conversions', description: 'Conversion tracking' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
          <p className="text-muted-foreground mt-1">
            Explore and analyze raw data with SQL-like queries
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Query
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tables Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle>Data Tables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {tables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => setSelectedTable(table.id)}
                  className={`w-full text-left p-3 rounded-lg border transition-colors ${
                    selectedTable === table.id
                      ? 'bg-muted border-primary'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TableIcon className="w-4 h-4 text-muted-foreground" />
                    <p className="font-medium text-sm">{table.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{table.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{tables.find(t => t.id === selectedTable)?.name}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {tables.find(t => t.id === selectedTable)?.description}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Data Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{row.id}</TableCell>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.email}</TableCell>
                      <TableCell>{row.role}</TableCell>
                      <TableCell>{row.lastActive}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing 1-{data.length} of {data.length} results
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Query Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Custom Query Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <pre className="text-sm font-mono">
{`SELECT * FROM ${selectedTable}
WHERE created_at >= '2024-01-01'
ORDER BY created_at DESC
LIMIT 100`}
              </pre>
            </div>
            <div className="flex gap-2">
              <Button>Run Query</Button>
              <Button variant="outline">Save Query</Button>
              <Button variant="outline">Export Results</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

