'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Database, 
  HardDrive, 
  Radio, 
  AlertTriangle, 
  User, 
  Clock, 
  Activity,
  RefreshCw
} from 'lucide-react'
import { getActivityTimeline, getActivityStats } from '@/lib/performance-optimizations'

interface ActivityEvent {
  id: string
  timestamp: number
  type: 'database_query' | 'cache_hit' | 'cache_miss' | 'subscription' | 'error' | 'user_action'
  description: string
  duration?: number
  metadata?: Record<string, unknown>
}

const eventTypeConfig = {
  database_query: {
    icon: Database,
    color: 'bg-blue-100 text-blue-800',
    label: 'Database Query'
  },
  cache_hit: {
    icon: HardDrive,
    color: 'bg-green-100 text-green-800',
    label: 'Cache Hit'
  },
  cache_miss: {
    icon: HardDrive,
    color: 'bg-yellow-100 text-yellow-800',
    label: 'Cache Miss'
  },
  subscription: {
    icon: Radio,
    color: 'bg-purple-100 text-purple-800',
    label: 'Subscription'
  },
  error: {
    icon: AlertTriangle,
    color: 'bg-red-100 text-red-800',
    label: 'Error'
  },
  user_action: {
    icon: User,
    color: 'bg-gray-100 text-gray-800',
    label: 'User Action'
  }
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  return `${Math.floor(diff / 3600000)}h ago`
}

function formatDuration(duration: number): string {
  if (duration < 1000) return `${duration}ms`
  return `${(duration / 1000).toFixed(2)}s`
}

interface ActivityTimelineProps {
  className?: string
}

export default function ActivityTimeline({ className }: ActivityTimelineProps) {
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [stats, setStats] = useState<{
    totalEvents: number
    avgDuration: number
    errorCount: number
    eventTypeBreakdown: Record<string, number>
  } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      const [timelineEvents, activityStats] = await Promise.all([
        getActivityTimeline(),
        getActivityStats()
      ])
      setEvents(timelineEvents)
      setStats(activityStats)
    } catch (error) {
      console.error('Error refreshing activity data:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    refreshData()
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshData, 5000)
    return () => clearInterval(interval)
  }, [])

  const getEventIcon = (type: string) => {
    const config = eventTypeConfig[type as keyof typeof eventTypeConfig]
    if (!config) return Activity
    return config.icon
  }

  const getEventColor = (type: string) => {
    const config = eventTypeConfig[type as keyof typeof eventTypeConfig]
    if (!config) return 'bg-gray-100 text-gray-800'
    return config.color
  }

  const getEventLabel = (type: string) => {
    const config = eventTypeConfig[type as keyof typeof eventTypeConfig]
    if (!config) return 'Unknown'
    return config.label
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              <CardTitle>Activity Timeline (Last Hour)</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={refreshData}
              disabled={isRefreshing}
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Activity Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalEvents}
                </div>
                <div className="text-sm text-gray-600">Total Events</div>
              </div>
              <div className="text-center">
                               <div className="text-2xl font-bold text-green-600">
                 {Math.round(stats.avgDuration)}ms
               </div>
                <div className="text-sm text-gray-600">Avg Duration</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {stats.errorCount}
                </div>
                <div className="text-sm text-gray-600">Errors</div>
              </div>
                             <div className="text-center">
                 <div className="text-2xl font-bold text-purple-600">
                   {Object.keys(stats.eventTypeBreakdown).length}
                 </div>
                 <div className="text-sm text-gray-600">Event Types</div>
               </div>
            </div>
          )}

          {/* Event Type Legend */}
          <div className="flex flex-wrap gap-2 mb-4">
            {Object.entries(eventTypeConfig).map(([type, config]) => (
              <Badge key={type} variant="secondary" className={config.color}>
                <config.icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            ))}
          </div>

          {/* Timeline */}
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2" />
                  <p>No activity in the last hour</p>
                </div>
              ) : (
                events.map((event) => {
                  const Icon = getEventIcon(event.type)
                  const color = getEventColor(event.type)
                  const label = getEventLabel(event.type)

                  return (
                    <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-shrink-0">
                        <Badge variant="secondary" className={color}>
                          <Icon className="h-3 w-3" />
                        </Badge>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900">
                            {event.description}
                          </p>
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(event.timestamp)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {label}
                          </Badge>
                          {event.duration && (
                            <Badge variant="outline" className="text-xs">
                              {formatDuration(event.duration)}
                            </Badge>
                          )}
                        </div>
                        {event.metadata && Object.keys(event.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer">
                              View Details
                            </summary>
                            <pre className="text-xs text-gray-600 mt-1 p-2 bg-white rounded border">
                              {JSON.stringify(event.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Event Type Breakdown */}
          {stats && (
            <div className="mt-6">
              <h4 className="text-sm font-medium mb-3">Event Type Breakdown</h4>
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                 {Object.entries(stats.eventTypeBreakdown).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {React.createElement(getEventIcon(type), { className: 'h-4 w-4' })}
                      <span className="text-sm">{getEventLabel(type)}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {count as number}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
