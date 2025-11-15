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
import { createCompany, updateCompanyServices } from "@/lib/database-functions"
import { fetchServicesOptimized } from "@/lib/simplified-database-functions"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { Service } from "@/lib/supabase"
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

const SPACE_COLORS = [
  { name: "Purple", value: "#a855f7", class: "bg-purple-500" },
  { name: "Blue", value: "#3b82f6", class: "bg-blue-500" },
  { name: "Green", value: "#10b981", class: "bg-green-500" },
  { name: "Orange", value: "#f97316", class: "bg-orange-500" },
  { name: "Pink", value: "#ec4899", class: "bg-pink-500" },
  { name: "Teal", value: "#14b8a6", class: "bg-teal-500" },
  { name: "Red", value: "#ef4444", class: "bg-red-500" },
  { name: "Dark Blue", value: "#1e40af", class: "bg-blue-700" },
  { name: "Purple Dark", value: "#7c3aed", class: "bg-purple-700" },
]

export function CreateSpaceModal({ isOpen, onClose, onSuccess }: CreateSpaceModalProps) {
  const [spaceName, setSpaceName] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [description, setDescription] = useState("")
  const [accountManager, setAccountManager] = useState<string>("")
  const [startDate, setStartDate] = useState<Date>()
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [contactName, setContactName] = useState("")
  const [contactEmail, setContactEmail] = useState("")
  const [selectedColor, setSelectedColor] = useState(SPACE_COLORS[0].value)
  const [services, setServices] = useState<Service[]>([])
  const [managers, setManagers] = useState<Array<{ id: string; name: string }>>([])
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
      setContactName("")
      setContactEmail("")
      setSelectedColor(SPACE_COLORS[0].value)
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [servicesData, usersData] = await Promise.all([
        fetchServicesOptimized(),
        fetchUsersOptimized()
      ])
      
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

      // Update company services if any are selected
      if (selectedServices.length > 0) {
        const servicesResult = await updateCompanyServices(companyId, selectedServices)
        if (!servicesResult.success) {
          console.error("Failed to update services:", servicesResult.error)
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
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl font-bold">Create New Client Space</DialogTitle>
              <DialogDescription className="mt-1">
                Set up a new client workspace with services, team, and settings
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
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

          {/* Primary Contact */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Primary Contact (Optional)</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  placeholder="Full name"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="email@company.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              You can add more users later in the Users section
            </p>
          </div>

          {/* Space Color */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Space Color</h3>
            <p className="text-sm text-muted-foreground">
              Choose a color to help identify this space
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              {SPACE_COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    "w-10 h-10 rounded-full border-2 transition-all",
                    color.class,
                    selectedColor === color.value
                      ? "border-foreground scale-110"
                      : "border-transparent hover:border-muted-foreground/50"
                  )}
                  aria-label={color.name}
                />
              ))}
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

