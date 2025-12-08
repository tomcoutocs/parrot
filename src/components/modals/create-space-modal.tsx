"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { createCompany, updateCompanyServices, assignCompanyToInternalUser, updateUser, createDefaultOnboardingProject, createDefaultOnboardingDocument, fetchForms, assignFormToSpace } from "@/lib/database-functions"
import { useSession } from "@/components/providers/session-provider"
import { fetchServicesOptimized } from "@/lib/simplified-database-functions"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { Service, User } from "@/lib/supabase"
import { toastSuccess, toastError } from "@/lib/toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreateSpaceModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}


export function CreateSpaceModal({ isOpen, onClose, onSuccess }: CreateSpaceModalProps) {
  const { data: session } = useSession()
  const [spaceName, setSpaceName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [accountManager, setAccountManager] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>()
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([])
  const [allUsers, setAllUsers] = useState<User[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadData()
    } else {
      // Reset form when modal closes
      setSpaceName("")
      setCompanyName("")
      setDescription("")
      setAccountManager("")
      setStartDate(undefined)
      setSelectedServices([])
      setSelectedUserIds([])
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [servicesData, usersData] = await Promise.all([
        fetchServicesOptimized(),
        fetchUsersOptimized()
      ])
      
      setServices(servicesData)
      setAllUsers(usersData)
      
      // Filter to managers and admins for account manager dropdown
      const managerUsers = usersData
        .filter(user => user.role === "manager" || user.role === "admin")
        .map(user => ({
          id: user.id,
          name: user.full_name || user.email || "Unknown"
        }))
      setManagers(managerUsers)
    } catch (error) {
      console.error("Error loading data:", error)
      toastError("Failed to load form data")
    }
  }

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!spaceName.trim() || !companyName.trim()) {
      toastError("Please fill in Space Name and Company Name")
      return
    }

    setIsSubmitting(true)

    try {
      // Create the company
      const result = await createCompany({
        name: companyName,
        description: description || undefined,
      })

      if (!result.success || !result.data) {
        toastError(result.error || "Failed to create company")
        setIsSubmitting(false)
        return
      }

      const companyId = result.data.id

      // Create default onboarding project with tasks
      if (session?.user?.id) {
        try {
          const onboardingResult = await createDefaultOnboardingProject(companyId, session.user.id)
          if (!onboardingResult.success) {
            console.error("Failed to create default onboarding project:", onboardingResult.error)
            // Don't fail the whole operation, just log the error
          }
        } catch (onboardingError) {
          console.error('Error creating default onboarding project:', onboardingError)
          // Don't fail the whole operation, just log the error
        }
      }

      // Create default onboarding document in external documents folder
      if (session?.user?.id) {
        try {
          const docResult = await createDefaultOnboardingDocument(companyId, session.user.id)
          if (!docResult.success) {
            console.error("Failed to create default onboarding document:", docResult.error)
            // Don't fail the whole operation, just log the error
          }
        } catch (docError) {
          console.error('Error creating default onboarding document:', docError)
          // Don't fail the whole operation, just log the error
        }
      }

      // Assign Support Ticket form to the new space (default form)
      try {
        const allForms = await fetchForms()
        const supportTicketForm = allForms.find(form => 
          form.title.toLowerCase() === 'support ticket' || 
          form.title.toLowerCase().includes('support ticket')
        )
        
        if (supportTicketForm) {
          const formAssignmentResult = await assignFormToSpace(supportTicketForm.id, companyId)
          if (!formAssignmentResult.success) {
            console.error("Failed to assign Support Ticket form to space:", formAssignmentResult.error)
            // Don't fail the whole operation, just log the error
          }
        } else {
          console.warn("Support Ticket form not found. Skipping form assignment.")
        }
      } catch (formError) {
        console.error('Error assigning Support Ticket form to space:', formError)
        // Don't fail the whole operation, just log the error
      }

      // Update company services if any are selected
      if (selectedServices.length > 0) {
        const servicesResult = await updateCompanyServices(companyId, selectedServices)
        if (!servicesResult.success) {
          console.error("Failed to update services:", servicesResult.error)
          // Don't fail the whole operation, just log the error
        }
      }

      // Assign selected users to the company
      if (selectedUserIds.length > 0) {
        try {
          for (const userId of selectedUserIds) {
            const user = allUsers.find(u => u.id === userId)
            if (!user) continue

            if (user.role === 'internal') {
              // For internal users, add to internal_user_companies table
              await assignCompanyToInternalUser(userId, companyId, false)
            } else {
              // For regular users/managers, update company_id using updateUser
              // We need to preserve all existing user data
              await updateUser(userId, {
                email: user.email,
                full_name: user.full_name || '',
                role: user.role as 'admin' | 'manager' | 'user' | 'internal',
                is_active: user.is_active !== false,
                company_id: companyId,
                assigned_manager_id: user.assigned_manager_id || undefined,
                tab_permissions: user.tab_permissions || []
              })
            }
          }
        } catch (userAssignmentError) {
          console.error('Error assigning users to company:', userAssignmentError)
          // Don't fail the whole operation, just log the error
        }
      }

      toastSuccess("Client space created successfully!")
      onSuccess?.()
      onClose()
    } catch (error) {
      console.error("Error creating space:", error)
      toastError("Failed to create client space")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Client Space</DialogTitle>
          <DialogDescription className="mt-1">
            Set up a new client workspace with services, team, and settings
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Space Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Space Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="spaceName">Space Name</Label>
              <Input
                id="spaceName"
                placeholder="e.g., ACME Brand, TechStart"
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                This is how the space will appear in the sidebar
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                placeholder="Full company name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the client or project..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Management & Timeline */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Management & Timeline</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountManager">Account Manager</Label>
                <Select value={accountManager} onValueChange={setAccountManager}>
                  <SelectTrigger id="accountManager">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      id="startDate"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "MM/dd/yyyy") : "mm/dd/yyyy"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-auto p-0 z-[100]" 
                    align="start"
                    style={{ pointerEvents: 'auto' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Services</h3>
            <p className="text-sm text-muted-foreground">
              Select all services that apply to this client
            </p>
            
            <div className="grid grid-cols-2 gap-3">
              {services.map((service) => (
                <div key={service.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`service-${service.id}`}
                    checked={selectedServices.includes(service.id)}
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
            </div>
          </div>

          {/* Add Existing Users */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Add Existing Users (Optional)</h3>
            <p className="text-sm text-muted-foreground">
              Select existing users to add to this space. You can add more users later in the Users section.
            </p>
            
            {/* Managers */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Managers</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-border/60 rounded-md p-2">
                {allUsers.filter(user => user.role === 'manager').length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No managers available</p>
                ) : (
                  allUsers
                    .filter(user => user.role === 'manager')
                    .map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds([...selectedUserIds, user.id])
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                            }
                          }}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {user.full_name || user.email || "Unknown"}
                        </Label>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Internal Users */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Internal Users</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-border/60 rounded-md p-2">
                {allUsers.filter(user => user.role === 'internal').length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No internal users available</p>
                ) : (
                  allUsers
                    .filter(user => user.role === 'internal')
                    .map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds([...selectedUserIds, user.id])
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                            }
                          }}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {user.full_name || user.email || "Unknown"}
                        </Label>
                      </div>
                    ))
                )}
              </div>
            </div>

            {/* Regular Users */}
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Users</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border border-border/60 rounded-md p-2">
                {allUsers.filter(user => user.role === 'user').length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2">No users available</p>
                ) : (
                  allUsers
                    .filter(user => user.role === 'user')
                    .map(user => (
                      <div key={user.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`user-${user.id}`}
                          checked={selectedUserIds.includes(user.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUserIds([...selectedUserIds, user.id])
                            } else {
                              setSelectedUserIds(selectedUserIds.filter(id => id !== user.id))
                            }
                          }}
                        />
                        <Label
                          htmlFor={`user-${user.id}`}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {user.full_name || user.email || "Unknown"}
                        </Label>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Space"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

