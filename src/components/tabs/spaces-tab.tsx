'use client'

import { useState, useEffect, useCallback } from 'react'
import { Building2, Search, ArrowRight, Users, FolderOpen, FileText, Calendar, Settings, LayoutDashboard, Kanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import { useSession } from '@/components/providers/session-provider'
import { fetchCompaniesOptimized } from '@/lib/simplified-database-functions'
import type { Company } from '@/lib/supabase'

interface SpacesTabProps {
  onSelectSpace: (companyId: string) => void
  currentSpaceId?: string | null
}

export default function SpacesTab({ onSelectSpace, currentSpaceId }: SpacesTabProps) {
  const { data: session } = useSession()
  const [spaces, setSpaces] = useState<Company[]>([])
  const [filteredSpaces, setFilteredSpaces] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState('')

  const isAdmin = session?.user?.role === 'admin'

  const loadSpaces = async () => {
    setIsLoading(true)
    try {
      const companiesData = await fetchCompaniesOptimized()
      // Filter to only active companies
      const activeSpaces = companiesData.filter(company => company.is_active)
      setSpaces(activeSpaces)
    } catch (error) {
      console.error('Error loading spaces:', error)
      setError('Failed to load spaces')
    } finally {
      setIsLoading(false)
    }
  }

  const filterSpaces = useCallback(() => {
    let filtered = spaces

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(space =>
        space.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredSpaces(filtered)
  }, [spaces, searchTerm])

  useEffect(() => {
    if (isAdmin) {
      loadSpaces()
    } else {
      // Non-admin users should only see their own company space
      if (session?.user?.company_id) {
        // For now, just show a message that they'll be redirected to their space
        setIsLoading(false)
      }
    }
  }, [isAdmin, session?.user?.company_id])

  useEffect(() => {
    filterSpaces()
  }, [filterSpaces])

  const handleSelectSpace = (companyId: string) => {
    onSelectSpace(companyId)
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            You will be automatically redirected to your space. Only administrators can view all spaces.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Spaces</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Select a space to access its content. Each company has one space.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search spaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Spaces Grid */}
      {filteredSpaces.length === 0 ? (
        <Card className="parrot-card-enhanced">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No spaces found matching your search.' : 'No spaces available.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSpaces.map((space) => {
            const isCurrentSpace = currentSpaceId === space.id

            return (
              <Card
                key={space.id}
                className={`parrot-card-enhanced cursor-pointer transition-all hover:shadow-lg ${
                  isCurrentSpace ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => handleSelectSpace(space.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <Building2 className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{space.name}</CardTitle>
                        {space.is_partner && (
                          <Badge variant="secondary" className="mt-1">
                            Partner
                          </Badge>
                        )}
                      </div>
                    </div>
                    {isCurrentSpace && (
                      <Badge variant="default">Current</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="mb-4">
                    {space.description || 'Company space with projects, documents, and team collaboration.'}
                  </CardDescription>
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Kanban className="h-4 w-4" />
                        <span>Projects</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        <span>Docs</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectSpace(space.id)
                      }}
                    >
                      Enter Space
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

