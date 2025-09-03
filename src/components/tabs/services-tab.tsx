'use client'

import { useState, useEffect, useRef } from 'react'
import { Settings, CheckCircle, Circle, Edit, Building2, Filter, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSession } from '@/components/providers/session-provider'
import { fetchServicesWithCompanyStatus, updateCompanyServices, getCompanyServices } from '@/lib/database-functions'
import type { ServiceWithCompanyStatus, Company } from '@/lib/supabase'

interface ServiceCategory {
  name: string
  services: ServiceWithCompanyStatus[]
}

export default function ServicesTab() {
  const { data: session } = useSession()
  const [services, setServices] = useState<ServiceWithCompanyStatus[]>([])
  const [filteredServices, setFilteredServices] = useState<ServiceCategory[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showOnlyActive, setShowOnlyActive] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Check if current user is admin
  const isAdmin = session?.user?.role === 'admin'
  const userCompanyId = session?.user?.company_id

  useEffect(() => {
    loadServices()
  }, [userCompanyId])

  useEffect(() => {
    filterServices()
  }, [services, searchTerm, categoryFilter, showOnlyActive])

  // Debug useEffect to log state changes
  useEffect(() => {
    console.log('Alert state changed - Error:', error, 'Success:', success)
  }, [error, success])

  // Auto-clear alerts after 5 seconds - temporarily disabled for testing
  // useEffect(() => {
  //   // Clear any existing timeout
  //   if (alertTimeoutRef.current) {
  //     clearTimeout(alertTimeoutRef.current)
  //   }

  //   // Set new timeout if there's an alert
  //   if (error || success) {
  //     alertTimeoutRef.current = setTimeout(() => {
  //       setError('')
  //       setSuccess('')
  //       alertTimeoutRef.current = null
  //     }, 5000)
  //   }

  //   // Cleanup on unmount
  //   return () => {
  //     if (alertTimeoutRef.current) {
  //       clearTimeout(alertTimeoutRef.current)
  //     }
  //   }
  // }, [error, success])

  const clearAlerts = () => {
    console.log('Clearing alerts...')
    if (alertTimeoutRef.current) {
      clearTimeout(alertTimeoutRef.current)
      alertTimeoutRef.current = null
    }
    setError('')
    setSuccess('')
  }

  const loadServices = async () => {
    setIsLoading(true)
    try {
      const servicesData = await fetchServicesWithCompanyStatus(userCompanyId)
      setServices(servicesData)
    } catch (error) {
      console.error('Error loading services:', error)
      setError('Failed to load services')
    } finally {
      setIsLoading(false)
    }
  }

  const filterServices = () => {
    let filtered = services

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(service =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(service => service.category === categoryFilter)
    }

    // Filter by company active status
    if (showOnlyActive) {
      filtered = filtered.filter(service => service.is_company_active)
    }

    // Group by category
    const grouped = filtered.reduce((acc, service) => {
      const category = service.category
      if (!acc.find(cat => cat.name === category)) {
        acc.push({ name: category, services: [] })
      }
      acc.find(cat => cat.name === category)!.services.push(service)
      return acc
    }, [] as ServiceCategory[])

    setFilteredServices(grouped)
  }

  const openEditModal = async () => {
    if (!userCompanyId) {
      setError('No company assigned to user')
      return
    }

    try {
      const companyServices = await getCompanyServices(userCompanyId)
      const activeServiceIds = companyServices.map(service => service.id)
      setSelectedServices(activeServiceIds)
      setShowEditModal(true)
    } catch (error) {
      console.error('Error loading company services:', error)
      setError('Failed to load company services')
    }
  }

  const handleUpdateServices = async () => {
    if (!userCompanyId) {
      setError('No company assigned to user')
      return
    }

    setIsUpdating(true)
    setError('')
    setSuccess('')

    try {
      console.log('Updating company services for company:', userCompanyId)
      console.log('Selected services:', selectedServices)
      
      const result = await updateCompanyServices(userCompanyId, selectedServices)
      
      if (result.success) {
        setSuccess('Services updated successfully')
        setShowEditModal(false)
        loadServices() // Reload services to reflect changes
      } else {
        console.error('Failed to update services:', result.error)
        setError(result.error || 'Failed to update services')
      }
    } catch (error) {
      console.error('Error updating services:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Failed to update services: ${errorMessage}`)
    } finally {
      setIsUpdating(false)
    }
  }

  const toggleService = (serviceId: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceId) 
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Paid Media': return 'bg-blue-100 text-blue-800'
      case 'Organic': return 'bg-green-100 text-green-800'
      case 'Creative': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Paid Media': return '💰'
      case 'Organic': return '🌱'
      case 'Creative': return '🎨'
      default: return '📋'
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-muted-foreground">
            View and manage the services available to your company
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={openEditModal} className="flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Manage Company Services
            </Button>
          )}
        </div>
      </div>

      {/* Company Services Summary */}
      {userCompanyId && (
        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Your Company Services</h3>
                  <p className="text-sm text-green-600">
                    {services.filter(s => s.is_company_active).length} of {services.length} services are available to your company
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600">
                  {services.filter(s => s.is_company_active).length}
                </div>
                <div className="text-xs text-green-500">Active Services</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {error && (
        <Alert variant="destructive" className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="pr-8">{error}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-destructive/20"
            onClick={clearAlerts}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      )}
      {success && (
        <Alert className="relative">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription className="pr-8">{success}</AlertDescription>
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-muted"
            onClick={clearAlerts}
          >
            <X className="h-3 w-3" />
          </Button>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search services..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Paid Media">Paid Media</SelectItem>
            <SelectItem value="Organic">Organic</SelectItem>
            <SelectItem value="Creative">Creative</SelectItem>
          </SelectContent>
        </Select>
        {userCompanyId && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id="show-only-active"
              checked={showOnlyActive}
              onCheckedChange={(checked) => setShowOnlyActive(checked as boolean)}
            />
            <Label htmlFor="show-only-active" className="text-sm font-medium cursor-pointer">
              Show only company services
            </Label>
          </div>
        )}
      </div>

      {/* Services Grid */}
      <div className="space-y-8">
        {filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No services found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filter criteria
            </p>
          </div>
        ) : (
          filteredServices.map((category) => (
            <div key={category.name} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{getCategoryIcon(category.name)}</span>
                <h2 className="text-xl font-semibold">{category.name}</h2>
                <Badge variant="secondary" className={getCategoryColor(category.name)}>
                  {category.services.length} services
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.services.map((service) => (
                  <Card 
                    key={service.id} 
                    className={`relative transition-all duration-200 hover:shadow-lg ${
                      service.is_company_active 
                        ? 'ring-2 ring-green-500 bg-green-50 border-green-200 shadow-md' 
                        : 'hover:ring-1 hover:ring-gray-300'
                    }`}
                  >
                    {service.is_company_active && (
                      <div className="absolute -top-2 -right-2">
                        <div className="bg-green-500 text-white rounded-full p-1 shadow-lg">
                          <CheckCircle className="h-4 w-4" />
                        </div>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {service.name}
                        </CardTitle>
                        <div className="flex flex-col items-end gap-1">
                          {service.subcategory && (
                            <Badge variant="outline" className="text-xs">
                              {service.subcategory}
                            </Badge>
                          )}
                          {service.is_company_active && (
                            <Badge className="bg-green-100 text-green-800 text-xs font-medium">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {service.description}
                      </CardDescription>
                      {service.is_company_active && (
                        <div className="mt-3 p-2 bg-green-100 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 text-green-700 text-sm font-medium">
                            <CheckCircle className="h-4 w-4" />
                            <span>Available to your company</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit Services Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => {
        if (!open) {
          setError('')
          setSuccess('')
        }
        setShowEditModal(open)
      }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Company Services</DialogTitle>
            <DialogDescription>
              Select the services that should be available to your company. All users in your company will have access to these services.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {filteredServices.map((category) => (
              <div key={category.name} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getCategoryIcon(category.name)}</span>
                  <h3 className="font-semibold">{category.name}</h3>
                </div>
                
                <div className="space-y-2">
                  {category.services.map((service) => (
                    <div key={service.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={() => toggleService(service.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={service.id} className="font-medium cursor-pointer">
                          {service.name}
                        </Label>
                        {service.subcategory && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {service.subcategory}
                          </Badge>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateServices} disabled={isUpdating}>
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Update Services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 