"use client"

import { useState, useEffect } from "react"
import { Save, Building2, Globe, Phone, MapPin, Briefcase, CheckCircle2, XCircle, Users, Key, Lock, DollarSign, Trash2, AlertTriangle, User, Mail, X, CheckCircle, FileText, Eye, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { updateCompany, updateCompanyServices, getCompanyServices, deleteCompany } from "@/lib/database-functions"
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { fetchServicesOptimized } from "@/lib/simplified-database-functions"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { invalidateCompanyCache } from "@/lib/optimized-database-functions"
import { Service, Company } from "@/lib/supabase"
import { toastSuccess, toastError } from "@/lib/toast"
import { useSession } from "@/components/providers/session-provider"
import { useRouter } from "next/navigation"
import { Loader2, Settings } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-states"
import { GoogleAdsCredentialsModal } from "@/components/modals/google-ads-credentials-modal"
import { MetaAdsCredentialsModal } from "@/components/modals/meta-ads-credentials-modal"
import { ShopifyCredentialsModal } from "@/components/modals/shopify-credentials-modal"
import { KlaviyoCredentialsModal } from "@/components/modals/klaviyo-credentials-modal"

interface ModernSettingsTabProps {
  activeSpace: string | null
  onServicesUpdated?: () => void
}

export function ModernSettingsTab({ activeSpace, onServicesUpdated }: ModernSettingsTabProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [showGoogleAdsModal, setShowGoogleAdsModal] = useState(false)
  const [showMetaAdsModal, setShowMetaAdsModal] = useState(false)
  const [showShopifyModal, setShowShopifyModal] = useState(false)
  const [showKlaviyoModal, setShowKlaviyoModal] = useState(false)
  const router = useRouter()
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    industry: "",
    website: "",
    phone: "",
    address: "",
    is_active: true,
    is_partner: false,
    selectedServices: [] as string[],
    managerId: "",
    retainer: "",
    revenue: "",
    meta_api_key: "",
    google_api_key: "",
    shopify_api_key: "",
  })

  useEffect(() => {
    if (activeSpace) {
      loadData()
    } else {
      setLoading(false)
      // Clear form data if no space is selected
      setFormData({
        name: "",
        description: "",
        industry: "",
        website: "",
        phone: "",
        address: "",
        is_active: true,
        is_partner: false,
        selectedServices: [],
        managerId: "",
        retainer: "",
        revenue: "",
        meta_api_key: "",
        google_api_key: "",
        shopify_api_key: "",
      })
    }
  }, [activeSpace])


  const loadData = async () => {
    if (!activeSpace) return
    
    setLoading(true)
    try {
      const [companiesData, servicesData, usersData, companyServicesData] = await Promise.all([
        fetchCompaniesOptimized(),
        fetchServicesOptimized(),
        fetchUsersOptimized(),
        getCompanyServices(activeSpace) // Fetch services for this specific company
      ])
      
      const spaceCompany = companiesData.find(c => c.id === activeSpace)
      if (spaceCompany) {
        setCompany(spaceCompany)
        
        // Get the service IDs from the fetched company services
        const selectedServiceIds = companyServicesData.map(service => service.id)
        
        setFormData(prev => {
          // Only update selectedServices if we actually got data, otherwise preserve current selection
          const newSelectedServices = selectedServiceIds.length > 0 || companyServicesData.length === 0 
            ? selectedServiceIds 
            : prev.selectedServices
          
          return {
            ...prev,
            name: spaceCompany.name || "",
            description: spaceCompany.description || "",
            industry: spaceCompany.industry || "",
            website: spaceCompany.website || "",
            phone: spaceCompany.phone || "",
            address: spaceCompany.address || "",
            is_active: spaceCompany.is_active !== false,
            is_partner: spaceCompany.is_partner || false,
            selectedServices: newSelectedServices,
            managerId: prev.managerId || "",
            retainer: spaceCompany.retainer?.toString() || "",
            revenue: spaceCompany.revenue?.toString() || "",
            meta_api_key: spaceCompany.meta_api_key || "",
            google_api_key: spaceCompany.google_api_key || "",
            shopify_api_key: spaceCompany.shopify_api_key || "",
          }
        })
      }
      
      setServices(servicesData)
      
      // Filter to managers and admins
      const managerUsers = usersData
        .filter(user => user.role === "manager" || user.role === "admin")
        .map(user => ({
          id: user.id,
          name: user.full_name || user.email || "Unknown"
        }))
      setManagers(managerUsers)
    } catch (error) {
      console.error("Error loading settings:", error)
      toastError("Failed to load space settings")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!activeSpace) {
      toastError("No space selected")
      return
    }

    // Store the selected services before saving to preserve them
    const servicesToSave = [...formData.selectedServices]

    setSaving(true)
    try {
      // Update company details
      const updateResult = await updateCompany(activeSpace, {
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry || undefined,
        website: formData.website || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        is_active: formData.is_active,
        is_partner: formData.is_partner,
        retainer: formData.retainer ? parseFloat(formData.retainer) : undefined,
        revenue: formData.revenue ? parseFloat(formData.revenue) : undefined,
        meta_api_key: formData.meta_api_key !== undefined ? formData.meta_api_key : undefined,
        google_api_key: formData.google_api_key !== undefined ? formData.google_api_key : undefined,
        shopify_api_key: formData.shopify_api_key !== undefined ? formData.shopify_api_key : undefined,
      })

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update company")
      }

      // Update services
      const servicesResult = await updateCompanyServices(activeSpace, servicesToSave)
      if (!servicesResult.success) {
        throw new Error(servicesResult.error || "Failed to update services")
      }

      toastSuccess("Space settings updated successfully")
      
      // Invalidate company cache to ensure fresh data
      invalidateCompanyCache()
      
      // Notify parent component to refresh services in header
      onServicesUpdated?.()
      
      // Optimistically update the form to show the saved services immediately
      // This prevents the UI from clearing while we verify the database
      setFormData(prev => ({
        ...prev,
        selectedServices: servicesToSave
      }))
      
      // Reload data after a delay to ensure database has updated
      // Retry logic to handle potential timing issues
      let retryCount = 0
      const maxRetries = 3
      
      const reloadAndVerify = async () => {
        // First verify the services were saved correctly before reloading form
        const reloadedServices = await getCompanyServices(activeSpace)
        const reloadedServiceIds = reloadedServices.map(s => s.id).sort()
        const expectedIds = servicesToSave.sort()
        
        // If the reloaded services don't match what we saved, retry
        if (JSON.stringify(expectedIds) !== JSON.stringify(reloadedServiceIds)) {
          if (retryCount < maxRetries) {
            retryCount++
            setTimeout(reloadAndVerify, 500)
            return // Don't reload form data yet
          } else {
            // Keep the optimistic update, don't reload form data
            return
          }
        }
        
        // Only reload form data if verification succeeds
        await loadData()
      }
      
      setTimeout(reloadAndVerify, 500)
    } catch (error) {
      console.error("Error saving settings:", error)
      const errorMessage = error instanceof Error ? error.message : "Failed to save settings"
      
      // Check if it's an RLS error and provide more context
      if (errorMessage.includes("42501") || errorMessage.includes("row-level security") || errorMessage.includes("RLS")) {
        toastError("Database Security Policy Error", {
          description: "The database security policy is preventing this operation. Please contact your database administrator to update the RLS policy on the 'company_services' table to allow admins and managers to manage services."
        })
      } else {
        toastError(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteSpace = async () => {
    if (!activeSpace || !company) return
    
    if (deleteConfirmation !== company.name) {
      toastError("Space name does not match")
      return
    }

    setDeleting(true)
    try {
      const result = await deleteCompany(activeSpace)
      
      if (result.success) {
        toastSuccess("Space deleted successfully")
        setShowDeleteDialog(false)
        setDeleteConfirmation("")
        // Redirect to dashboard without a space selected
        router.push("/dashboard")
      } else {
        toastError(result.error || "Failed to delete space")
      }
    } catch (error) {
      toastError("An unexpected error occurred while deleting the space")
    } finally {
      setDeleting(false)
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedServices: prev.selectedServices.includes(serviceId)
        ? prev.selectedServices.filter(id => id !== serviceId)
        : [...prev.selectedServices, serviceId]
    }))
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (!activeSpace) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-muted-foreground text-center">
          <p className="text-sm font-medium mb-2">No Space Selected</p>
          <p className="text-xs">Please select a space from the sidebar to view and edit its settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Space Settings</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          {activeSpace && (
            <Button 
              onClick={() => setShowDeleteDialog(true)} 
              variant="destructive" 
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete Space
            </Button>
          )}
        </div>
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="w-4 h-4" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Core space details and identification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Space Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter space name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter space description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g., Technology, Healthcare, Finance"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="w-4 h-4" />
              Contact Information
            </CardTitle>
            <CardDescription>
              Contact details and website
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="https://example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter full address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Briefcase className="w-4 h-4" />
              Services
            </CardTitle>
            <CardDescription>
              Select services available for this space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={formData.selectedServices.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <Label
                    htmlFor={`service-${service.id}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {service.name}
                  </Label>
                </div>
              ))}
              {services.length === 0 && (
                <p className="text-sm text-muted-foreground col-span-2">
                  No services available
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Financial Information */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="w-4 h-4" />
              Financial Information
            </CardTitle>
            <CardDescription>
              Retainer and revenue details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="retainer">Monthly Retainer</Label>
              <Input
                id="retainer"
                type="number"
                step="0.01"
                value={formData.retainer}
                onChange={(e) => setFormData({ ...formData, retainer: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Monthly retainer amount for this space
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="revenue">Revenue</Label>
              <Input
                id="revenue"
                type="number"
                step="0.01"
                value={formData.revenue}
                onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground">
                Total revenue for this space
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Status & Options */}
        <Card className="self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="w-4 h-4" />
              Status & Options
            </CardTitle>
            <CardDescription>
              Space status and configuration options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_active">Active</Label>
                <p className="text-xs text-muted-foreground">
                  Active spaces are visible and accessible
                </p>
              </div>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="is_partner">Partner</Label>
                <p className="text-xs text-muted-foreground">
                  Mark as a partner company
                </p>
              </div>
              <Switch
                id="is_partner"
                checked={formData.is_partner}
                onCheckedChange={(checked) => setFormData({ ...formData, is_partner: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Key className="w-4 h-4" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage API keys for third-party integrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {company?.google_ads_developer_token && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <Label>Google Ads API</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Google Ads API credentials
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowGoogleAdsModal(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {company?.google_ads_developer_token ? "Edit" : "Configure"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {company?.meta_ads_app_id && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <Label>Meta Ads API</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Meta (Facebook/Instagram) Ads API credentials
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMetaAdsModal(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {company?.meta_ads_app_id ? "Edit" : "Configure"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {company?.shopify_store_domain && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <Label>Shopify API</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Shopify API credentials
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShopifyModal(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {company?.shopify_store_domain ? "Edit" : "Configure"}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {company?.klaviyo_public_api_key && (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  )}
                  <div>
                    <Label>Klaviyo API</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Configure Klaviyo API credentials
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowKlaviyoModal(true)}
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {company?.klaviyo_public_api_key ? "Edit" : "Configure"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Save Button (Mobile) */}
      <div className="lg:hidden">
        <Button onClick={handleSave} disabled={saving} className="w-full gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Delete Space Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Space
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the space and all associated data including projects, tasks, documents, and events.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="border-destructive/50 bg-destructive/10">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <AlertDescription className="text-destructive">
              <strong>Warning:</strong> All data associated with this space will be permanently deleted.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="delete-confirmation">
              Type <strong>{company?.name || "the space name"}</strong> to confirm deletion:
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              placeholder="Enter space name"
              className="font-mono"
            />
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteConfirmation("")
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSpace}
              disabled={deleting || deleteConfirmation !== company?.name}
              className="gap-2"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Delete Space
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* API Credentials Modals */}
      {activeSpace && (
        <>
          <GoogleAdsCredentialsModal
            isOpen={showGoogleAdsModal}
            onClose={() => setShowGoogleAdsModal(false)}
            onSaved={() => {
              loadData()
            }}
            companyId={activeSpace}
            initialCredentials={{
              developer_token: company?.google_ads_developer_token,
              client_id: company?.google_ads_client_id,
              client_secret: company?.google_ads_client_secret,
              refresh_token: company?.google_ads_refresh_token,
              customer_id: company?.google_ads_customer_id,
            }}
          />
          <MetaAdsCredentialsModal
            isOpen={showMetaAdsModal}
            onClose={() => setShowMetaAdsModal(false)}
            onSaved={() => {
              loadData()
            }}
            companyId={activeSpace}
            initialCredentials={{
              app_id: company?.meta_ads_app_id,
              app_secret: company?.meta_ads_app_secret,
              access_token: company?.meta_ads_access_token,
              ad_account_id: company?.meta_ads_ad_account_id,
              system_user_token: company?.meta_ads_system_user_token,
            }}
          />
          <ShopifyCredentialsModal
            isOpen={showShopifyModal}
            onClose={() => setShowShopifyModal(false)}
            onSaved={() => {
              loadData()
            }}
            companyId={activeSpace}
            initialCredentials={{
              store_domain: company?.shopify_store_domain,
              api_key: company?.shopify_api_key,
              api_secret_key: company?.shopify_api_secret_key,
              access_token: company?.shopify_access_token,
              scopes: company?.shopify_scopes,
            }}
          />
          <KlaviyoCredentialsModal
            isOpen={showKlaviyoModal}
            onClose={() => setShowKlaviyoModal(false)}
            onSaved={() => {
              loadData()
            }}
            companyId={activeSpace}
            initialCredentials={{
              public_api_key: company?.klaviyo_public_api_key,
              private_api_key: company?.klaviyo_private_api_key,
            }}
          />
        </>
      )}
    </div>
  )
}

