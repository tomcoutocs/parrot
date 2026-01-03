"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Server, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Search,
  RefreshCw,
  Loader2,
  Activity,
  Database,
  Clock,
  Users,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  MessageSquare,
  Receipt,
  DollarSign,
  Building2
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { getRealTimeMetrics, getSystemHealth, getSystemLogs, type SystemLog } from '@/lib/monitoring-functions'
import { toastError } from '@/lib/toast'

export function SystemAdminMonitoring() {
  const [logs, setLogs] = useState<SystemLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<SystemLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [levelFilter, setLevelFilter] = useState<string>('all')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [metrics, setMetrics] = useState<any>(null)
  const [health, setHealth] = useState<any>(null)
  const [loadingMetrics, setLoadingMetrics] = useState(true)

  useEffect(() => {
    loadAllData()
  }, [])

  useEffect(() => {
    if (levelFilter !== 'all') {
      loadLogs()
    } else {
      loadLogs()
    }
  }, [levelFilter])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, levelFilter])

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadAllData()
      }, 30000) // Refresh every 30 seconds
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  const loadAllData = async () => {
    setLoading(true)
    setLoadingMetrics(true)
    try {
      await Promise.all([
        loadLogs(),
        loadMetrics(),
        loadHealth()
      ])
    } catch (error) {
      console.error('Error loading monitoring data:', error)
      toastError('Failed to load monitoring data')
    } finally {
      setLoading(false)
      setLoadingMetrics(false)
    }
  }

  const loadLogs = async () => {
    try {
      const level = levelFilter === 'all' ? undefined : levelFilter as 'error' | 'warning' | 'info' | 'success'
      const result = await getSystemLogs(100, level)
      if (result.success && result.data) {
        setLogs(result.data)
      } else {
        toastError(result.error || 'Failed to load logs')
      }
    } catch (error) {
      console.error('Error loading logs:', error)
    }
  }

  const loadMetrics = async () => {
    try {
      const result = await getRealTimeMetrics()
      if (result.success && result.data) {
        setMetrics(result.data)
      } else {
        toastError(result.error || 'Failed to load metrics')
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }

  const loadHealth = async () => {
    try {
      const result = await getSystemHealth()
      if (result.success && result.data) {
        setHealth(result.data)
      } else {
        toastError(result.error || 'Failed to load system health')
      }
    } catch (error) {
      console.error('Error loading system health:', error)
    }
  }

  const filterLogs = () => {
    let filtered = [...logs]

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.source.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (levelFilter !== 'all') {
      filtered = filtered.filter(log => log.level === levelFilter)
    }

    setFilteredLogs(filtered)
  }

  const getLevelBadge = (level: string) => {
    const variants = {
      error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    }
    return variants[level as keyof typeof variants] || variants.info
  }

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error':
        return <XCircle className="w-4 h-4" />
      case 'warning':
        return <AlertTriangle className="w-4 h-4" />
      case 'info':
        return <Activity className="w-4 h-4" />
      case 'success':
        return <CheckCircle className="w-4 h-4" />
      default:
        return <Activity className="w-4 h-4" />
    }
  }

  const stats = {
    total: logs.length,
    errors: logs.filter(l => l.level === 'error').length,
    warnings: logs.filter(l => l.level === 'warning').length,
    info: logs.filter(l => l.level === 'info').length,
    success: logs.filter(l => l.level === 'success').length,
  }

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'text-green-600'
      case 'degraded': return 'text-yellow-600'
      case 'down': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'operational': return <CheckCircle className="w-8 h-8 text-green-600" />
      case 'degraded': return <AlertTriangle className="w-8 h-8 text-yellow-600" />
      case 'down': return <XCircle className="w-8 h-8 text-red-600" />
      default: return <Activity className="w-8 h-8 text-gray-600" />
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">System Monitoring</h2>
        <p className="text-muted-foreground">Monitor system health, errors, and performance metrics</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Errors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Warnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.warnings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Info</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.info}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.success}</div>
          </CardContent>
        </Card>
      </div>

      {/* Real-time Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Users className="w-4 h-4" /> Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalUsers}</div>
              <p className="text-xs text-muted-foreground">{metrics.activeUsers} active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FolderKanban className="w-4 h-4" /> Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalProjects}</div>
              <p className="text-xs text-muted-foreground">{metrics.totalTasks} tasks</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CheckSquare className="w-4 h-4" /> Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.completedTasks}</div>
              <p className="text-xs text-muted-foreground">{metrics.overdueTasks} overdue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Support Tickets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSupportTickets}</div>
              <p className="text-xs text-muted-foreground">{metrics.openSupportTickets} open</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalInvoices}</div>
              <p className="text-xs text-muted-foreground">${metrics.totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Spaces
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.totalSpaces}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> Recent Errors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{metrics.recentErrors}</div>
              <p className="text-xs text-muted-foreground">{metrics.recentWarnings} warnings</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingMetrics ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : health ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                {getHealthStatusIcon(health.database.status)}
                <div className="flex-1">
                  <p className="font-medium">Database</p>
                  <p className={`text-sm ${getHealthStatusColor(health.database.status)}`}>
                    {health.database.status.charAt(0).toUpperCase() + health.database.status.slice(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.database.responseTime}ms • {health.database.connectionCount} connections
                  </p>
                  {health.database.errorCount > 0 && (
                    <p className="text-xs text-red-600">{health.database.errorCount} errors (last hour)</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                {getHealthStatusIcon(health.server.status)}
                <div className="flex-1">
                  <p className="font-medium">Server</p>
                  <p className={`text-sm ${getHealthStatusColor(health.server.status)}`}>
                    {health.server.status.charAt(0).toUpperCase() + health.server.status.slice(1)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 border rounded-lg">
                {getHealthStatusIcon(health.api.status)}
                <div className="flex-1">
                  <p className="font-medium">API</p>
                  <p className={`text-sm ${getHealthStatusColor(health.api.status)}`}>
                    {health.api.status.charAt(0).toUpperCase() + health.api.status.slice(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {health.api.responseTime}ms • {health.api.errorRate.toFixed(2)}% error rate
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unable to load system health data</p>
          )}
        </CardContent>
      </Card>

      {/* Logs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>System Logs</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
                {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
              </Button>
              <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading}>
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="error">Errors</SelectItem>
                <SelectItem value="warning">Warnings</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="success">Success</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Logs List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Server className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No logs found</p>
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className={`mt-0.5 ${getLevelBadge(log.level).split(' ')[0]}`}>
                    {getLevelIcon(log.level)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getLevelBadge(log.level)}>
                        {log.level}
                      </Badge>
                      <Badge variant="outline">{log.source}</Badge>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm">{log.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

