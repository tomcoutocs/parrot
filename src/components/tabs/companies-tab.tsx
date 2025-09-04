'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, Building2, Search, Settings, Grid3X3, List, X, ExternalLink, Calendar, FileText, HardDrive, Users } from 'lucide-react'
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
import { createCompany, updateCompany, deleteCompany, fetchServices, updateCompanyServices, getCompanyServices, fetchCompaniesWithServices } from '@/lib/simplified-database-functions'
import { fetchCompanyDetails, testCompanyAccess, simpleCompanyTest, fetchCompaniesDirect } from '@/lib/company-detail-functions'
import type { Company, Service } from '@/lib/supabase'

interface CreateCompanyData {
  name: string
  is_partner?: boolean
  userInvitations?: Array<{
    email: string
    full_name: string
    role: 'admin' | 'manager' | 'user' | 'internal'
  }>
}

interface EditCompanyData {
  name: string
  is_active: boolean
  is_partner: boolean
}

interface ServiceCategory {
  name: string
  services: Service[]
}

interface CompanyDetails {
  company: Company
  projects: any[]
  tasks: any[]
  users: any[]
  storage: {
    totalSize: number
    documentCount: number
    folderCount: number
  }
}

export default function CompaniesTab({ selectedCompanyId }: { selectedCompanyId?: string | null }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [companies, setCompanies] = useState<(Company & { services?: Service[] })[]>([])
  const [filteredCompanies, setFilteredCompanies] = useState<(Company & { services?: Service[] })[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [partnerFilter, setPartnerFilter] = useState<string>('all')
  const [serviceFilter, setServiceFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [createCompanyData, setCreateCompanyData] = useState<CreateCompanyData>({
    name: '',
    is_partner: false,
    userInvitations: []
  })
  const [editCompanyData, setEditCompanyData] = useState<EditCompanyData>({
    name: '',
    is_active: true,
    is_partner: false
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list')
  const [services, setServices] = useState<Service[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [showServicesModal, setShowServicesModal] = useState(false)
  const [editingCompanyForServices, setEditingCompanyForServices] = useState<Company | null>(null)
  const [showInviteUsersInCreateModal, setShowInviteUsersInCreateModal] = useState(false)
  const [invitationForm, setInvitationForm] = useState({
    email: '',
    full_name: '',
    role: 'user' as 'admin' | 'manager' | 'user' | 'internal'
  })

  // Company detail modal state
  const [showCompanyDetailModal, setShowCompanyDetailModal] = useState(false)
  const [selectedCompanyDetails, setSelectedCompanyDetails] = useState<CompanyDetails | null>(null)
  const [isLoadingCompanyDetails, setIsLoadingCompanyDetails] = useState(false)

  // Check if current user is admin
  const isAdmin = session?.user?.role === 'admin'

  useEffect(() => {
    if (isAdmin) {
      loadCompanies()
      loadServices()
    }
  }, [isAdmin])

  useEffect(() => {
    filterCompanies()
  }, [companies, searchTerm, partnerFilter, serviceFilter])

  // Highlight selected company if provided
  useEffect(() => {
    if (selectedCompanyId) {
      // Scroll to the selected company if it exists
      const companyElement = document.getElementById(`company-${selectedCompanyId}`)
      if (companyElement) {
        companyElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Add a temporary highlight effect
        companyElement.classList.add('ring-2', 'ring-blue-500', 'ring-opacity-50')
        setTimeout(() => {
          companyElement.classList.remove('ring-2', 'ring-blue-500', 'ring-opacity-50')
        }, 3000)
      }
    }
  }, [selectedCompanyId, filteredCompanies])

  const loadCompanies = async () => {
    setIsLoading(true)
    try {
      const companiesData = await fetchCompaniesWithServices()
      setCompanies(companiesData)
    } catch (error) {
      console.error('Error loading companies:', error)
      setError('Failed to load companies')
    } finally {
      setIsLoading(false)
    }
  }

  const loadServices = async () => {
    try {
      const servicesData = await fetchServices()
      setServices(servicesData)
    } catch (error) {
      console.error('Error loading services:', error)
      setError('Failed to load services')
    }
  }

  const filterCompanies = () => {
    let filtered = companies

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(company =>
        company.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by partner status
    if (partnerFilter !== 'all') {
      const isPartner = partnerFilter === 'partner'
      filtered = filtered.filter(company => company.is_partner === isPartner)
    }

    // Filter by service
    if (serviceFilter !== 'all') {
      filtered = filtered.filter(company => 
        company.services && company.services.some(service => service.id === serviceFilter)
      )
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
        // If there are user invitations, create them
        if (createCompanyData.userInvitations && createCompanyData.userInvitations.length > 0 && result.data) {
          try {
            const invitationData = createCompanyData.userInvitations.map(invitation => ({
              ...invitation,
              company_id: result.data!.id,
              invited_by: session?.user?.id || '',
              tab_permissions: ['projects', 'forms', 'services', 'calendar', 'documents'] // Default permissions
            }))
            
            const invitationResult = await fetch('/api/invitations/bulk', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ invitations: invitationData }),
            })

            if (!invitationResult.ok) {
              console.error('Failed to create user invitations')
            }
          } catch (invitationError) {
            console.error('Error creating user invitations:', invitationError)
          }
        }

        setSuccess('Company created successfully')
        setCreateCompanyData({ name: '', is_partner: false, userInvitations: [] })
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
      is_active: company.is_active,
      is_partner: company.is_partner
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

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Paid Media': return '💰'
      case 'Organic': return '🌱'
      case 'Creative': return '🎨'
      default: return '📋'
    }
  }

  const handleNavigateToCompany = async (companyId: string) => {
    setIsLoadingCompanyDetails(true)
    setShowCompanyDetailModal(true)
    setError('') // Clear any previous errors
    
    // Debug: Log the company ID being requested
    console.log('Attempting to fetch company with ID:', companyId)
    
    try {
      const details = await fetchCompanyDetails(companyId)
      setSelectedCompanyDetails(details)
    } catch (error) {
      console.error('Error loading company details:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load company details'
      setError(errorMessage)
      setSelectedCompanyDetails(null)
      
      // Debug: Test company access and log available companies
      try {
        const testResult = await testCompanyAccess()
        console.log('Available companies (with RLS):', testResult)
        
        const simpleTestResult = await simpleCompanyTest()
        console.log('Available companies (simple):', simpleTestResult)
        
        const directResult = await fetchCompaniesDirect()
        console.log('Available companies (direct):', directResult)
        
        // Also log the current companies list to see what IDs we have
        console.log('Current companies in state:', companies.map(c => ({ id: c.id, name: c.name })))
      } catch (debugError) {
        console.error('Debug error:', debugError)
      }
    } finally {
      setIsLoadingCompanyDetails(false)
    }
  }

  const handleEditClick = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation()
    openEditModal(company)
  }

  const handleDeleteClick = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation()
    openDeleteModal(company)
  }

  const handleServicesClick = (e: React.MouseEvent, company: Company) => {
    e.stopPropagation()
    openServicesModal(company)
  }

  const formatStorageSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getTaskStatusCount = (status: string) => {
    return selectedCompanyDetails?.tasks.filter(task => task.status === status).length || 0
  }

  const getProjectStatusCount = (status: string) => {
    return selectedCompanyDetails?.projects.filter(project => project.status === status).length || 0
  }

  const handleNavigateToTab = (tab: string) => {
    setShowCompanyDetailModal(false)
    const companyId = selectedCompanyDetails?.company.id
    console.log('Navigating to tab:', tab, 'with company ID:', companyId)
    if (companyId) {
      const url = `/dashboard?tab=${tab}&company=${companyId}`
      console.log('Generated URL:', url)
      // Use window.location.href to force a full navigation
      window.location.href = url
    } else {
      console.log('No company ID, navigating to:', `/dashboard?tab=${tab}`)
      window.location.href = `/dashboard?tab=${tab}`
    }
  }

  const getTagColor = (serviceId: string) => {
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-green-100 text-green-800 border-green-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-orange-100 text-orange-800 border-orange-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-teal-100 text-teal-800 border-teal-200',
      'bg-yellow-100 text-yellow-800 border-yellow-200',
      'bg-red-100 text-red-800 border-red-200',
      'bg-emerald-100 text-emerald-800 border-emerald-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-violet-100 text-violet-800 border-violet-200',
      'bg-amber-100 text-amber-800 border-amber-200',
      'bg-lime-100 text-lime-800 border-lime-200',
      'bg-rose-100 text-rose-800 border-rose-200',
      'bg-sky-100 text-sky-800 border-sky-200'
    ]
    // Use service ID to get unique color assignment
    const hash = serviceId.split('').reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc)
    }, 0)
    const index = Math.abs(hash) % colors.length
    return colors[index]
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
        <Select value={partnerFilter} onValueChange={setPartnerFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by partner status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="partner">Partners Only</SelectItem>
            <SelectItem value="non-partner">Non-Partners Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by service" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {services.map((service) => (
              <SelectItem key={service.id} value={service.id}>
                {service.name}
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

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <span>
          Showing {filteredCompanies.length} of {companies.length} companies
          {(searchTerm || partnerFilter !== 'all' || serviceFilter !== 'all') && ' (filtered)'}
        </span>
      </div>

      {/* Companies Display */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : viewMode === 'card' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCompanies.map((company) => (
            <Card 
              key={company.id} 
              id={`company-${company.id}`}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              onClick={() => handleNavigateToCompany(company.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                                         <div>
                       <CardTitle className="text-lg">{company.name}</CardTitle>
                       <CardDescription className="line-clamp-2">
                         {company.is_partner ? 'Partner Company' : 'Client Company'}
                       </CardDescription>
                     </div>
                  </div>
                                                       <div className="flex gap-2">
                    {company.is_partner && (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                        Partner
                      </Badge>
                    )}
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                                 <div className="space-y-2">
                   <div className="flex items-center justify-between text-sm">
                     <span className="text-gray-600">Status:</span>
                     <Badge variant={company.is_active ? 'default' : 'secondary'}>
                       {company.is_active ? 'Active' : 'Inactive'}
                     </Badge>
                   </div>
                   {company.services && company.services.length > 0 && (
                     <div className="flex items-start justify-between text-sm">
                       <span className="text-gray-600">Services:</span>
                       <div className="flex flex-wrap gap-1 max-w-48">
                         {company.services.map((service) => (
                           <Badge key={service.id} className={`text-xs font-medium ${getTagColor(service.id)}`}>
                             {service.name}
                           </Badge>
                         ))}
                       </div>
                     </div>
                   )}
                   <div className="flex items-center justify-between text-sm">
                     <span className="text-gray-600">Created:</span>
                     <span>{new Date(company.created_at).toLocaleDateString()}</span>
                   </div>
                 </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleEditClick(e, company)}
                    className="flex-1"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleDeleteClick(e, company)}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => handleServicesClick(e, company)}
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
                 <div className="space-y-1">
           {filteredCompanies.map((company) => (
             <Card 
               key={company.id} 
               id={`company-${company.id}`}
               className="hover:shadow-lg transition-shadow cursor-pointer group"
               onClick={() => handleNavigateToCompany(company.id)}
             >
               <CardContent className="p-3">
                                 <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                     <div className="p-2 bg-blue-100 rounded-lg">
                       <Building2 className="h-6 w-6 text-blue-600" />
                     </div>
                                         <div className="flex-1">
                       <div className="flex items-center gap-3">
                         <h3 className="font-semibold text-lg">{company.name}</h3>
                         {company.is_partner && (
                           <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                             Partner
                           </Badge>
                         )}
                         <Badge variant={company.is_active ? 'default' : 'secondary'}>
                           {company.is_active ? 'Active' : 'Inactive'}
                         </Badge>
                       </div>
                       <div className="flex items-center gap-6 mt-1 text-sm text-gray-600">
                         <div className="line-clamp-1">
                           {company.is_partner ? 'Partner Company' : 'Client Company'}
                         </div>
                         <div>Created: {new Date(company.created_at).toLocaleDateString()}</div>
                       </div>
                       {company.services && company.services.length > 0 && (
                         <div className="flex items-center gap-2 mt-2">
                           <span className="text-sm text-gray-600">Services:</span>
                           <div className="flex flex-wrap gap-1">
                             {company.services.map((service) => (
                               <Badge key={service.id} className={`text-xs font-medium ${getTagColor(service.id)}`}>
                                 {service.name}
                               </Badge>
                             ))}
                           </div>
                         </div>
                       )}
                     </div>
                  </div>
                  <div className="flex gap-2">
                    <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleEditClick(e, company)}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDeleteClick(e, company)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleServicesClick(e, company)}
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
                <Label htmlFor="is_partner" className="text-right">
                  Partner Status
                </Label>
               <div className="col-span-3 flex items-center space-x-2">
                 <Checkbox
                   id="is_partner"
                   checked={createCompanyData.is_partner}
                   onCheckedChange={(checked) => 
                     setCreateCompanyData(prev => ({ ...prev, is_partner: !!checked }))
                   }
                 />
                 <Label htmlFor="is_partner" className="text-sm font-normal">
                   Mark as Partner Company
                 </Label>
               </div>
             </div>
            </div>

            {/* User Invitations Section */}
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-medium">Invite Users to Company</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowInviteUsersInCreateModal(!showInviteUsersInCreateModal)}
                >
                  {showInviteUsersInCreateModal ? 'Hide' : 'Add Users'}
                </Button>
              </div>
              
              {showInviteUsersInCreateModal && (
                <div className="space-y-4">
                  <div className="text-sm text-gray-600">
                    Add users who will be invited to join this company. They will receive an email invitation to set up their account.
                  </div>
                  
                  {createCompanyData.userInvitations && createCompanyData.userInvitations.length > 0 && (
                    <div className="space-y-2">
                      <h5 className="text-sm font-medium">Users to Invite:</h5>
                      {createCompanyData.userInvitations.map((invitation, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <div className="text-sm font-medium">{invitation.full_name}</div>
                            <div className="text-xs text-gray-500">{invitation.email} • {invitation.role}</div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const updatedInvitations = createCompanyData.userInvitations?.filter((_, i) => i !== index) || []
                              setCreateCompanyData(prev => ({ ...prev, userInvitations: updatedInvitations }))
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="invite_email" className="text-xs">Email</Label>
                        <Input
                          id="invite_email"
                          type="email"
                          placeholder="user@example.com"
                          className="text-sm"
                          value={invitationForm.email}
                          onChange={(e) => setInvitationForm(prev => ({ ...prev, email: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite_name" className="text-xs">Full Name</Label>
                        <Input
                          id="invite_name"
                          placeholder="John Doe"
                          className="text-sm"
                          value={invitationForm.full_name}
                          onChange={(e) => setInvitationForm(prev => ({ ...prev, full_name: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="invite_role" className="text-xs">Role</Label>
                                             <Select value={invitationForm.role} onValueChange={(value) => setInvitationForm(prev => ({ ...prev, role: value as 'admin' | 'manager' | 'user' | 'internal' }))}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (invitationForm.email && invitationForm.full_name) {
                          const newInvitation = {
                            email: invitationForm.email,
                            full_name: invitationForm.full_name,
                            role: invitationForm.role
                          }
                          const updatedInvitations = [...(createCompanyData.userInvitations || []), newInvitation]
                          setCreateCompanyData(prev => ({ ...prev, userInvitations: updatedInvitations }))
                          setInvitationForm({ email: '', full_name: '', role: 'user' })
                        }
                      }}
                      disabled={!invitationForm.email || !invitationForm.full_name}
                    >
                      Add User
                    </Button>
                  </div>
                </div>
              )}
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
               <div className="grid grid-cols-4 items-center gap-4">
                 <Label htmlFor="edit_is_partner" className="text-right">
                   Partner Status
                 </Label>
                 <div className="col-span-3 flex items-center space-x-2">
                   <Checkbox
                     id="edit_is_partner"
                     checked={editCompanyData.is_partner}
                     onCheckedChange={(checked) => 
                       setEditCompanyData(prev => ({ ...prev, is_partner: !!checked }))
                     }
                   />
                   <Label htmlFor="edit_is_partner" className="text-sm font-normal">
                     Mark as Partner Company
                   </Label>
                 </div>
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

      {/* Company Detail Modal */}
      <Dialog open={showCompanyDetailModal} onOpenChange={setShowCompanyDetailModal}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Building2 className="h-6 w-6" />
              {selectedCompanyDetails?.company.name || 'Company Details'}
            </DialogTitle>
            <DialogDescription>
              Comprehensive overview of company information and metrics
            </DialogDescription>
          </DialogHeader>

          {isLoadingCompanyDetails ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : selectedCompanyDetails ? (
            <div className="space-y-6">
              {/* Company Status */}
              <div className="flex items-center gap-2">
                <Badge variant={selectedCompanyDetails.company.is_partner ? "default" : "secondary"}>
                  {selectedCompanyDetails.company.is_partner ? "Partner Company" : "Client Company"}
                </Badge>
                <Badge variant={selectedCompanyDetails.company.is_active ? "default" : "destructive"}>
                  {selectedCompanyDetails.company.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Projects Overview */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToTab('projects')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Projects</CardTitle>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCompanyDetails.projects.length}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="default" className="text-xs">
                        {getProjectStatusCount('active')} Active
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getProjectStatusCount('completed')} Completed
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Tasks Overview */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToTab('projects')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{getTaskStatusCount('in_progress') + getTaskStatusCount('todo')}</div>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="default" className="text-xs">
                        {getTaskStatusCount('in_progress')} In Progress
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {getTaskStatusCount('todo')} To Do
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                {/* Team Members */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToTab('admin')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCompanyDetails.users.length}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Active team members
                    </p>
                  </CardContent>
                </Card>

                {/* Calendar */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToTab('company-calendars')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Company Calendar</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">View</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Company events & meetings
                    </p>
                  </CardContent>
                </Card>

                {/* Documents */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToTab('documents')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Documents</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedCompanyDetails.storage.documentCount}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedCompanyDetails.storage.folderCount} folders
                    </p>
                  </CardContent>
                </Card>

                {/* Storage Usage */}
                <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleNavigateToTab('documents')}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
                    <HardDrive className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatStorageSize(selectedCompanyDetails.storage.totalSize)}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total storage used
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity Section */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest updates from this company</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedCompanyDetails.projects.slice(0, 3).map((project) => (
                      <div key={project.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{project.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {project.task_count} tasks • Updated {new Date(project.updated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                          {project.status}
                        </Badge>
                      </div>
                    ))}
                    {selectedCompanyDetails.projects.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        No recent activity
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
                <p className="text-muted-foreground mb-2">Failed to load company details</p>
                {error && (
                  <p className="text-sm text-red-500">{error}</p>
                )}
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowCompanyDetailModal(false)}
                  className="mt-2"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompanyDetailModal(false)}>
              Close
            </Button>
            <Button onClick={() => handleNavigateToTab('companies')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage Company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 