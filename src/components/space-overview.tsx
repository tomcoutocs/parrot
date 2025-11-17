"use client"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { User } from "@/lib/supabase"
import { updateCompany } from "@/lib/database-functions"
import { toastSuccess, toastError } from "@/lib/toast"
import { Loader2, ChevronDown } from "lucide-react"

interface SpaceOverviewProps {
  manager?: {
    id?: string
    name: string
    avatar?: string
  }
  startDate?: string
  services?: string[]
  companyId?: string
  onManagerChange?: () => void
}

export function SpaceOverview({ 
  manager, 
  startDate, 
  services = [],
  companyId,
  onManagerChange
}: SpaceOverviewProps) {
  const [managers, setManagers] = useState<User[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [updating, setUpdating] = useState(false)
  const [selectedManagerId, setSelectedManagerId] = useState<string>(manager?.id || "")

  const currentManager = manager || {
    name: "No Manager",
    avatar: undefined
  }

  // Fetch managers and admins for the dropdown
  useEffect(() => {
    const loadManagers = async () => {
      if (!companyId) return
      
      setLoadingManagers(true)
      try {
        const allUsers = await fetchUsersOptimized()
        // Filter to only admins and managers
        const managersAndAdmins = allUsers.filter(
          user => (user.role === 'admin' || user.role === 'manager') && user.is_active !== false
        )
        setManagers(managersAndAdmins)
      } catch (error) {
        console.error("Error loading managers:", error)
      } finally {
        setLoadingManagers(false)
      }
    }

    loadManagers()
  }, [companyId])

  // Update selected manager when prop changes
  useEffect(() => {
    setSelectedManagerId(manager?.id || "")
  }, [manager?.id])

  const handleManagerChange = async (newManagerId: string) => {
    if (!companyId) return

    setUpdating(true)
    try {
      // Get current company data first
      const { supabase } = await import("@/lib/supabase")
      if (!supabase) {
        toastError("Database not configured")
        return
      }

      const { data: currentCompany, error: fetchError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .single()

      if (fetchError || !currentCompany) {
        toastError("Failed to fetch company data")
        return
      }

      // Update company with new manager_id (null if "none" is selected)
      const updateResult = await updateCompany(companyId, {
        name: currentCompany.name,
        description: currentCompany.description || undefined,
        industry: currentCompany.industry || undefined,
        website: currentCompany.website || undefined,
        phone: currentCompany.phone || undefined,
        address: currentCompany.address || undefined,
        is_active: currentCompany.is_active !== false,
        is_partner: currentCompany.is_partner || false,
        retainer: currentCompany.retainer || undefined,
        revenue: currentCompany.revenue || undefined,
        manager_id: newManagerId === "none" ? null : (newManagerId || undefined)
      })

      if (updateResult.success) {
        setSelectedManagerId(newManagerId === "none" ? "" : newManagerId)
        toastSuccess("Manager updated successfully")
        onManagerChange?.()
      } else {
        toastError(updateResult.error || "Failed to update manager")
      }
    } catch (error) {
      console.error("Error updating manager:", error)
      toastError("An error occurred while updating the manager")
    } finally {
      setUpdating(false)
    }
  }

  const selectedManager = managers.find(m => m.id === selectedManagerId) || 
    (selectedManagerId && manager ? { id: manager.id, full_name: manager.name } : null)

  return (
    <div className="border-b border-border/50 pb-3">
      <div className="flex items-center justify-between gap-8">
        {/* Account Manager */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-xs text-muted-foreground flex-shrink-0">Manager</div>
          {companyId ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updating || loadingManagers}
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-sm">Updating...</span>
                    </>
                  ) : selectedManager ? (
                    <>
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="bg-muted text-xs">
                          {selectedManager.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm truncate">{selectedManager.full_name || "Unknown"}</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <Avatar className="w-6 h-6 flex-shrink-0">
                        <AvatarFallback className="bg-muted text-xs">?</AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-muted-foreground">No Manager</span>
                      <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => handleManagerChange("none")}>
                  <div className="flex items-center gap-2 w-full">
                    <Avatar className="w-5 h-5 flex-shrink-0">
                      <AvatarFallback className="bg-muted text-xs">?</AvatarFallback>
                    </Avatar>
                    <span>No Manager</span>
                  </div>
                </DropdownMenuItem>
                {managers.map((mgr) => (
                  <DropdownMenuItem 
                    key={mgr.id} 
                    onClick={() => handleManagerChange(mgr.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Avatar className="w-5 h-5 flex-shrink-0">
                        <AvatarFallback className="bg-muted text-xs">
                          {mgr.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 truncate">{mgr.full_name || mgr.email}</span>
                      <span className="text-xs text-muted-foreground">({mgr.role})</span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Avatar className="w-6 h-6 flex-shrink-0">
                <AvatarImage src={currentManager.avatar} />
                <AvatarFallback className="bg-muted text-xs">
                  {currentManager.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm truncate">{currentManager.name}</span>
            </div>
          )}
        </div>

        {/* Start Date */}
        {startDate && (
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="text-xs text-muted-foreground">Started</div>
            <span className="text-sm">{startDate}</span>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-xs text-muted-foreground flex-shrink-0">Services</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {services.map((service) => (
                <span
                  key={service}
                  className="text-xs px-3 py-1 bg-muted rounded-md text-foreground font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

