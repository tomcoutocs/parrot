"use client"

import * as React from "react"
import { X, User, Calendar as CalendarIcon, Flag, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent as BasePopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface BulkEditBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkUpdate: (updates: Record<string, unknown>) => void
  onBulkDelete: () => void
  users?: Array<{ id: string; full_name: string; email: string; profile_picture?: string | null }>
}

// Custom PopoverContent without overflow constraints for calendar
const CalendarPopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content> & { 'data-calendar-popover'?: string }
>(({ className, align = "center", sideOffset = 4, style, 'data-calendar-popover': dataAttr, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement>(null)
  
  React.useEffect(() => {
    // Force calendar to always display at full size
    if (contentRef.current) {
      const applyStyles = () => {
        if (contentRef.current) {
          // Remove all height constraints - let calendar be its natural size
          contentRef.current.style.setProperty('max-height', 'none', 'important')
          contentRef.current.style.setProperty('height', 'auto', 'important')
          contentRef.current.style.setProperty('overflow', 'visible', 'important')
          contentRef.current.style.setProperty('overflow-y', 'visible', 'important')
          contentRef.current.style.setProperty('overflow-x', 'visible', 'important')
          
          // Override ALL child elements (including Calendar component and react-day-picker elements)
          const allChildren = contentRef.current.querySelectorAll('*')
          allChildren.forEach((child) => {
            const htmlChild = child as HTMLElement
            htmlChild.style.setProperty('max-height', 'none', 'important')
            htmlChild.style.setProperty('height', 'auto', 'important')
            htmlChild.style.setProperty('overflow', 'visible', 'important')
            htmlChild.style.setProperty('overflow-y', 'visible', 'important')
            htmlChild.style.setProperty('overflow-x', 'visible', 'important')
          })
          
          // Specifically target Calendar component root (has data-slot="calendar")
          const calendarRoot = contentRef.current.querySelector('[data-slot="calendar"]')
          if (calendarRoot) {
            const htmlCalendar = calendarRoot as HTMLElement
            htmlCalendar.style.setProperty('max-height', 'none', 'important')
            htmlCalendar.style.setProperty('height', 'auto', 'important')
            htmlCalendar.style.setProperty('overflow', 'visible', 'important')
            htmlCalendar.style.setProperty('overflow-y', 'visible', 'important')
          }
          
          // Target react-day-picker elements
          const rdpElements = contentRef.current.querySelectorAll('.rdp, .rdp-months, .rdp-month, .rdp-table, .rdp-week, .rdp-day')
          rdpElements.forEach((el) => {
            const htmlEl = el as HTMLElement
            htmlEl.style.setProperty('max-height', 'none', 'important')
            htmlEl.style.setProperty('overflow', 'visible', 'important')
            htmlEl.style.setProperty('overflow-y', 'visible', 'important')
          })
          
          // Find and override wrapper elements
          const wrappers = document.querySelectorAll('[data-radix-popper-content-wrapper]')
          wrappers.forEach((wrapper) => {
            const htmlWrapper = wrapper as HTMLElement
            if (htmlWrapper.contains(contentRef.current)) {
              htmlWrapper.setAttribute('data-calendar-popover', 'true')
              htmlWrapper.style.setProperty('max-height', 'none', 'important')
              htmlWrapper.style.setProperty('height', 'auto', 'important')
              htmlWrapper.style.setProperty('overflow', 'visible', 'important')
              htmlWrapper.style.setProperty('overflow-y', 'visible', 'important')
              htmlWrapper.style.setProperty('--radix-popover-content-available-height', '9999px', 'important')
              
              // Also override wrapper children
              const wrapperChildren = htmlWrapper.querySelectorAll('*')
              wrapperChildren.forEach((child) => {
                const htmlChild = child as HTMLElement
                htmlChild.style.setProperty('max-height', 'none', 'important')
                htmlChild.style.setProperty('overflow', 'visible', 'important')
                htmlChild.style.setProperty('overflow-y', 'visible', 'important')
              })
            }
          })
          
          // Override any parent constraints
          let parent = contentRef.current.parentElement
          while (parent && parent !== document.body) {
            const htmlParent = parent as HTMLElement
            htmlParent.style.setProperty('max-height', 'none', 'important')
            htmlParent.style.setProperty('overflow', 'visible', 'important')
            htmlParent.style.setProperty('overflow-y', 'visible', 'important')
            parent = parent.parentElement
          }
        }
      }
      
      // Watch for style changes
      const observer = new MutationObserver(() => {
        applyStyles()
      })
      
      observer.observe(contentRef.current, {
        attributes: true,
        attributeFilter: ['style'],
        childList: true,
        subtree: true
      })
      
      // Watch for wrapper creation
      const wrapperObserver = new MutationObserver(() => {
        applyStyles()
      })
      
      wrapperObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style']
      })
      
      // Apply immediately and repeatedly to catch Radix updates
      applyStyles()
      const timeouts = [0, 50, 100, 200, 500, 1000].map(delay => setTimeout(applyStyles, delay))
      
      // Continuous override
      let rafId: number | null = null
      const startRaf = () => {
        applyStyles()
        rafId = requestAnimationFrame(startRaf)
      }
      startRaf()
      
      return () => {
        observer.disconnect()
        wrapperObserver.disconnect()
        timeouts.forEach(clearTimeout)
        if (rafId !== null) {
          cancelAnimationFrame(rafId)
        }
      }
    }
  }, [])
  
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={(node) => {
          if (typeof ref === 'function') {
            ref(node)
          } else if (ref) {
            ref.current = node
          }
          contentRef.current = node
        }}
        align={align}
        sideOffset={sideOffset}
        collisionPadding={8}
        avoidCollisions={false}
        data-calendar-popover={dataAttr || "true"}
        className={cn(
          "z-50 w-auto rounded-lg border border-border/60 bg-background/95 backdrop-blur-md p-4 text-popover-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-90 data-[state=open]:zoom-in-90 origin-center",
          className
        )}
        style={{
          maxHeight: 'none',
          height: 'auto',
          overflow: 'visible',
          overflowY: 'visible',
          overflowX: 'visible',
          ...style
        }}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
})
CalendarPopoverContent.displayName = "CalendarPopoverContent"

// Helper function to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const priorityLevels = [
  { id: "urgent", label: "Urgent", color: "text-red-600", dotColor: "bg-red-500" },
  { id: "high", label: "High", color: "text-orange-600", dotColor: "bg-orange-500" },
  { id: "normal", label: "Normal", color: "text-muted-foreground", dotColor: "bg-gray-400" },
  { id: "low", label: "Low", color: "text-blue-600", dotColor: "bg-blue-500" },
]

export function BulkEditBar({ selectedCount, onClearSelection, onBulkUpdate, onBulkDelete, users = [] }: BulkEditBarProps) {
  React.useEffect(() => {
    // Inject a style tag to override Radix UI constraints
    const styleId = 'calendar-popover-override'
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        [data-radix-popper-content-wrapper][data-calendar-popover],
        [data-radix-popper-content-wrapper]:has([data-calendar-popover]),
        [data-radix-popper-content-wrapper][data-calendar-popover] > *,
        [data-calendar-popover],
        [data-calendar-popover] *,
        [data-calendar-popover] [data-slot="calendar"],
        [data-calendar-popover] .rdp,
        [data-calendar-popover] .rdp-months,
        [data-calendar-popover] .rdp-month,
        [data-calendar-popover] .rdp-table,
        [data-calendar-popover] .rdp-week {
          max-height: none !important;
          height: auto !important;
          overflow: visible !important;
          overflow-y: visible !important;
          overflow-x: visible !important;
        }
        [data-radix-popper-content-wrapper][data-calendar-popover],
        [data-radix-popper-content-wrapper]:has([data-calendar-popover]) {
          --radix-popover-content-available-height: 9999px !important;
        }
      `
      document.head.appendChild(style)
    }
    
    // Continuous override function to ensure full size
    const continuouslyOverrideStyles = () => {
      // Override wrappers
      const wrappers = document.querySelectorAll('[data-radix-popper-content-wrapper][data-calendar-popover], [data-radix-popper-content-wrapper]:has([data-calendar-popover])')
      wrappers.forEach((wrapper: Element) => {
        const htmlWrapper = wrapper as HTMLElement
        htmlWrapper.style.setProperty('max-height', 'none', 'important')
        htmlWrapper.style.setProperty('height', 'auto', 'important')
        htmlWrapper.style.setProperty('overflow', 'visible', 'important')
        htmlWrapper.style.setProperty('overflow-y', 'visible', 'important')
        htmlWrapper.style.setProperty('--radix-popover-content-available-height', '9999px', 'important')
      })
      
      // Override popover content
      const popovers = document.querySelectorAll('[data-calendar-popover]')
      popovers.forEach((popover: Element) => {
        const htmlPopover = popover as HTMLElement
        htmlPopover.style.setProperty('max-height', 'none', 'important')
        htmlPopover.style.setProperty('height', 'auto', 'important')
        htmlPopover.style.setProperty('overflow', 'visible', 'important')
        htmlPopover.style.setProperty('overflow-y', 'visible', 'important')
        htmlPopover.style.setProperty('overflow-x', 'visible', 'important')
      })
    }
    
    // Run continuously to catch any Radix updates
    let rafId: number | null = null
    const startContinuousOverride = () => {
      continuouslyOverrideStyles()
      rafId = requestAnimationFrame(startContinuousOverride)
    }
    startContinuousOverride()
    
    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      const style = document.getElementById(styleId)
      if (style) {
        document.head.removeChild(style)
      }
    }
  }, [])

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      // react-day-picker creates dates, and we need to store the date that matches
      // what the user sees on the calendar
      // 
      // Strategy: Use the date's local date string representation
      // This ensures we store the date that matches what the calendar displays
      // 
      // Format the date as YYYY-MM-DD using local date components
      // This matches how transformTaskToDesignTask parses dates: new Date(year, month, day)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0') // 1-12
      const day = String(date.getDate()).padStart(2, '0')
      
      // Format as YYYY-MM-DD for database storage
      const dbDate = `${year}-${month}-${day}`
      
      // Debug logging to verify what's being saved
      console.log('Date selected:', {
        originalDate: date.toISOString(),
        utcYear: date.getUTCFullYear(),
        utcMonth: date.getUTCMonth() + 1,
        utcDay: date.getUTCDate(),
        localYear: year,
        localMonth: month,
        localDay: day,
        dbDate
      })
      
      onBulkUpdate({ dueDate: dbDate })
    }
  }
  
  const handleTodayClick = () => {
    // Get today's date in local timezone
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const dbDate = `${year}-${month}-${day}`
    onBulkUpdate({ dueDate: dbDate })
  }

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border rounded-xl px-4 py-2.5 flex items-center gap-3"
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        background: 'rgba(60, 57, 57, 0.72)',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
      }}
    >
      {/* Selection Count with Close Button */}
      <div className="flex items-center gap-2 pr-3 border-r border-black/10">
        <button
          onClick={onClearSelection}
          className="p-0.5 hover:bg-muted/50 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-sm text-muted-foreground">
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-1">
        {/* Assign */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors">
              <User className="w-4 h-4" />
              <span>Assign</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onBulkUpdate({ assignee: "" })}>
              <span className="text-muted-foreground">Unassigned</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => onBulkUpdate({ assignee: user.id })}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={user.profile_picture || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  <span>{user.full_name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Due Date */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors">
              <CalendarIcon className="w-4 h-4" />
              <span>Due Date</span>
            </button>
          </PopoverTrigger>
          <CalendarPopoverContent 
            className="w-auto p-0 z-[60]" 
            align="start" 
            side="top" 
            sideOffset={120}
            collisionPadding={200}
            data-calendar-popover="true"
            style={{
              maxHeight: 'none',
              height: 'auto',
              overflow: 'visible',
              overflowY: 'visible',
              overflowX: 'visible',
            }}
          >
            <Calendar
              mode="single"
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="border-t p-2 flex gap-2">
              <button
                onClick={() => onBulkUpdate({ dueDate: "" })}
                className="flex-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                Clear
              </button>
              <button
                onClick={handleTodayClick}
                className="flex-1 text-sm text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                Today
              </button>
            </div>
          </CalendarPopoverContent>
        </Popover>

        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors">
              <Flag className="w-4 h-4" />
              <span>Priority</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {priorityLevels.map((priority) => (
              <DropdownMenuItem
                key={priority.id}
                onClick={() => onBulkUpdate({ priority: priority.label })}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${priority.dotColor}`} />
                  <span className={priority.color}>{priority.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete */}
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors ml-1"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )
}

