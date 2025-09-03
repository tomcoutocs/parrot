'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, AlertCircle, Shield } from 'lucide-react'
import { checkDatabaseSetup, fetchUsers, fetchCompanies, getDatabasePerformanceMetrics } from '@/lib/optimized-database-functions'
import { getPerformanceMetrics } from '@/lib/performance-optimizations'
import type { User, Company } from '@/lib/supabase'
import ActivityTimeline from '@/components/activity-timeline'

interface DatabaseStatus {
  usersTableExists: boolean
  companiesTableExists: boolean
  companyIdColumnExists: boolean
  connectionWorking: boolean
  error?: string
}

export default function DebugTab() {
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [error, setError] = useState<string>('')
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    activeSubscriptions: string[]
    subscriptionCount: number
    cacheStats: Record<string, number>
  } | null>(null)
  const [dbPerformanceMetrics, setDbPerformanceMetrics] = useState<{
    activeSubscriptions: string[]
    subscriptionCount: number
  } | null>(null)

  useEffect(() => {
    runDiagnostics()
  }, [])

  // Security check - only admin users can access debug tab
  if (!session || session.user.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">
            This debug panel is only available to administrators.
          </p>
          <Badge variant="destructive" className="text-sm">
            Admin Access Required
          </Badge>
        </div>
      </div>
    )
  }

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError('')

    try {
      // Get performance metrics
      setPerformanceMetrics(getPerformanceMetrics())
      setDbPerformanceMetrics(getDatabasePerformanceMetrics())

      // Check database setup
      const status = await checkDatabaseSetup()
      setDbStatus(status)

      // Try to fetch users
      try {
        const usersData = await fetchUsers()
        setUsers(usersData)
      } catch (userError) {
        console.error('Error fetching users:', userError)
      }

      // Try to fetch companies
      try {
        const companiesData = await fetchCompanies()
        setCompanies(companiesData)
      } catch (companyError) {
        console.error('Error fetching companies:', companyError)
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Database Diagnostics</h2>
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            Admin Only
          </Badge>
        </div>
        <p className="text-gray-600">Check the status of your database connection and tables</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Database Status */}
      <Card>
        <CardHeader>
          <CardTitle>Database Connection Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={dbStatus?.connectionWorking ? 'default' : 'destructive'}>
                {dbStatus?.connectionWorking ? 'Connected' : 'Not Connected'}
              </Badge>
              <span className="text-sm text-gray-600">Database Connection</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={dbStatus?.usersTableExists ? 'default' : 'destructive'}>
                {dbStatus?.usersTableExists ? 'Exists' : 'Missing'}
              </Badge>
              <span className="text-sm text-gray-600">Users Table</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={dbStatus?.companiesTableExists ? 'default' : 'destructive'}>
                {dbStatus?.companiesTableExists ? 'Exists' : 'Missing'}
              </Badge>
              <span className="text-sm text-gray-600">Companies Table</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={dbStatus?.companyIdColumnExists ? 'default' : 'destructive'}>
                {dbStatus?.companyIdColumnExists ? 'Exists' : 'Missing'}
              </Badge>
              <span className="text-sm text-gray-600">Company ID Column</span>
            </div>
          </div>

          {dbStatus?.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{dbStatus.error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {performanceMetrics?.cacheStats?.totalRequests && performanceMetrics.cacheStats.totalRequests > 0 
                  ? ((performanceMetrics.cacheStats.cacheHits / performanceMetrics.cacheStats.totalRequests) * 100).toFixed(2) + '%'
                  : '0%'}
              </Badge>
              <span className="text-sm text-gray-600">Cache Hit Rate</span>
            </div>
                         <div className="flex items-center gap-2">
               <Badge variant="outline">
                 {performanceMetrics?.cacheStats?.cacheSize || 0}
               </Badge>
               <span className="text-sm text-gray-600">Cache Size</span>
             </div>
             <div className="flex items-center gap-2">
               <Badge variant="outline">
                 {performanceMetrics?.cacheStats?.totalRequests || 0}
               </Badge>
               <span className="text-sm text-gray-600">Total Requests</span>
             </div>
             <div className="flex items-center gap-2">
               <Badge variant="outline">
                 {performanceMetrics?.cacheStats?.requestDeduplications || 0}
               </Badge>
               <span className="text-sm text-gray-600">Deduplications</span>
             </div>
             <div className="flex items-center gap-2">
               <Badge variant="outline">
                 {Math.round(performanceMetrics?.cacheStats?.averageResponseTime || 0)}ms
               </Badge>
               <span className="text-sm text-gray-600">Avg Response Time</span>
             </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {dbPerformanceMetrics?.subscriptionCount || 0}
              </Badge>
              <span className="text-sm text-gray-600">Active Subscriptions</span>
            </div>
          </div>

          {dbPerformanceMetrics?.activeSubscriptions && dbPerformanceMetrics.activeSubscriptions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Active Subscriptions:</h4>
              <div className="space-y-1">
                {dbPerformanceMetrics.activeSubscriptions.map((sub: string, index: number) => (
                  <div key={index} className="text-xs text-gray-500 bg-gray-50 p-1 rounded">
                    {sub}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Data */}
      <Card>
        <CardHeader>
          <CardTitle>Users Data ({users.length} users)</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length > 0 ? (
            <div className="space-y-2">
              {users.slice(0, 5).map((user, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{user.full_name}</span>
                  <span className="text-gray-500">({user.email})</span>
                  <Badge variant="outline">{user.role}</Badge>
                  {user.company_id && (
                    <Badge variant="secondary">Company: {user.company_id}</Badge>
                  )}
                </div>
              ))}
              {users.length > 5 && (
                <p className="text-sm text-gray-500">... and {users.length - 5} more</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No users found</p>
          )}
        </CardContent>
      </Card>

             {/* Companies Data */}
       <Card>
         <CardHeader>
           <CardTitle>Companies Data ({companies.length} companies)</CardTitle>
         </CardHeader>
         <CardContent>
           {companies.length > 0 ? (
             <div className="space-y-2">
               {companies.slice(0, 5).map((company, index) => (
                 <div key={index} className="flex items-center gap-2 text-sm">
                   <span className="font-medium">{company.name}</span>
                   {company.industry && (
                     <Badge variant="outline">{company.industry}</Badge>
                   )}
                 </div>
               ))}
               {companies.length > 5 && (
                 <p className="text-sm text-gray-500">... and {companies.length - 5} more</p>
               )}
             </div>
           ) : (
             <p className="text-sm text-gray-500">No companies found</p>
           )}
         </CardContent>
       </Card>

       {/* Activity Timeline */}
       <ActivityTimeline />

       <Button onClick={runDiagnostics} className="w-full">
         Run Diagnostics Again
       </Button>
    </div>
  )
} 