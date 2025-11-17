import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Clock, 
  User, 
  Trash2, 
  Plus,
  Building,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  EyeOff,
  Calendar as CalendarIcon,
  Lightbulb
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, getDate, addMonths, subMonths, isSameDay, isWithinInterval, parseISO, addDays } from 'date-fns'
import { useSession } from '@/components/providers/session-provider'
import { supabase } from '@/lib/supabase'

interface CompanyEvent {
  id: string
  title: string
  description?: string
  start_date: string
  end_date: string
  start_time: string
  end_time: string
  created_by: string
  company_id: string
  created_at: string
}

interface Company {
  id: string
  name: string
}

type FilterType = 'today' | 'this-week' | 'this-month' | 'all'

export default function CompanyCalendarsTab({ selectedCompany }: { selectedCompany?: string | null }) {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [events, setEvents] = useState<CompanyEvent[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterType, setFilterType] = useState<FilterType>('this-month')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showAllDetails, setShowAllDetails] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  // Form state for creating events
  const [eventTitle, setEventTitle] = useState('')
  const [eventDescription, setEventDescription] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventStartTime, setEventStartTime] = useState('')
  const [eventEndTime, setEventEndTime] = useState('')
  const [includeTime, setIncludeTime] = useState(false)
  const [creating, setCreating] = useState(false)

  const isAdmin = session?.user?.role === 'admin'

  // Debug logging
  console.log('CompanyCalendarsTab - Status:', status, 'Session:', session?.user?.id, 'IsAdmin:', isAdmin)

  // Handle URL parameters for company selection
  useEffect(() => {
    const companyParam = searchParams.get('company')
    console.log('CompanyCalendarsTab - URL company parameter:', companyParam)
    console.log('CompanyCalendarsTab - selectedCompany prop:', selectedCompany)
    
    // Prioritize URL parameter over prop
    const companyToSelect = companyParam || selectedCompany
    if (companyToSelect) {
      console.log('Setting selected company to:', companyToSelect)
      setSelectedCompanyId(companyToSelect)
    }
  }, [searchParams, selectedCompany])

  useEffect(() => {
    console.log('useEffect triggered - status:', status, 'session.user.id:', session?.user?.id)
    if (status === 'authenticated' && session?.user?.id && supabase) {
      console.log('Calling loadCompanies')
      loadCompanies()
    } else {
      console.log('Not calling loadCompanies - requirements not met')
    }
  }, [status, session?.user?.id])

  useEffect(() => {
    if (selectedCompanyId) {
      loadEvents()
    }
  }, [selectedCompanyId])

  const loadCompanies = async () => {
    try {
      console.log('loadCompanies called with session:', session?.user?.id, 'status:', status)
      
      if (!supabase || !session?.user?.id || status !== 'authenticated') {
        console.log('Early return from loadCompanies - missing requirements')
        setError('Session not available')
        return
      }
      
      if (isAdmin) {
        // Admin can see all companies
        const { data, error } = await supabase
          .from('companies')
          .select('id, name')
          .order('name')
        
        if (error) throw error
        
        setCompanies(data || [])
        if (data && data.length > 0) {
          setSelectedCompanyId(data[0].id)
        }
      } else {
        // Regular user can only see their company
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('company_id')
          .eq('id', session.user.id)
          .single()
        
        if (userError) throw userError
        
        if (userData?.company_id) {
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .select('id, name')
            .eq('id', userData.company_id)
            .single()
          
          if (companyError) throw companyError
          
          setCompanies([companyData])
          setSelectedCompanyId(companyData.id)
        }
      }
    } catch (err) {
      console.error('Error loading companies:', err)
      setError('Failed to load companies')
    }
  }

  const loadEvents = async () => {
    if (!selectedCompanyId || !supabase) return
    
    try {
      setLoading(true)
      // Remove the foreign key join for now since it's causing issues
      const { data, error } = await supabase
        .from('company_events')
        .select('*')
        .eq('company_id', selectedCompanyId)
        .order('start_date', { ascending: true })
      
      if (error) throw error
      
      setEvents(data || [])
    } catch (err) {
      console.error('Error loading events:', err)
      setError('Failed to load events')
    } finally {
      setLoading(false)
    }
  }

  const createEvent = async () => {
    if (!eventTitle || !eventDate || !supabase) {
      setError('Please fill in all required fields')
      return
    }

    // If time is included, validate time fields
    if (includeTime && (!eventStartTime || !eventEndTime)) {
      setError('Please fill in both start and end times')
      return
    }

    try {
      setCreating(true)
      
      // Prepare the event data
      const eventData: {
        title: string
        description: string
        start_date: string
        end_date: string
        created_by: string | undefined
        company_id: string
        start_time?: string
        end_time?: string
      } = {
        title: eventTitle,
        description: eventDescription,
        start_date: eventDate,
        end_date: eventEndDate || eventDate, // Use end date if provided, otherwise same day
        created_by: session?.user?.id,
        company_id: selectedCompanyId
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

      const { data, error } = await supabase
        .from('company_events')
        .insert(eventData)
        .select()
        .single()

      if (error) throw error

      // Reset form
      setEventTitle('')
      setEventDescription('')
      setEventDate('')
      setEventEndDate('')
      setEventStartTime('')
      setEventEndTime('')
      setIncludeTime(false)
      setShowCreateDialog(false)

      // Reload events
      await loadEvents()
    } catch (err) {
      console.error('Error creating event:', err)
      setError('Failed to create event')
    } finally {
      setCreating(false)
    }
  }

  const deleteEvent = async (eventId: string) => {
    if (!supabase) return
    
    try {
      setDeleting(true)
      const { error } = await supabase
        .from('company_events')
        .delete()
        .eq('id', eventId)
      
      if (error) throw error

      setShowDeleteDialog(false)
      setDeleteTarget(null)
      await loadEvents()
    } catch (err) {
      console.error('Error deleting event:', err)
      setError('Failed to delete event')
    } finally {
      setDeleting(false)
    }
  }

  const getFilteredEvents = () => {
    const now = new Date()
    
    switch (filterType) {
      case 'today':
        return events.filter(event => 
          isSameDay(parseISO(event.start_date), now)
        )
      case 'this-week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        return events.filter(event => 
          isWithinInterval(parseISO(event.start_date), { start: weekStart, end: weekEnd })
        )
      case 'this-month':
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        return events.filter(event => 
          isWithinInterval(parseISO(event.start_date), { start: monthStart, end: monthEnd })
        )
      case 'all':
        return events
      default:
        return events
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonth(subMonths(currentMonth, 1))
    } else {
      setCurrentMonth(addMonths(currentMonth, 1))
    }
    setExpandedDay(null)
    setExpandedEvent(null)
  }

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return events.filter(event => 
      event.start_date === dateStr
    )
  }

  const renderCalendarDays = () => {
    let days: Date[] = []
    
    switch (filterType) {
      case 'today':
        const today = new Date()
        days = [today]
        break
      case 'this-week':
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        days = eachDayOfInterval({ 
          start: weekStart, 
          end: endOfWeek(new Date(), { weekStartsOn: 1 }) 
        })
        break
      case 'this-month':
      case 'all':
      default:
        const monthStart = startOfMonth(currentMonth)
        const monthEnd = endOfMonth(currentMonth)
        const startDate = new Date(monthStart)
        startDate.setDate(startDate.getDate() - getDay(monthStart))
        
        const endDate = new Date(monthEnd)
        endDate.setDate(endDate.getDate() + (6 - getDay(monthEnd)))
        
        days = eachDayOfInterval({ start: startDate, end: endDate })
        break
    }
    
    return (
      <>
        {days.map((day, index) => {
          const dayEvents = getEventsForDate(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          const expanded = isDayExpanded(day)
          const hasEvents = dayEvents.length > 0
          
          return (
            <div key={index} className={getDayClassNames(day, expanded)}>
              {/* Date Number and Expand Button */}
              <div className="flex items-center justify-between mb-2">
                <span className={isToday(day) ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium" : "text-foreground"}>
                  {getDate(day)}
                </span>
                {hasEvents && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleDayExpansion(dateStr)
                    }}
                    className={`h-6 w-6 p-0 transition-colors ${
                      expanded 
                        ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-100' 
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                    title={expanded ? 'Collapse day view' : 'Expand day view'}
                  >
                    {expanded ? '−' : '+'}
                  </Button>
                )}
              </div>
              
              {/* Show events for this day */}
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {dayEvents.map((event) => (
                  <div key={event.id} className="text-xs bg-blue-100 border border-blue-200 rounded p-1 cursor-pointer hover:bg-blue-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div 
                        className="font-medium text-blue-800 truncate flex-1 cursor-pointer"
                        onClick={() => toggleEventExpansion(event.id)}
                        title="Click to expand event details"
                      >
                        {event.title}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleEventExpansion(event.id)
                          }}
                          title={isEventExpanded(event.id) ? 'Collapse event' : 'Expand event'}
                        >
                          {isEventExpanded(event.id) ? '−' : '+'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-red-500 hover:text-red-600 hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(event.id)
                            setShowDeleteDialog(true)
                          }}
                          disabled={deleting}
                        >
                          {deleting && deleteTarget === event.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">
                        {formatEventTime(event.start_time, event.end_time)}
                      </span>
                    </div>
                    {showAllDetails && (
                      <div className="text-blue-600 text-xs mt-1">
                        <span className="font-medium">Duration:</span> {calculateDuration(event.start_time, event.end_time)}
                      </div>
                    )}
                    
                    {/* User Info */}
                    <div className="text-blue-600 text-xs mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="font-medium">Created by:</span> 
                      <span className="ml-1 font-semibold text-blue-700">
                        {event.created_by}
                      </span>
                    </div>
                    
                    {/* Expanded Event Details */}
                    {isEventExpanded(event.id) && (
                      <div className="mt-2 p-2 bg-white border border-blue-300 rounded text-xs transition-all duration-200 ease-in-out">
                        <div className="space-y-1">
                          {event.description && (
                            <div className="text-gray-700">
                              <span className="font-medium">Description:</span> {event.description}
                            </div>
                          )}
                          <div className="text-gray-600">
                            <span className="font-medium">Duration:</span> {calculateDuration(event.start_time, event.end_time)}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">Created by:</span> 
                            <span className="ml-1 font-semibold text-blue-700">
                              {event.created_by}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Expanded Day View */}
              {expanded && hasEvents && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-900 text-sm">
                      {format(day, 'EEEE, MMMM d, yyyy')} - {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedDay(null)
                      }}
                      className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800 flex-shrink-0"
                    >
                      ×
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div key={event.id} className="bg-white p-3 rounded border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-gray-900 text-sm">
                                {event.title}
                              </h5>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                onClick={() => toggleEventExpansion(event.id)}
                                title={isEventExpanded(event.id) ? 'Collapse event' : 'Expand event'}
                              >
                                {isEventExpanded(event.id) ? '−' : '+'}
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {formatEventTime(event.start_time, event.end_time)}
                                  {!isAllDayEvent(event.start_time, event.end_time) && (
                                    <span className="ml-2 text-blue-600">
                                      ({calculateDuration(event.start_time, event.end_time)})
                                    </span>
                                  )}
                                </span>
                              </div>
                              {event.description && (
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-500 flex-shrink-0">📝</span>
                                  <span className="text-gray-700 break-words">{event.description}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="text-gray-500">
                                  Created by: <span className="font-semibold text-blue-700">{event.created_by}</span>
                                </span>
                              </div>
                              
                              {/* Additional Event Details when Expanded */}
                              {isEventExpanded(event.id) && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded transition-all duration-200 ease-in-out">
                                  <div className="text-xs text-blue-800 space-y-1">
                                    <div>
                                      <span className="font-medium">Event ID:</span> {event.id}
                                    </div>
                                    <div>
                                      <span className="font-medium">Date:</span> {format(parseISO(event.start_date), 'MMM d, yyyy')}
                                    </div>
                                    <div>
                                      <span className="font-medium">Time Range:</span> {formatEventTime(event.start_time, event.end_time)}
                                    </div>
                                    <div>
                                      <span className="font-medium">Created by:</span> 
                                      <span className="ml-1 font-semibold text-blue-700">
                                        {event.created_by}
                                      </span>
                                    </div>
                                    {event.description && (
                                      <div>
                                        <span className="font-medium">Full Description:</span>
                                        <div className="mt-1 text-blue-700 bg-white p-2 rounded border">
                                          {event.description}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteTarget(event.id)
                              setShowDeleteDialog(true)
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2 text-xs flex-shrink-0 ml-2"
                            disabled={deleting}
                          >
                            {deleting && deleteTarget === event.id ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </>
    )
  }

  const renderCalendarHeader = () => {
    if (filterType === 'today') {
      return null
    }
    
    if (filterType === 'this-week') {
      const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
      const days = eachDayOfInterval({ 
        start: weekStart, 
        end: endOfWeek(new Date(), { weekStartsOn: 1 }) 
      })
      return (
        <div className="grid grid-cols-7 gap-0">
          {days.map(day => (
            <div key={day.toISOString()} className="h-12 flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted/20 border-b border-border/40">
              {format(day, 'EEE')}
            </div>
          ))}
        </div>
      )
    }
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div className="grid grid-cols-7 gap-0">
        {days.map(day => (
          <div key={day} className="h-12 flex items-center justify-center text-xs font-medium text-muted-foreground bg-muted/20 border-b border-border/40">
            {day}
          </div>
        ))}
      </div>
    )
  }

  const getDayClassNames = (date: Date, expanded: boolean) => {
    let baseClasses = "min-h-24 p-2 border-r border-b border-border/40 text-sm relative transition-all duration-300 ease-in-out"
    
    if (filterType === 'today') {
      baseClasses = "min-h-96 p-4 border border-border/40 text-sm relative transition-all duration-300 ease-in-out"
    }
    
    if (expanded) {
      baseClasses = baseClasses.replace('min-h-24', 'min-h-96')
      if (filterType === 'today') {
        baseClasses = baseClasses.replace('min-h-96', 'min-h-[32rem]')
      }
    }
    
    const todayClasses = isToday(date) ? "bg-blue-500/20" : ""
    const otherMonthClasses = !isSameMonth(date, currentMonth) && filterType !== 'today' && filterType !== 'this-week' ? "text-muted-foreground/50 bg-muted/10" : "bg-background"
    
    return `${baseClasses} ${todayClasses} ${otherMonthClasses}`.trim()
  }

  const getCalendarTitle = () => {
    switch (filterType) {
      case 'today':
        return format(new Date(), 'EEEE, MMMM d, yyyy')
      case 'this-week':
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
        const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'this-month':
      case 'all':
      default:
        return format(currentMonth, 'MMMM yyyy')
    }
  }

  const shouldShowMonthNavigation = () => {
    return filterType === 'this-month' || filterType === 'all'
  }

  const handleFilterChange = (newFilterType: FilterType) => {
    setFilterType(newFilterType)
    if (newFilterType === 'this-month' || newFilterType === 'all') {
      setCurrentMonth(new Date())
    }
    setExpandedDay(null)
    setExpandedEvent(null)
  }

  const toggleDayExpansion = (dateStr: string) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null)
    } else {
      setExpandedDay(dateStr)
    }
  }

  const toggleEventExpansion = (eventId: string) => {
    if (expandedEvent === eventId) {
      setExpandedEvent(null)
    } else {
      setExpandedEvent(eventId)
    }
  }

  const isDayExpanded = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return expandedDay === dateStr
  }

  const isEventExpanded = (eventId: string) => {
    return expandedEvent === eventId
  }

  const getFilterLabel = (type: FilterType) => {
    switch (type) {
      case 'today':
        return 'Today'
      case 'this-week':
        return 'This Week'
      case 'this-month':
        return 'This Month'
      case 'all':
        return 'All Time'
      default:
        return 'Filter'
    }
  }

  const getFilterCount = (type: FilterType) => {
    const now = new Date()
    
    switch (type) {
      case 'today':
        return events.filter(event => 
          isSameDay(parseISO(event.start_date), now)
        ).length
      case 'this-week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        return events.filter(event => 
          isWithinInterval(parseISO(event.start_date), { start: weekStart, end: weekEnd })
        ).length
      case 'this-month':
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        return events.filter(event => 
          isWithinInterval(parseISO(event.start_date), { start: monthStart, end: monthEnd })
        ).length
      case 'all':
        return events.length
      default:
        return 0
    }
  }

  const formatTime = (time: string) => {
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    return time
  }

  const isAllDayEvent = (startTime: string, endTime: string) => {
    return startTime === '00:00:00' && endTime === '23:59:59'
  }

  const formatEventTime = (startTime: string, endTime: string) => {
    if (isAllDayEvent(startTime, endTime)) {
      return 'All Day'
    }
    return `${formatTime(startTime)} - ${formatTime(endTime)}`
  }

  const calculateDuration = (startTime: string, endTime: string) => {
    if (isAllDayEvent(startTime, endTime)) {
      return 'All Day'
    }
    
    if (startTime.includes(':') && endTime.includes(':')) {
      const [startHours, startMinutes] = startTime.split(':').map(Number)
      const [endHours, endMinutes] = endTime.split(':').map(Number)
      
      const startTotalMinutes = startHours * 60 + startMinutes
      const endTotalMinutes = endHours * 60 + endMinutes
      
      const durationMinutes = endTotalMinutes - startTotalMinutes
      
      if (durationMinutes === 30) return '30 min'
      if (durationMinutes === 60) return '1 hour'
      if (durationMinutes < 60) return `${durationMinutes} min`
      
      const hours = Math.floor(durationMinutes / 60)
      const minutes = durationMinutes % 60
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
    }
    return ''
  }

  const filteredEvents = getFilteredEvents()

  // Early return if session is not ready
  if (status === 'loading') {
    return (
      <Card className="parrot-card-enhanced">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading session...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (status !== 'authenticated' || !session?.user?.id) {
    return (
      <Card className="parrot-card-enhanced">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please sign in to view the company calendar.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="parrot-card-enhanced">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading company calendar...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!selectedCompanyId) {
    return (
      <Card className="parrot-card-enhanced">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Company Selected</h3>
            <p className="text-gray-600">Please select a company to view the calendar.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Header with Company Selection and Filters */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-foreground" />
            <h3 className="text-lg font-semibold text-foreground">Company Calendar</h3>
            <Badge variant="secondary" className="ml-2">
              {getFilterCount(filterType)} events
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllDetails(!showAllDetails)}
              className="flex items-center gap-2"
            >
              {showAllDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAllDetails ? 'Hide Details' : 'Show Details'}
            </Button>
            
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Event
            </Button>
          </div>
        </div>

        {/* Company Selection (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-2 mb-4">
            <Label htmlFor="company-select" className="text-sm font-medium text-foreground">
              Company:
            </Label>
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger id="company-select" className="w-64">
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filter Options */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-sm text-muted-foreground mr-2">Show:</span>
          
          <div className="flex gap-1">
            {(['today', 'this-week', 'this-month', 'all'] as FilterType[]).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(type)}
                className={`text-xs px-3 py-1 h-8 ${
                  filterType === type 
                    ? 'bg-orange-500 hover:bg-orange-600 text-white' 
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {getFilterLabel(type)} {getFilterCount(type)}
              </Button>
            ))}
          </div>
          
          {/* Help text */}
          <div className="ml-4 text-xs text-muted-foreground flex items-center gap-1">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>Click + on days with events to expand • Click event titles or + buttons to expand event details</span>
          </div>
        </div>

        {/* Calendar Navigation */}
        {shouldShowMonthNavigation() && (
          <div className="flex items-center justify-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-muted"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-foreground">
              {getCalendarTitle()}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-muted"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <Card className="border-border/60">
        <CardContent className="p-0">
          <div className="border border-border/60 rounded-lg overflow-hidden">
            {renderCalendarHeader()}
            <div className="grid grid-cols-7 auto-rows-auto gap-0 [&>*:nth-child(7n)]:border-r-0">
              {renderCalendarDays()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4">
        <Card className="bg-blue-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{events.length}</div>
            <div className="text-sm opacity-90">Total Events</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {events.filter(e => isSameMonth(parseISO(e.start_date), currentMonth)).length}
            </div>
            <div className="text-sm opacity-90">This Month</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {events.filter(e => isSameDay(parseISO(e.start_date), new Date())).length}
            </div>
            <div className="text-sm opacity-90">Today</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">
              {getFilterCount(filterType)}
            </div>
            <div className="text-sm opacity-90">Filtered</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Create Event Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Event</DialogTitle>
            <DialogDescription>
              Create a new event for your company calendar. Time is optional - uncheck &quot;Include specific time&quot; for all-day events.
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
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={createEvent} disabled={creating || !eventTitle || !eventDate || (includeTime && (!eventStartTime || !eventEndTime))}>
              {creating ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Event</DialogTitle>
            <DialogDescription>
              This will permanently delete this event. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => deleteEvent(deleteTarget!)}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
