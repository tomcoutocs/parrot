'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Building2, Globe, Phone, MapPin, Search, Filter, Briefcase, Settings, Grid3X3, List } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useSession } from '@/components/providers/session-provider'
import { fetchCompanies, createCompany, updateCompany, deleteCompany, fetchServices, updateCompanyServices, getCompanyServices } from '@/lib/database-functions'
import type { Company, Service } from '@/lib/supabase'

interface CreateCompanyData {
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
}

interface EditCompanyData {
  name: string
  description?: string
  industry?: string
  website?: string
  phone?: string
  address?: string
  is_active: boolean
}

interface ServiceCategory {
  name: string
  services: Service[]
}

export default function CompaniesTab() {
  const { data: session } = useSession()
  const [companies, setCompanies] = useState<Company[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [industryFilter, setIndustryFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [createCompanyData, setCreateCompanyData] = useState<CreateCompanyData>({
    name: '',
    description: '',
    industry: '',
    website: '',
    phone: '',
    address: ''
  })
  const [editCompanyData, setEditCompanyData] = useState<EditCompanyData>({
    name: '',
    description: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
    is_active: true
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card')
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [showServicesModal, setShowServicesModal] = useState(false)
  const [editingCompanyForServices, setEditingCompanyForServices] = useState<Company | null>(null)

  // Check if current user is admin
  const isAdmin = session?.user?.role === 'admin'

  useEffect(() => {
    if (isAdmin) {
      loadCompanies()
    }
  }, [isAdmin])

  useEffect(() => {
    filterCompanies()
  }, [companies, searchTerm, industryFilter])

  const loadCompanies = async () => {
    setIsLoading(true)
    try {
      const companiesData = await fetchCompanies()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading companies:', error)
      setError('Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }

  const filterCompanies = () => {
    let filtered = companies

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.industry?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by industry
    if (industryFilter !== 'all') {
      filtered = filtered.filter(company => company.industry === industryFilter)
    }

    setFilteredCompanies(filtered)
  }

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!createCompanyData.name) {
      setError('Please fill in the company name')
      return
    }

    try {
      const result = await createCompany(createCompanyData)
      if (result.success) {
        setSuccess('Company created successfully')
        setCreateCompanyData({ name: '', description: '', industry: '', website: '', phone: '', address: '' })
        setShowCreateModal(false)
        await loadCompanies()
      } else {
        setError(result.error || 'Failed to create company')
      }
    } catch (error) {
      console.error('Error creating company:', error)
      setError('An error occurred while creating the company')
    }
  }

  const handleEditCompany = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!selectedCompany) return

    try {
      const result = await updateCompany(selectedCompany.id, editCompanyData)
      if (result.success) {
        setSuccess('Company updated successfully')
        setShowEditModal(false)
        setSelectedCompany(null)
        await loadCompanies()
      } else {
        setError(result.error || 'Failed to update company')
      }
    } catch (error) {
      console.error('Error updating company:', error)
      setError('An error occurred while updating the company')
    }
  }

  const handleDeleteCompany = async () => {
    if (!selectedCompany) return

    setError('')
    setSuccess('')

    try {
      const result = await deleteCompany(selectedCompany.id)
      if (result.success) {
        setSuccess('Company deleted successfully')
        setShowDeleteModal(false)
        setSelectedCompany(null)
        await loadCompanies()
      } else {
        setError(result.error || 'Failed to delete company')
      }
    } catch (error) {
      console.error('Error deleting company:', error)
      setError('An error occurred while deleting the company')
    }
  }

  const openEditModal = (company: Company) => {
    setSelectedCompany(company)
    setEditCompanyData({
      name: company.name,
      description: company.description || '',
      industry: company.industry || '',
      website: company.website || '',
      phone: company.phone || '',
      address: company.address || '',
      is_active: company.is_active
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (company: Company) => {
    setSelectedCompany(company)
    setShowDeleteModal(true)
  }

  const openServicesModal = async (company: Company) => {
    setEditingCompanyForServices(company)
    setShowServicesModal(true)
    
    try {
      // Load all services
      const allServices = await fetchServices()
      setServices(allServices)
      
      // Load company's current services
      const companyServices = await getCompanyServices(company.id)
      const activeServiceIds = companyServices.map(service => service.id)
      setSelectedServices(activeServiceIds)
    } catch (error) {
      console.error('Error loading services:', error)
      setError('Failed to load services')
    }
  }

  const handleUpdateCompanyServices = async () => {
    if (!editingCompanyForServices) return

    setError('')
    setSuccess('')

    try {
      const result = await updateCompanyServices(editingCompanyForServices.id, selectedServices)
      
      if (result.success) {
        setSuccess('Company services updated successfully')
        setShowServicesModal(false)
        setEditingCompanyForServices(null)
      } else {
        setError(result.error || 'Failed to update company services')
      }
    } catch (error) {
      console.error('Error updating company services:', error)
      setError('Failed to update company services')
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

  const getIndustryColor = (industry: string | undefined) => {
    switch (industry?.toLowerCase()) {
      case 'technology':
        return 'bg-blue-100 text-blue-800'
      case 'manufacturing':
        return 'bg-green-100 text-green-800'
      case 'healthcare':
        return 'bg-red-100 text-red-800'
      case 'finance':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-600">You need admin privileges to access company management.</p>
        </div>
      </div>
    )
  }

  const industries = Array.from(new Set(companies.map(c => c.industry).filter(Boolean)))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Company Management</h2>
          <p className="text-gray-600">Create and manage company accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Company
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={industryFilter} onValueChange={setIndustryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {industries.map((industry) => (
              <SelectItem key={industry} value={industry || ''}>
                {industry}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Companies Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {company.description || 'No description available'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={getIndustryColor(company.industry)}>
                    <Briefcase className="h-3 w-3 mr-1" />
                    {company.industry ?? 'Other'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {company.website && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-3 w-3 text-gray-500" />
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {company.website}
                      </a>
                    </div>
                  )}
                  {company.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-3 w-3 text-gray-500" />
                      <span>{company.phone}</span>
                    </div>
                  )}
                  {company.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3 text-gray-500" />
                      <span className="text-gray-600">{company.address}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge variant={company.is_active ? 'default' : 'secondary'}>
                      {company.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span>{new Date(company.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(company)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteModal(company)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openServicesModal(company)}
                    className="flex-1"
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    Services
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredCompanies.map((company) => (
            <Card key={company.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">{company.name}</h3>
                        <Badge className={getIndustryColor(company.industry)}>
                          <Briefcase className="h-3 w-3 mr-1" />
                          {company.industry ?? 'Other'}
                        </Badge>
                        <Badge variant={company.is_active ? 'default' : 'secondary'}>
                          {company.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-6 mt-1 text-sm text-gray-600">
                        <div className="line-clamp-1">
                          {company.description || 'No description available'}
                        </div>
                        <div>Created: {new Date(company.created_at).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-6 mt-2 text-sm">
                        {company.website && (
                          <div className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-gray-500" />
                            <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                              {company.website}
                            </a>
                          </div>
                        )}
                        {company.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-gray-500" />
                            <span>{company.phone}</span>
                          </div>
                        )}
                        {company.address && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-gray-500" />
                            <span className="text-gray-600">{company.address}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(company)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDeleteModal(company)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openServicesModal(company)}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Services
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Company Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create New Company</DialogTitle>
            <DialogDescription>
              Add a new company to the system. Company name is required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateCompany}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Company Name *
                </Label>
                <Input
                  id="name"
                  value={createCompanyData.name}
                  onChange={(e) => setCreateCompanyData({ ...createCompanyData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={createCompanyData.description}
                  onChange={(e) => setCreateCompanyData({ ...createCompanyData, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="industry" className="text-right">
                  Industry
                </Label>
                <Input
                  id="industry"
                  value={createCompanyData.industry}
                  onChange={(e) => setCreateCompanyData({ ...createCompanyData, industry: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="website" className="text-right">
                  Website
                </Label>
                <Input
                  id="website"
                  type="url"
                  value={createCompanyData.website}
                  onChange={(e) => setCreateCompanyData({ ...createCompanyData, website: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={createCompanyData.phone}
                  onChange={(e) => setCreateCompanyData({ ...createCompanyData, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="address" className="text-right">
                  Address
                </Label>
                <Textarea
                  id="address"
                  value={createCompanyData.address}
                  onChange={(e) => setCreateCompanyData({ ...createCompanyData, address: e.target.value })}
                  className="col-span-3"
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Company</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Company Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Company</DialogTitle>
            <DialogDescription>
              Update company information. Changes will be saved immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditCompany}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_name" className="text-right">
                  Company Name *
                </Label>
                <Input
                  id="edit_name"
                  value={editCompanyData.name}
                  onChange={(e) => setEditCompanyData({ ...editCompanyData, name: e.target.value })}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_description" className="text-right">
                  Description
                </Label>
                <Textarea
                  id="edit_description"
                  value={editCompanyData.description}
                  onChange={(e) => setEditCompanyData({ ...editCompanyData, description: e.target.value })}
                  className="col-span-3"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_industry" className="text-right">
                  Industry
                </Label>
                <Input
                  id="edit_industry"
                  value={editCompanyData.industry}
                  onChange={(e) => setEditCompanyData({ ...editCompanyData, industry: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_website" className="text-right">
                  Website
                </Label>
                <Input
                  id="edit_website"
                  type="url"
                  value={editCompanyData.website}
                  onChange={(e) => setEditCompanyData({ ...editCompanyData, website: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_phone" className="text-right">
                  Phone
                </Label>
                <Input
                  id="edit_phone"
                  type="tel"
                  value={editCompanyData.phone}
                  onChange={(e) => setEditCompanyData({ ...editCompanyData, phone: e.target.value })}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_address" className="text-right">
                  Address
                </Label>
                <Textarea
                  id="edit_address"
                  value={editCompanyData.address}
                  onChange={(e) => setEditCompanyData({ ...editCompanyData, address: e.target.value })}
                  className="col-span-3"
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit_status" className="text-right">
                  Status
                </Label>
                <Select
                  value={editCompanyData.is_active ? 'active' : 'inactive'}
                  onValueChange={(value) =>
                    setEditCompanyData({ ...editCompanyData, is_active: value === 'active' })
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Company Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Company</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{selectedCompany?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCompany}>
              Delete Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Company Services Modal */}
      <Dialog open={showServicesModal} onOpenChange={setShowServicesModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Services for {editingCompanyForServices?.name}</DialogTitle>
            <DialogDescription>
              Select the services that should be available to this company. All users in this company will have access to these services.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {(() => {
              const groupedServices = services.reduce((acc, service) => {
                const category = service.category
                if (!acc.find(cat => cat.name === category)) {
                  acc.push({ name: category, services: [] })
                }
                acc.find(cat => cat.name === category)!.services.push(service)
                return acc
              }, [] as ServiceCategory[])

              return groupedServices.map((category) => (
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
              ))
            })()}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowServicesModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCompanyServices}>
              Update Services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 