"use client"

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit, Trash2, MoreVertical } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useSession } from "@/components/providers/session-provider"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatDateForDatabase, formatDateForInput } from "@/lib/date-utils"
import { toastError, toastSuccess } from "@/lib/toast"

interface BrandEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  type: "launch" | "sale" | "event" | "deadline"
  color: string
}

interface ModernCalendarTabProps {
  activeSpace?: string | null
}

// Map event types to colors
const eventTypeColors: Record<string, string> = {
  launch: "#8b5cf6",
  sale: "#ef4444",
  event: "#3b82f6",
  deadline: "#f59e0b",
  default: "#10b981"
}

// Infer event type from title (simple heuristic)
function inferEventType(title: string): "launch" | "sale" | "event" | "deadline" {
  const lower = title.toLowerCase()
  if (lower.includes("launch")) return "launch"
  if (lower.includes("sale") || lower.includes("black friday") || lower.includes("promotion")) return "sale"
  if (lower.includes("deadline") || lower.includes("due")) return "deadline"
  return "event"
}

export function ModernCalendarTab({ activeSpace }: ModernCalendarTabProps) {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<BrandEvent | null>(null)
  const [events, setEvents] = useState<BrandEvent[]>([])
  const [loading, setLoading] = useState(true)
  
  // Event creation form state
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [eventType, setEventType] = useState<"launch" | "sale" | "event" | "deadline">("event")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadEvents = async () => {
    if (!activeSpace && !session?.user?.company_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const companyId = activeSpace || session?.user?.company_id
      if (!companyId || !supabase) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('company_events')
        .select('*')
        .eq('company_id', companyId)
        .order('start_date', { ascending: true })

      if (error) {
        console.error("Error loading events:", error)
        setLoading(false)
        return
      }

      // Transform database events to BrandEvent format
      const transformedEvents: BrandEvent[] = (data || []).map((event) => {
        // Try to get event type from event_type field, or infer from title
        const eventTypeValue = (event as any).event_type || inferEventType(event.title || "")
        
        // Parse dates correctly to avoid timezone shifts
        // Handle both date-only strings (YYYY-MM-DD) and full ISO strings
        const parseDate = (dateStr: string) => {
          if (!dateStr) return new Date()
          // If it's just a date string (YYYY-MM-DD), add noon UTC to avoid timezone shifts
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return new Date(dateStr + 'T12:00:00Z')
          }
          // If it's already a full ISO string, parse it and adjust to noon UTC
          const date = new Date(dateStr)
          const year = date.getUTCFullYear()
          const month = date.getUTCMonth()
          const day = date.getUTCDate()
          return new Date(Date.UTC(year, month, day, 12, 0, 0))
        }
        
        const startDate = parseDate(event.start_date)
        const endDate = event.end_date ? parseDate(event.end_date) : startDate
        
        return {
          id: event.id,
          title: event.title || "Untitled Event",
          startDate: startDate,
          endDate: endDate,
          type: eventTypeValue,
          color: eventTypeColors[eventTypeValue] || eventTypeColors.default
        }
      })

      setEvents(transformedEvents)
    } catch (error) {
      console.error("Error loading calendar events:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [activeSpace, session?.user?.company_id])

  const createEvent = async () => {
    if (!eventTitle.trim() || !eventDate) {
      toastError('Please fill in event title and date')
      return
    }

    if (includeTime && (!eventStartTime || !eventEndTime)) {
      toastError('Please fill in start and end times')
      return
    }

    const companyId = activeSpace || session?.user?.company_id
    if (!companyId) {
      toastError('Please select a space first')
      return
    }

    try {
      setCreating(true)
      
      // Prepare the event data
      // Format dates properly to avoid timezone issues
      const formattedStartDate = formatDateForDatabase(eventDate)
      const formattedEndDate = formatDateForDatabase(eventDate)
      
      const eventData: {
        title: string
        description: string
        start_date: string
        end_date: string
        created_by: string | undefined
        company_id: string
        start_time?: string
        end_time?: string
        event_type?: string
      } = {
        title: eventTitle,
        description: eventDescription,
        start_date: formattedStartDate,
        end_date: formattedEndDate, // For now, same day events
        created_by: session?.user?.id,
        company_id: companyId,
        event_type: eventType
      }

      // Only include time fields if time is enabled
      if (includeTime) {
        eventData.start_time = eventStartTime
        eventData.end_time = eventEndTime
      } else {
        // For all-day events, set default times (00:00:00)
        eventData.start_time = '00:00:00'
        eventData.end_time = '23:59:59'
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // Log the data being sent for debugging
      console.log('Creating event with data:', {
        eventData,
        companyId,
        userId: session?.user?.id,
        userRole: session?.user?.role
      })

      const { data, error } = await supabase
        .from('company_events')
        .insert(eventData)
        .select()
        .single()

      if (error) {
        console.error('Supabase insert error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        })
        throw error
      }

      // Reset form
      resetForm()
      setIsCreateEventOpen(false)

      // Reload events
      await loadEvents()
      toastSuccess('Event created successfully!')
    } catch (err) {
      console.error('Error creating event:', err)
      
      // Extract meaningful error message
      let errorMessage = 'Failed to create event'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        // Handle Supabase error objects
        const supabaseError = err as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        } else if (supabaseError.details) {
          errorMessage = supabaseError.details
        } else if (supabaseError.hint) {
          errorMessage = supabaseError.hint
        } else {
          // Try to stringify the error object
          try {
            const errorStr = JSON.stringify(supabaseError, null, 2)
            if (errorStr !== '{}') {
              errorMessage = `Error: ${errorStr}`
            }
          } catch {
            // If stringification fails, use default message
          }
        }
      } else if (typeof err === 'string') {
        errorMessage = err
      }
      
      console.error('Error details:', {
        message: errorMessage,
        error: err,
        errorType: typeof err,
        errorString: JSON.stringify(err, null, 2)
      })
      
      toastError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setEventTitle('')
    setEventDescription('')
    setEventDate('')
    setEventStartTime('')
    setEventEndTime('')
    setIncludeTime(false)
    setEventType('event')
    setEditingEvent(null)
  }

  const handleEditEvent = (event: BrandEvent) => {
    // Find the full event data from database
    const fullEvent = events.find(e => e.id === event.id)
    if (!fullEvent) return

    setEditingEvent(fullEvent)
    setEventTitle(fullEvent.title)
    setEventDescription('') // We don't store description in BrandEvent, but could load it
    // Format date correctly for input to avoid timezone issues
    setEventDate(formatDateForInput(fullEvent.startDate.toISOString()))
    setEventType(fullEvent.type)
    setIncludeTime(false) // Could check if times exist
    setEventStartTime('')
    setEventEndTime('')
    setIsEditEventOpen(true)
  }

  const updateEvent = async () => {
    if (!eventTitle.trim() || !eventDate || !editingEvent) {
      toastError('Please fill in event title and date')
      return
    }

    const companyId = activeSpace || session?.user?.company_id
    if (!companyId) {
      toastError('Please select a space first')
      return
    }

    try {
      setCreating(true)
      
      // Format dates properly to avoid timezone issues
      const formattedStartDate = formatDateForDatabase(eventDate)
      const formattedEndDate = formatDateForDatabase(eventDate)
      
      const eventData: {
        title: string
        description: string
        start_date: string
        end_date: string
        start_time?: string
        end_time?: string
        event_type?: string
      } = {
        title: eventTitle,
        description: eventDescription,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        event_type: eventType
      }

      if (includeTime) {
        eventData.start_time = eventStartTime
        eventData.end_time = eventEndTime
      } else {
        eventData.start_time = '00:00:00'
        eventData.end_time = '23:59:59'
      }

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { error } = await supabase
        .from('company_events')
        .update(eventData)
        .eq('id', editingEvent.id)

      if (error) {
        console.error('Supabase update error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: JSON.stringify(error, null, 2)
        })
        throw error
      }

      resetForm()
      setIsEditEventOpen(false)

      await loadEvents()
      toastSuccess('Event updated successfully!')
    } catch (err) {
      console.error('Error updating event:', err)
      let errorMessage = 'Failed to update event'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        const supabaseError = err as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        }
      }
      toastError(errorMessage)
    } finally {
      setCreating(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return
    }

    try {
      setDeleting(true)

      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { error } = await supabase
        .from('company_events')
        .delete()
        .eq('id', eventId)

      if (error) {
        console.error('Supabase delete error:', error)
        throw error
      }

      await loadEvents()
      toastSuccess('Event deleted successfully!')
    } catch (err) {
      console.error('Error deleting event:', err)
      let errorMessage = 'Failed to delete event'
      if (err instanceof Error) {
        errorMessage = err.message
      } else if (err && typeof err === 'object') {
        const supabaseError = err as any
        if (supabaseError.message) {
          errorMessage = supabaseError.message
        }
      }
      toastError(errorMessage)
    } finally {
      setDeleting(false)
    }
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const getEventsForDay = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const date = new Date(year, month, day)
    
    // Normalize date to midnight for comparison
    date.setHours(0, 0, 0, 0)
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      
      // Normalize event dates to midnight for comparison
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(0, 0, 0, 0)
      
      // Check if the date falls within the event's date range
      return date >= eventStart && date <= eventEnd
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const days = getDaysInMonth(currentDate)
  const isToday = (day: number | null) => {
    if (day === null) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const upcomingEvents = events
    .filter(event => event.startDate >= new Date())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateEventOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Event
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="col-span-2">
          <div className="border border-border/60 rounded-lg overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-muted/20 border-b border-border/40">
              {daysOfWeek.map(day => (
                <div key={day} className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : []
                return (
                  <div
                    key={index}
                    className={`min-h-28 p-2 border-r border-b border-border/40 last:border-r-0 ${
                      index >= days.length - 7 ? "border-b-0" : ""
                    } ${day === null ? "bg-muted/10" : "bg-background hover:bg-muted/20"} transition-colors`}
                  >
                    {day !== null && (
                      <div className="h-full flex flex-col">
                        <div className={`text-sm mb-1 ${
                          isToday(day) 
                            ? "w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center" 
                            : "text-foreground"
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1 flex-1 overflow-y-auto">
                          {dayEvents.slice(0, 5).map(event => {
                            // Truncate long event names for display (like "Holiday Po...")
                            const displayTitle = event.title.length > 20 
                              ? event.title.substring(0, 17) + '...' 
                              : event.title
                            
                            // Convert hex color to rgba with transparency
                            const hexToRgba = (hex: string, alpha: number) => {
                              const r = parseInt(hex.slice(1, 3), 16)
                              const g = parseInt(hex.slice(3, 5), 16)
                              const b = parseInt(hex.slice(5, 7), 16)
                              return `rgba(${r}, ${g}, ${b}, ${alpha})`
                            }
                            
                            return (
                              <DropdownMenu key={event.id}>
                                <DropdownMenuTrigger asChild>
                                  <div
                                    className="w-full text-xs px-2 py-1 rounded-md font-medium cursor-pointer hover:opacity-90 transition-opacity overflow-hidden text-ellipsis whitespace-nowrap relative group"
                                    style={{
                                      backgroundColor: hexToRgba(event.color, 0.2),
                                      color: event.color,
                                      borderLeft: `3px solid ${event.color}`,
                                    }}
                                    title={event.title}
                                  >
                                    {displayTitle}
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-48">
                                  <DropdownMenuItem onClick={() => handleEditEvent(event)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Event
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => deleteEvent(event.id)}
                                    className="text-red-500"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Event
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )
                          })}
                          {dayEvents.length > 5 && (
                            <div className="text-xs text-muted-foreground px-1 font-medium">
                              +{dayEvents.length - 5} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="col-span-1">
          <div className="border border-border/60 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4">
                No upcoming events
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="group">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-full rounded-full mt-1"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.startDate.toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                          {event.startDate.getTime() !== event.endDate.getTime() && (
                            <> - {event.endDate.toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric" 
                            })}</>
                          )}
                        </p>
                        <div className="mt-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${event.color}15`,
                              color: event.color
                            }}
                          >
                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Legend */}
          <div className="border border-border/60 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Event Types</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
                <span className="text-xs text-muted-foreground">Launch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span className="text-xs text-muted-foreground">Sale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                <span className="text-xs text-muted-foreground">Event</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                <span className="text-xs text-muted-foreground">Deadline</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Creation Dialog */}
      <Dialog open={isCreateEventOpen} onOpenChange={setIsCreateEventOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Event</DialogTitle>
            <DialogDescription>
              Create a new event for your calendar. Time is optional - uncheck &quot;Include specific time&quot; for all-day events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="event-title">Event Title *</Label>
              <Input
                id="event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Enter event description (optional)"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="event-date">Date *</Label>
              <Input
                id="event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-type">Event Type *</Label>
              <Select value={eventType} onValueChange={(value: "launch" | "sale" | "event" | "deadline") => setEventType(value)}>
                <SelectTrigger id="event-type">
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: eventTypeColors[eventType] || eventTypeColors.default }} />
                    <SelectValue placeholder="Select event type">
                      {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                      <span>Event</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="launch">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
                      <span>Launch</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sale">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                      <span>Sale</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="deadline">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                      <span>Deadline</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="include-time"
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="include-time">Include specific time</Label>
            </div>
            {includeTime && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="event-start-time">Start Time *</Label>
                  <Input
                    id="event-start-time"
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="event-end-time">End Time *</Label>
                  <Input
                    id="event-end-time"
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateEventOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={createEvent} 
              disabled={creating || !eventTitle || !eventDate || (includeTime && (!eventStartTime || !eventEndTime))}
            >
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Event Edit Dialog */}
      <Dialog open={isEditEventOpen} onOpenChange={(open) => {
        setIsEditEventOpen(open)
        if (!open) {
          resetForm()
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update event details. Time is optional - uncheck &quot;Include specific time&quot; for all-day events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-event-title">Event Title *</Label>
              <Input
                id="edit-event-title"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                placeholder="Enter event title"
              />
            </div>
            <div>
              <Label htmlFor="edit-event-description">Description</Label>
              <Textarea
                id="edit-event-description"
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                placeholder="Enter event description (optional)"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="edit-event-date">Date *</Label>
              <Input
                id="edit-event-date"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-event-type">Event Type *</Label>
              <Select value={eventType} onValueChange={(value: "launch" | "sale" | "event" | "deadline") => setEventType(value)}>
                <SelectTrigger id="edit-event-type">
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: eventTypeColors[eventType] || eventTypeColors.default }} />
                    <SelectValue placeholder="Select event type">
                      {eventType.charAt(0).toUpperCase() + eventType.slice(1)}
                    </SelectValue>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                      <span>Event</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="launch">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
                      <span>Launch</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sale">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                      <span>Sale</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="deadline">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                      <span>Deadline</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="edit-include-time"
                type="checkbox"
                checked={includeTime}
                onChange={(e) => setIncludeTime(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="edit-include-time">Include specific time</Label>
            </div>
            {includeTime && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-event-start-time">Start Time *</Label>
                  <Input
                    id="edit-event-start-time"
                    type="time"
                    value={eventStartTime}
                    onChange={(e) => setEventStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-event-end-time">End Time *</Label>
                  <Input
                    id="edit-event-end-time"
                    type="time"
                    value={eventEndTime}
                    onChange={(e) => setEventEndTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditEventOpen(false)
              resetForm()
            }}>
              Cancel
            </Button>
            <Button 
              onClick={updateEvent} 
              disabled={creating || !eventTitle || !eventDate || (includeTime && (!eventStartTime || !eventEndTime))}
            >
              {creating ? 'Updating...' : 'Update Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
