"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/components/providers/session-provider'
import { format } from 'date-fns'

interface Execution {
  id: string
  automation_id: string
  trigger_data: any
  status: 'running' | 'completed' | 'failed' | 'cancelled'
  started_at: string
  completed_at: string | null
  error_message: string | null
  execution_time_ms: number | null
  execution_data: any
}

export function AutomationsExecutions({ automationId }: { automationId?: string }) {
  const { data: session } = useSession()
  const [executions, setExecutions] = useState<Execution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExecution, setSelectedExecution] = useState<Execution | null>(null)

  const loadExecutions = useCallback(async () => {
    if (!supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      let query = supabase
        .from('automation_executions')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(50)

      if (automationId) {
        query = query.eq('automation_id', automationId)
      }

      const { data, error } = await query

      if (!error && data) {
        setExecutions(data)
      }
    } catch (error) {
      console.error('Error loading executions:', error)
    } finally {
      setLoading(false)
    }
  }, [automationId])

  useEffect(() => {
    loadExecutions()
  }, [loadExecutions])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-600 dark:text-green-400">Completed</Badge>
      case 'failed':
        return <Badge className="bg-red-500/20 text-red-600 dark:text-red-400">Failed</Badge>
      case 'running':
        return <Badge className="bg-blue-500/20 text-blue-600 dark:text-blue-400">Running</Badge>
      case 'cancelled':
        return <Badge className="bg-gray-500/20 text-gray-600 dark:text-gray-400">Cancelled</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return CheckCircle
      case 'failed':
        return XCircle
      case 'running':
        return Loader2
      default:
        return Clock
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Execution History</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No executions yet
            </div>
          ) : (
            <div className="space-y-2">
              {executions.map((execution) => {
                const StatusIcon = getStatusIcon(execution.status)
                return (
                  <div
                    key={execution.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedExecution(execution)}
                  >
                    <div className="flex items-center gap-3">
                      <StatusIcon className={`w-5 h-5 ${
                        execution.status === 'running' ? 'animate-spin' : ''
                      } ${
                        execution.status === 'completed' ? 'text-green-500' :
                        execution.status === 'failed' ? 'text-red-500' :
                        'text-muted-foreground'
                      }`} />
                      <div>
                        <div className="font-medium">
                          {format(new Date(execution.started_at), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                        {execution.execution_time_ms && (
                          <div className="text-xs text-muted-foreground">
                            {execution.execution_time_ms}ms
                          </div>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(execution.status)}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Details Modal */}
      <Dialog open={selectedExecution !== null} onOpenChange={() => setSelectedExecution(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Execution Details</DialogTitle>
            <DialogDescription>
              {selectedExecution && format(new Date(selectedExecution.started_at), 'PPpp')}
            </DialogDescription>
          </DialogHeader>
          {selectedExecution && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <div className="mt-1">{getStatusBadge(selectedExecution.status)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {selectedExecution.execution_time_ms ? `${selectedExecution.execution_time_ms}ms` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Started</p>
                  <p className="font-medium">
                    {format(new Date(selectedExecution.started_at), 'PPpp')}
                  </p>
                </div>
                {selectedExecution.completed_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="font-medium">
                      {format(new Date(selectedExecution.completed_at), 'PPpp')}
                    </p>
                  </div>
                )}
              </div>
              {selectedExecution.error_message && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Error</p>
                  <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      {selectedExecution.error_message}
                    </p>
                  </div>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Trigger Data</p>
                <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedExecution.trigger_data, null, 2)}
                </pre>
              </div>
              {selectedExecution.execution_data?.results && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Execution Results</p>
                  <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedExecution.execution_data.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

