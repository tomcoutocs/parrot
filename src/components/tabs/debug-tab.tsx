'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { checkDatabaseSetup, fetchUsers, fetchCompanies } from '@/lib/database-functions'
import type { User, Company } from '@/lib/supabase'

interface DatabaseStatus {
  usersTableExists: boolean
  companiesTableExists: boolean
  companyIdColumnExists: boolean
  connectionWorking: boolean
  error?: string
}

export default function DebugTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [dbStatus, setDbStatus] = useState<DatabaseStatus | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [error, setError] = useState<string>('')

  useEffect(() => {
    runDiagnostics()
  }, [])

  const runDiagnostics = async () => {
    setIsLoading(true)
    setError('')

    try {
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
        <h2 className="text-2xl font-bold text-gray-900">Database Diagnostics</h2>
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

      <Button onClick={runDiagnostics} className="w-full">
        Run Diagnostics Again
      </Button>
    </div>
  )
} 