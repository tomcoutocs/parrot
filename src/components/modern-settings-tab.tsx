"use client"

import { useState, useEffect } from "react"
import { Save, Building2, Globe, Phone, MapPin, Briefcase, CheckCircle2, XCircle, Users, Key, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { updateCompany, updateCompanyServices, getCompanyServices } from "@/lib/database-functions"
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { fetchServicesOptimized } from "@/lib/simplified-database-functions"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { Service, Company } from "@/lib/supabase"
import { toastSuccess, toastError } from "@/lib/toast"
import { useSession } from "@/components/providers/session-provider"

interface ModernSettingsTabProps {
  activeSpace: string | null
}

export function ModernSettingsTab({ activeSpace }: ModernSettingsTabProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [company, setCompany] = useState<Company | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([])
  
  // Debug: Log when activeSpace changes
  useEffect(() => {
    console.log('ModernSettingsTab - activeSpace changed:', activeSpace)
  }, [activeSpace])
  
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
        
        setFormData({
          name: spaceCompany.name || "",
          description: spaceCompany.description || "",
          industry: spaceCompany.industry || "",
          website: spaceCompany.website || "",
          phone: spaceCompany.phone || "",
          address: spaceCompany.address || "",
          is_active: spaceCompany.is_active !== false,
          is_partner: spaceCompany.is_partner || false,
          selectedServices: selectedServiceIds,
          managerId: "", // We'll need to fetch this separately if needed
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
      })

      if (!updateResult.success) {
        throw new Error(updateResult.error || "Failed to update company")
      }

      // Update services
      const servicesResult = await updateCompanyServices(activeSpace, formData.selectedServices)
      if (!servicesResult.success) {
        throw new Error(servicesResult.error || "Failed to update services")
      }

      toastSuccess("Space settings updated successfully")
      // Reload data to reflect changes
      await loadData()
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
        <div className="text-muted-foreground">Loading settings...</div>
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
        <div>
          <h2 className="text-lg font-medium">Space Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage space information and configuration
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
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
        <Card>
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
        <Card>
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

        {/* Status & Options */}
        <Card>
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
              Manage API keys for programmatic access to this space
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-muted rounded-lg bg-muted/20">
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-4">
                <Lock className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-medium mb-2">Coming Soon</h3>
              <p className="text-xs text-muted-foreground text-center max-w-md">
                API key management will be available soon. You&apos;ll be able to create, manage, and revoke API keys for programmatic access to this space.
              </p>
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
    </div>
  )
}

