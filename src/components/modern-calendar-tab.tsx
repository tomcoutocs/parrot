"use client"

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Edit, Trash2, MoreVertical, Grid3x3, CalendarDays, Calendar } from "lucide-react"
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
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"

interface BrandEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  type: "launch" | "sale" | "event" | "deadline"
  color: string
  companyId?: string
  companyName?: string
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

type CalendarView = 'month' | 'week' | 'day'

export function ModernCalendarTab({ activeSpace }: ModernCalendarTabProps) {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<CalendarView>('month')
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [isEditEventOpen, setIsEditEventOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<BrandEvent | null>(null)
  const [events, setEvents] = useState<BrandEvent[]>([])
  const [loading, setLoading] = useState(true)
  // Track if space_id column exists (cache to avoid repeated failed queries)
  // null = unknown, true = exists, false = doesn't exist
  const [spaceIdColumnExists, setSpaceIdColumnExists] = useState<boolean | null>(null)
  
  // Event creation form state
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [eventType, setEventType] = useState<"launch" | "sale" | "event" | "deadline">("event")
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadEvents = async () => {
    const isAdmin = session?.user?.role === 'admin'
    // Admins can load events without a company/space
    if (!isAdmin && !activeSpace && !session?.user?.company_id) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const companyId = activeSpace || session?.user?.company_id
      if (!supabase) {
        setLoading(false)
        return
      }

      // Fetch spaces for admin view to show space names with events
      // Note: fetchCompaniesOptimized returns spaces (table renamed but function name kept for compatibility)
      let spacesMap = new Map<string, string>()
      if (isAdmin && !companyId) {
        try {
          const spaces = await fetchCompaniesOptimized()
          spaces.forEach(space => {
            spacesMap.set(space.id, space.name || 'Unknown Space')
          })
        } catch (error) {
          console.error("Error fetching spaces:", error)
        }
      }

      // Build query - admins without space_id can see all events
      // Don't use join to avoid foreign key issues - we'll map space names separately
      let query = supabase
        .from('company_events')
        .select('*')
      
      // Only filter by space_id/company_id if we have one (non-admin or admin with company)
      // Try space_id first (after migration), fallback to company_id
      let { data, error } = await (async () => {
        if (companyId) {
          // If we know space_id doesn't exist, skip directly to company_id
          if (spaceIdColumnExists === false) {
            console.log('Using company_id (space_id column known not to exist)')
            return await supabase
              .from('company_events')
              .select('*')
              .eq('company_id', companyId)
              .order('start_date', { ascending: true })
          }
          
          try {
            // Try space_id first (after migration) - only if we haven't confirmed it doesn't exist
            if (spaceIdColumnExists === null || spaceIdColumnExists === true) {
              let query = supabase
                .from('company_events')
                .select('*')
                .eq('space_id', companyId)
                .order('start_date', { ascending: true })
              
              let result = await query
              
              // If space_id column doesn't exist (migration not run), try company_id
              // Check for various error conditions that indicate column doesn't exist
              if (result.error) {
                const errorCode = (result.error as any).code
                const errorMessage = result.error.message || ''
                const statusCode = (result.error as any).status || (result.error as any).statusCode
                
                // Check for column not found errors (400 Bad Request often means column doesn't exist)
                const isColumnError = errorCode === '42703' || // PostgreSQL: undefined_column
                                     errorCode === 'PGRST116' || // PostgREST: column not found
                                     statusCode === 400 || // HTTP 400 Bad Request
                                     errorMessage.includes('does not exist') ||
                                     errorMessage.includes('column') ||
                                     errorMessage.includes('400') ||
                                     errorCode === '400'
                
                if (isColumnError) {
                  console.log('space_id column not found, trying company_id fallback', {
                    errorCode,
                    statusCode,
                    errorMessage
                  })
                  // Cache that space_id doesn't exist to avoid repeated failed queries
                  setSpaceIdColumnExists(false)
                  
                  const fallbackQuery = supabase
                    .from('company_events')
                    .select('*')
                    .eq('company_id', companyId)
                    .order('start_date', { ascending: true })
                  
                  const fallback = await fallbackQuery
                  if (!fallback.error) {
                    return fallback
                  }
                  // If fallback also fails, log it but return the original error
                  console.error('Fallback to company_id also failed:', fallback.error)
                }
              } else {
                // Success with space_id - cache that it exists
                setSpaceIdColumnExists(true)
              }
              
              return result
            }
          } catch (err) {
            // If query throws an exception, try company_id fallback
            console.log('Exception querying with space_id, trying company_id fallback', err)
            setSpaceIdColumnExists(false)
            
            const fallbackQuery = supabase
              .from('company_events')
              .select('*')
              .eq('company_id', companyId)
              .order('start_date', { ascending: true })
            
            const fallback = await fallbackQuery
            if (!fallback.error) {
              return fallback
            }
            // Return error if fallback also fails
            return { data: null, error: fallback.error }
          }
          
          // Fallback if spaceIdColumnExists was null and we somehow got here
          return await supabase
            .from('company_events')
            .select('*')
            .eq('company_id', companyId)
            .order('start_date', { ascending: true })
        } else if (!isAdmin) {
          // Non-admins must have a space/company
          return { data: null, error: { message: 'No space selected' } }
        } else {
          // Admins without space_id will see all events
          return await supabase
            .from('company_events')
            .select('*')
            .order('start_date', { ascending: true })
        }
      })()

      if (error) {
        console.error("Error loading events:", error)
        setLoading(false)
        return
      }

      // Transform database events to BrandEvent format
      const transformedEvents: BrandEvent[] = (data || []).map((event: any) => {
        // Try to get event type from event_type field, or infer from title
        const eventTypeValue = event.event_type || inferEventType(event.title || "")
        
        // Get space/company name from map (we fetched spaces separately)
        // Use space_id first (after migration), fallback to company_id
        const spaceId = event.space_id || event.company_id
        const spaceName = spaceId ? spacesMap.get(spaceId) || null : null
        
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
          color: eventTypeColors[eventTypeValue] || eventTypeColors.default,
          companyId: spaceId, // Store space/company ID (space_id takes precedence)
          companyName: spaceName || undefined
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
  }, [activeSpace, session?.user?.company_id || null, session?.user?.role || null])

  const createEvent = async () => {
    if (!eventTitle.trim() || !eventDate) {
      toastError('Please fill in event title and date')
      return
    }

    if (includeTime && (!eventStartTime || !eventEndTime)) {
      toastError('Please fill in start and end times')
      return
    }

    // Admins can create events without a space/company
    const isAdmin = session?.user?.role === 'admin'
    const companyId = activeSpace || session?.user?.company_id
    
    if (!isAdmin && !companyId) {
      toastError('Please select a space first')
      return
    }
    
    // For admin events without a company, we'll use null or handle it differently
    // Note: Database might require company_id, so admins may need to select a company
    if (isAdmin && !companyId) {
      // Allow admin to proceed - they can create events for any company
      // If database requires company_id, this will need to be handled at the database level
    }

    try {
      setCreating(true)
      
      // Prepare the event data
      // Format dates properly to avoid timezone issues
      const formattedStartDate = formatDateForDatabase(eventDate)
      // Use end date if provided, otherwise use start date (single day event)
      const endDateToUse = eventEndDate || eventDate
      const formattedEndDate = formatDateForDatabase(endDateToUse)
      
      // Try space_id first (after migration), fallback to company_id
      const eventData: {
        title: string
        description: string
        start_date: string
        end_date: string
        created_by: string | undefined
        space_id?: string | null
        company_id?: string | null
        start_time?: string
        end_time?: string
        event_type?: string
      } = {
        title: eventTitle,
        description: eventDescription,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        created_by: session?.user?.id,
        ...(companyId && { space_id: companyId }),
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

      // Try inserting with space_id first, fallback to company_id
      let { data, error } = await supabase
        .from('company_events')
        .insert(eventData)
        .select()
        .single()

      // If space_id column doesn't exist (migration not run), try company_id
      if (error && companyId && (error.message?.includes('does not exist') || error.message?.includes('column') || (error as any).code === '42703')) {
        const fallbackEventData = {
          ...eventData,
          company_id: companyId
        }
        delete fallbackEventData.space_id
        
        const fallback = await supabase
          .from('company_events')
          .insert(fallbackEventData)
          .select()
          .single()
        
        if (!fallback.error) {
          data = fallback.data
          error = null
        }
      }

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
    setEventEndDate('')
    setEventStartTime('')
    setEventEndTime('')
    setIncludeTime(false)
    setEventType('event')
    setEditingEvent(null)
  }

  // Handle clicking on a calendar day to create an event
  const handleDayClick = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    // Format date as YYYY-MM-DD for the date input
    const formattedDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    setEventDate(formattedDate)
    setEventEndDate(formattedDate) // Set end date to same as start date
    setIsCreateEventOpen(true)
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
    setEventEndDate(formatDateForInput(fullEvent.endDate.toISOString()))
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

    // Admins can create events without a space/company
    const isAdmin = session?.user?.role === 'admin'
    const companyId = activeSpace || session?.user?.company_id
    
    if (!isAdmin && !companyId) {
      toastError('Please select a space first')
      return
    }
    
    // For admin events without a company, we'll use null or handle it differently
    // Note: Database might require company_id, so admins may need to select a company
    if (isAdmin && !companyId) {
      // Allow admin to proceed - they can create events for any company
      // If database requires company_id, this will need to be handled at the database level
    }

    try {
      setCreating(true)
      
      // Format dates properly to avoid timezone issues
      const formattedStartDate = formatDateForDatabase(eventDate)
      // Use end date if provided, otherwise use start date (single day event)
      const endDateToUse = eventEndDate || eventDate
      const formattedEndDate = formatDateForDatabase(endDateToUse)
      
      // Try space_id first (after migration), fallback to company_id
      const eventData: {
        title: string
        description: string
        start_date: string
        end_date: string
        space_id?: string | null
        company_id?: string | null
        start_time?: string
        end_time?: string
        event_type?: string
      } = {
        title: eventTitle,
        description: eventDescription,
        start_date: formattedStartDate,
        end_date: formattedEndDate,
        ...(companyId && { space_id: companyId }),
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

      // Try updating with space_id first, fallback to company_id
      let { error } = await supabase
        .from('company_events')
        .update(eventData)
        .eq('id', editingEvent.id)
      
      // If space_id column doesn't exist (migration not run), try company_id
      if (error && companyId && (error.message?.includes('does not exist') || error.message?.includes('column') || (error as any).code === '42703')) {
        const fallbackEventData = {
          ...eventData,
          company_id: companyId
        }
        delete fallbackEventData.space_id
        
        const fallback = await supabase
          .from('company_events')
          .update(fallbackEventData)
          .eq('id', editingEvent.id)
        
        if (!fallback.error) {
          error = null
        }
      }

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

  // Get events that START on a specific day (for multi-day event rendering)
  const getEventsStartingOnDay = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const date = new Date(year, month, day)
    
    // Normalize date to midnight for comparison
    date.setHours(0, 0, 0, 0)
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      eventStart.setHours(0, 0, 0, 0)
      
      // Check if event starts on this day AND is within the current month view
      const eventEnd = new Date(event.endDate)
      eventEnd.setHours(0, 0, 0, 0)
      
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)
      
      // Event must start on this day and be visible in this month
      return eventStart.getTime() === date.getTime() && 
             eventStart <= monthEnd && 
             eventEnd >= monthStart
    })
  }

  // Calculate event layout with lanes to prevent overlaps
  const calculateEventLayout = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    
    // Prepare events with their day ranges
    interface EventLayout {
      event: BrandEvent
      startDay: number
      endDay: number
      startIndex: number
      endIndex: number
      days: Set<number>
      lane: number
    }
    
    const eventLayouts: EventLayout[] = events.map(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(0, 0, 0, 0)
      
      // Calculate visible range within month
      const viewStart = eventStart < monthStart ? monthStart : eventStart
      const viewEnd = eventEnd > monthEnd ? monthEnd : eventEnd
      
      // Get day numbers
      const startDay = viewStart.getDate()
      const endDay = viewEnd.getDate()
      
      // Get indices in the days array
      const startingDayOfWeek = new Date(year, month, 1).getDay()
      const startIndex = startingDayOfWeek + startDay - 1
      const endIndex = startingDayOfWeek + endDay - 1
      
      // Create set of all days this event occupies
      const days = new Set<number>()
      for (let d = startDay; d <= endDay; d++) {
        days.add(d)
      }
      
      return {
        event,
        startDay,
        endDay,
        startIndex,
        endIndex,
        days,
        lane: -1 // Will be assigned
      }
    }).filter(layout => {
      // Only include events visible in this month
      return layout.startIndex >= 0 && layout.startIndex < days.length
    })
    
    // Sort events: multi-day events first (by start day), then single-day events
    // Within multi-day events, sort by start day, then by end day (longer events first)
    // Within single-day events, sort by start day
    eventLayouts.sort((a, b) => {
      const aIsMultiDay = a.startDay !== a.endDay
      const bIsMultiDay = b.startDay !== b.endDay
      
      // Multi-day events come first
      if (aIsMultiDay && !bIsMultiDay) return -1
      if (!aIsMultiDay && bIsMultiDay) return 1
      
      // Within same type, sort by start day
      if (a.startDay !== b.startDay) return a.startDay - b.startDay
      
      // For multi-day events, longer events first
      if (aIsMultiDay) {
        return b.endDay - a.endDay
      }
      
      // For single-day events, just use start day (already handled above)
      return 0
    })
    
    // Assign lanes to prevent overlaps
    // Multi-day events get lanes 0, 1, 2... (at the top)
    // Single-day events get lanes after multi-day events
    const lanes: EventLayout[][] = []
    let multiDayLaneCount = 0
    let firstMultiDayProcessed = false
    
    eventLayouts.forEach(layout => {
      const isMultiDay = layout.startDay !== layout.endDay
      
      // Find the first lane where this event doesn't overlap
      let assignedLane = -1
      
      if (isMultiDay) {
        // Multi-day events: always start checking from lane 0
        // The first multi-day event should always get lane 0
        if (!firstMultiDayProcessed && lanes.length === 0) {
          // First multi-day event gets lane 0
          assignedLane = 0
          firstMultiDayProcessed = true
          // Initialize lane 0
          if (!lanes[0]) {
            lanes[0] = []
          }
        } else {
          // Check existing multi-day lanes (0 to multiDayLaneCount) for non-overlapping slot
          for (let laneIndex = 0; laneIndex <= multiDayLaneCount; laneIndex++) {
            // If lane doesn't exist yet, we can use it
            if (!lanes[laneIndex]) {
              assignedLane = laneIndex
              break
            }
            
            const laneEvents = lanes[laneIndex]
            const hasOverlap = laneEvents.some(existingLayout => {
              // Check if events overlap by checking if their day sets intersect
              for (const day of layout.days) {
                if (existingLayout.days.has(day)) {
                  return true
                }
              }
              return false
            })
            
            if (!hasOverlap) {
              assignedLane = laneIndex
              break
            }
          }
        }
      } else {
        // Single-day events: start checking from multiDayLaneCount
        for (let laneIndex = multiDayLaneCount; laneIndex < lanes.length; laneIndex++) {
          const laneEvents = lanes[laneIndex]
          const hasOverlap = laneEvents.some(existingLayout => {
            for (const day of layout.days) {
              if (existingLayout.days.has(day)) {
                return true
              }
            }
            return false
          })
          
          if (!hasOverlap) {
            assignedLane = laneIndex
            break
          }
        }
      }
      
      // If no lane found, create a new one
      if (assignedLane === -1) {
        assignedLane = lanes.length
        lanes.push([])
      }
      
      // Ensure the lane array exists
      if (!lanes[assignedLane]) {
        lanes[assignedLane] = []
      }
      
      // Track how many lanes are used by multi-day events
      if (isMultiDay) {
        // Always update multiDayLaneCount for multi-day events
        if (assignedLane >= multiDayLaneCount) {
          multiDayLaneCount = assignedLane + 1
        }
        // Ensure first multi-day event sets multiDayLaneCount to at least 1
        if (assignedLane === 0 && multiDayLaneCount === 0) {
          multiDayLaneCount = 1
        }
      }
      
      layout.lane = assignedLane
      lanes[assignedLane].push(layout)
    })
    
    return eventLayouts
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const previousWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 7)
    setCurrentDate(newDate)
  }

  const nextWeek = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 7)
    setCurrentDate(newDate)
  }

  const previousDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() - 1)
    setCurrentDate(newDate)
  }

  const nextDay = () => {
    const newDate = new Date(currentDate)
    newDate.setDate(newDate.getDate() + 1)
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Get week start (Sunday) and end (Saturday) dates
  const getWeekRange = () => {
    const date = new Date(currentDate)
    const day = date.getDay()
    const diff = date.getDate() - day
    const weekStart = new Date(date.setDate(diff))
    const weekEnd = new Date(date.setDate(diff + 6))
    return { weekStart, weekEnd }
  }

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const normalizedDate = new Date(date)
    normalizedDate.setHours(0, 0, 0, 0)
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(0, 0, 0, 0)
      return normalizedDate >= eventStart && normalizedDate <= eventEnd
    })
  }

  // Get days in current week
  const getDaysInWeek = () => {
    const { weekStart } = getWeekRange()
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart)
      day.setDate(weekStart.getDate() + i)
      days.push(day)
    }
    return days
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
      {/* Upcoming Events and Event Types */}
        <div className="grid grid-cols-2 gap-6">
          {/* Upcoming Events */}
          <div className="border border-border/80 rounded-lg p-4">
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
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium truncate flex-1">{event.title}</p>
                          {session?.user?.role === 'admin' && !activeSpace && event.companyName && (
                            <span className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground flex-shrink-0">
                              {event.companyName}
                            </span>
                          )}
                        </div>
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

          {/* Event Types */}
          <div className="border border-border/80 rounded-lg p-4">
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

        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg">
              {view === 'month' && `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
              {view === 'week' && (() => {
                const { weekStart, weekEnd } = getWeekRange()
                const startMonth = monthNames[weekStart.getMonth()].substring(0, 3)
                const endMonth = monthNames[weekEnd.getMonth()].substring(0, 3)
                if (weekStart.getMonth() === weekEnd.getMonth()) {
                  return `${startMonth} ${weekStart.getDate()} - ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
                }
                return `${startMonth} ${weekStart.getDate()} - ${endMonth} ${weekEnd.getDate()}, ${weekStart.getFullYear()}`
              })()}
              {view === 'day' && `${monthNames[currentDate.getMonth()]} ${currentDate.getDate()}, ${currentDate.getFullYear()}`}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {/* View Switcher */}
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
              <button
                onClick={() => setView('month')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  view === 'month' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Month View"
              >
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView('week')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  view === 'week' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Week View"
              >
                <CalendarDays className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setView('day')}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  view === 'day' 
                    ? 'bg-background text-foreground shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Day View"
              >
                <Calendar className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={() => setIsCreateEventOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Event
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Today
              </button>
              <button
                onClick={view === 'month' ? previousMonth : view === 'week' ? previousWeek : previousDay}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={view === 'month' ? nextMonth : view === 'week' ? nextWeek : nextDay}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Calendar View */}
        <div>
          {view === 'month' && (
            <div className="border border-border/80 rounded-lg overflow-hidden">
              {/* Days of week header */}
              <div className="grid grid-cols-7 bg-muted/20 border-b border-border/60">
                {daysOfWeek.map(day => (
                  <div key={day} className="px-2 py-3 text-center text-xs text-muted-foreground">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar days */}
              <div className="grid grid-cols-7">
              
              {/* Render day cells */}
              {days.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : []
                const eventLayouts = calculateEventLayout()
                
                // Render all events for this day (both single-day and multi-day)
                // Multi-day events will appear on each day they span
                const allDayEvents = dayEvents
                  .map(event => {
                    const layout = eventLayouts.find(l => l.event.id === event.id)
                    const eventStart = new Date(event.startDate)
                    const eventEnd = new Date(event.endDate)
                    eventStart.setHours(0, 0, 0, 0)
                    eventEnd.setHours(0, 0, 0, 0)
                    
                    // Check if it's a multi-day event
                    const isMultiDay = eventStart.getTime() !== eventEnd.getTime()
                    
                    return { 
                      event, 
                      lane: layout?.lane ?? 0,
                      isMultiDay 
                    }
                  })
                  .sort((a, b) => {
                    // Multi-day events first, then single-day events
                    if (a.isMultiDay && !b.isMultiDay) return -1
                    if (!a.isMultiDay && b.isMultiDay) return 1
                    // Within same type, sort by lane
                    return a.lane - b.lane
                  })
                
                return (
                  <div
                    key={index}
                    onClick={(e) => {
                      // Only open create dialog if clicking on empty space (not on an event)
                      if (day !== null) {
                        const target = e.target as HTMLElement
                        // Check if click is on an event element or within an event
                        const isEventClick = target.closest('.event-item') !== null
                        // Check if click is on the day number
                        const isDayNumberClick = target.closest('.day-number') !== null
                        // Check if click is from a dropdown menu
                        const isDropdownClick = target.closest('[role="menu"]') !== null || 
                                                target.closest('[role="menuitem"]') !== null ||
                                                target.closest('[data-radix-popper-content-wrapper]') !== null
                        
                        // Only open create dialog if clicking on empty space and not from dropdown
                        if (!isEventClick && !isDayNumberClick && !isDropdownClick) {
                          handleDayClick(day)
                        }
                      }
                    }}
                    className={`min-h-28 p-2 border-r border-b border-border/60 last:border-r-0 ${
                      index >= days.length - 7 ? "border-b-0" : ""
                    } ${day === null ? "bg-muted/10" : "bg-background hover:bg-muted/20 cursor-pointer"} transition-colors relative`}
                  >
                    {day !== null && (
                      <div className="h-full flex flex-col">
                        <div 
                          className={`text-sm mb-1 day-number ${
                            isToday(day) 
                              ? "w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center" 
                              : "text-foreground"
                          }`}
                        >
                          {day}
                        </div>
                        <div className="space-y-1 flex-1 overflow-y-auto">
                          {/* All events for this day */}
                          {allDayEvents.slice(0, 5).map(({ event }) => {
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
                            
                            // For admin view, show company name if available
                            const isAdmin = session?.user?.role === 'admin'
                            const showCompanyName = isAdmin && event.companyName && !activeSpace
                            
                            return (
                              <DropdownMenu key={event.id}>
                                <DropdownMenuTrigger asChild>
                                  <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full text-xs px-2 py-1 rounded-md font-medium cursor-pointer hover:opacity-90 transition-opacity overflow-hidden text-ellipsis whitespace-nowrap relative group event-item text-foreground"
                                    style={{
                                      backgroundColor: hexToRgba(event.color, 0.2),
                                      borderLeft: `3px solid ${event.color}`,
                                    }}
                                    title={showCompanyName ? `${event.title} (${event.companyName})` : event.title}
                                  >
                                    {showCompanyName && event.companyName && (
                                      <span className="font-semibold text-[10px] opacity-70 mr-1 text-foreground">
                                        {event.companyName.substring(0, 8)}:
                                      </span>
                                    )}
                                    {displayTitle}
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent 
                                  align="start" 
                                  className="w-48"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleEditEvent(event)
                                    }}
                                  >
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Event
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      deleteEvent(event.id)
                                    }}
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
                            <div className="text-xs text-muted-foreground px-1 font-medium" onClick={(e) => e.stopPropagation()}>
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
          )}

          {view === 'week' && (
            <div className="border border-border/80 rounded-lg overflow-hidden">
              {/* Days of week header */}
              <div className="grid grid-cols-7 bg-muted/20 border-b border-border/60">
                {getDaysInWeek().map((date, index) => {
                  const isToday = date.toDateString() === new Date().toDateString()
                  return (
                    <div key={index} className="px-2 py-3 text-center border-r border-border/60 last:border-r-0">
                      <div className={`text-xs text-muted-foreground mb-1 ${isToday ? 'font-semibold text-foreground' : ''}`}>
                        {daysOfWeek[date.getDay()]}
                      </div>
                      <div className={`text-sm ${isToday ? 'w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center mx-auto' : ''}`}>
                        {date.getDate()}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Week view days */}
              <div className="grid grid-cols-7 min-h-[600px]">
                {getDaysInWeek().map((date, index) => {
                  const dayEvents = getEventsForDate(date)
                  const isToday = date.toDateString() === new Date().toDateString()
                  
                  return (
                    <div
                      key={index}
                      onClick={(e) => {
                        const target = e.target as HTMLElement
                        const isEventClick = target.closest('.event-item') !== null
                        const isDropdownClick = target.closest('[role="menu"]') !== null || 
                                                target.closest('[role="menuitem"]') !== null ||
                                                target.closest('[data-radix-popper-content-wrapper]') !== null
                        
                        if (!isEventClick && !isDropdownClick) {
                          const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                          setEventDate(formattedDate)
                          setEventEndDate(formattedDate)
                          setIsCreateEventOpen(true)
                        }
                      }}
                      className={`min-h-[600px] p-3 border-r border-b border-border/60 last:border-r-0 ${
                        index >= 6 ? "border-b-0" : ""
                      } ${isToday ? "bg-muted/10" : "bg-background hover:bg-muted/20"} cursor-pointer transition-colors`}
                    >
                      <div className="space-y-2">
                        {dayEvents.map((event) => {
                          const hexToRgba = (hex: string, alpha: number) => {
                            const r = parseInt(hex.slice(1, 3), 16)
                            const g = parseInt(hex.slice(3, 5), 16)
                            const b = parseInt(hex.slice(5, 7), 16)
                            return `rgba(${r}, ${g}, ${b}, ${alpha})`
                          }
                          
                          const isAdmin = session?.user?.role === 'admin'
                          const showCompanyName = isAdmin && event.companyName && !activeSpace
                          
                          return (
                            <DropdownMenu key={event.id}>
                              <DropdownMenuTrigger asChild>
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full text-xs px-2 py-2 rounded-md font-medium cursor-pointer hover:opacity-90 transition-opacity event-item text-foreground"
                                  style={{
                                    backgroundColor: hexToRgba(event.color, 0.2),
                                    borderLeft: `3px solid ${event.color}`,
                                  }}
                                  title={showCompanyName ? `${event.title} (${event.companyName})` : event.title}
                                >
                                  <div className="font-medium truncate">{event.title}</div>
                                  {showCompanyName && (
                                    <div className="text-[10px] opacity-70 mt-0.5 truncate text-foreground">{event.companyName}</div>
                                  )}
                                </div>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent 
                                align="start" 
                                className="w-48"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleEditEvent(event)
                                  }}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Event
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteEvent(event.id)
                                  }}
                                  className="text-red-500"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Event
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {view === 'day' && (
            <div className="border border-border/80 rounded-lg overflow-hidden">
              {/* Day header */}
              <div className="bg-muted/20 border-b border-border/60 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      {daysOfWeek[currentDate.getDay()]}
                    </div>
                    <div className="text-lg font-medium">
                      {monthNames[currentDate.getMonth()]} {currentDate.getDate()}, {currentDate.getFullYear()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Day view - hourly timeline */}
              <div className="min-h-[600px] p-4">
                <div className="space-y-1">
                  {Array.from({ length: 24 }, (_, i) => {
                    const hour = i
                    
                    // Get events for this hour
                    const hourEvents = getEventsForDate(currentDate).filter(event => {
                      const eventStart = new Date(event.startDate)
                      const eventHour = eventStart.getHours()
                      return eventHour === hour || (eventHour < hour && new Date(event.endDate).getHours() >= hour)
                    })
                    
                    return (
                      <div key={hour} className="flex gap-4 min-h-[60px] border-b border-border/40">
                        <div className="w-16 text-xs text-muted-foreground pt-2">
                          {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                        </div>
                        <div 
                          className="flex-1 pt-2 cursor-pointer hover:bg-muted/20 transition-colors rounded"
                          onClick={(e) => {
                            const target = e.target as HTMLElement
                            const isEventClick = target.closest('.event-item') !== null
                            const isDropdownClick = target.closest('[role="menu"]') !== null || 
                                                    target.closest('[role="menuitem"]') !== null ||
                                                    target.closest('[data-radix-popper-content-wrapper]') !== null
                            
                            if (!isEventClick && !isDropdownClick) {
                              const formattedDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`
                              setEventDate(formattedDate)
                              setEventEndDate(formattedDate)
                              setEventStartTime(`${String(hour).padStart(2, '0')}:00`)
                              setEventEndTime(`${String(hour + 1).padStart(2, '0')}:00`)
                              setIncludeTime(true)
                              setIsCreateEventOpen(true)
                            }
                          }}
                        >
                          <div className="space-y-1">
                            {hourEvents.map((event) => {
                              const hexToRgba = (hex: string, alpha: number) => {
                                const r = parseInt(hex.slice(1, 3), 16)
                                const g = parseInt(hex.slice(3, 5), 16)
                                const b = parseInt(hex.slice(5, 7), 16)
                                return `rgba(${r}, ${g}, ${b}, ${alpha})`
                              }
                              
                              const isAdmin = session?.user?.role === 'admin'
                              const showCompanyName = isAdmin && event.companyName && !activeSpace
                              
                              return (
                                <DropdownMenu key={event.id}>
                                  <DropdownMenuTrigger asChild>
                                    <div
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs px-2 py-1.5 rounded-md font-medium cursor-pointer hover:opacity-90 transition-opacity event-item text-foreground"
                                      style={{
                                        backgroundColor: hexToRgba(event.color, 0.2),
                                        borderLeft: `3px solid ${event.color}`,
                                      }}
                                      title={showCompanyName ? `${event.title} (${event.companyName})` : event.title}
                                    >
                                      <div className="font-medium truncate">{event.title}</div>
                                      {showCompanyName && (
                                        <div className="text-[10px] opacity-70 mt-0.5 truncate text-foreground">{event.companyName}</div>
                                      )}
                                    </div>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent 
                                    align="start" 
                                    className="w-48"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleEditEvent(event)
                                      }}
                                    >
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Event
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        deleteEvent(event.id)
                                      }}
                                      className="text-red-500"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete Event
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-date">Start Date *</Label>
                <Input
                  id="event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value)
                    // Auto-set end date to start date if not already set
                    if (!eventEndDate) {
                      setEventEndDate(e.target.value)
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="event-end-date">End Date (optional)</Label>
                <Input
                  id="event-end-date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  min={eventDate}
                  placeholder="Leave empty for single day event"
                />
              </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-event-date">Start Date *</Label>
                <Input
                  id="edit-event-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => {
                    setEventDate(e.target.value)
                    // Auto-set end date to start date if not already set
                    if (!eventEndDate) {
                      setEventEndDate(e.target.value)
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="edit-event-end-date">End Date (optional)</Label>
                <Input
                  id="edit-event-end-date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  min={eventDate}
                  placeholder="Leave empty for single day event"
                />
              </div>
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
