import React, { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  getAllConfirmedMeetings, 
  deleteConfirmedMeeting, 
  deleteAllConfirmedMeetings
} from '@/lib/meeting-functions'
import { ConfirmedMeeting } from '@/lib/supabase'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, getDay, getDate, addMonths, subMonths, isSameDay, isWithinInterval, parseISO } from 'date-fns'
import { 
  Calendar, 
  Clock, 
  User, 
  Trash2, 
  AlertTriangle,
  Filter,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AdminConfirmedMeetingsCalendarProps {
  refreshTrigger?: number
}

type FilterType = 'today' | 'this-week' | 'this-month' | 'all'

export const AdminConfirmedMeetingsCalendar: React.FC<AdminConfirmedMeetingsCalendarProps> = ({ 
  refreshTrigger 
}) => {
  const [meetings, setMeetings] = useState<(ConfirmedMeeting & { user?: { full_name: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [filterType, setFilterType] = useState<FilterType>('this-month')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showAllMeetings, setShowAllMeetings] = useState(false)
  const [expandedDay, setExpandedDay] = useState<string | null>(null)
  const [expandedMeeting, setExpandedMeeting] = useState<string | null>(null)

  useEffect(() => {
    loadMeetings()
  }, [refreshTrigger])

  const loadMeetings = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await getAllConfirmedMeetings()
      
      if (fetchError) {
        setError('Failed to load confirmed meetings')
        return
      }

      console.log('🔍 Debug: AdminCalendar loadMeetings')
      console.log('  - Raw data received:', data)
      console.log('  - First meeting sample:', data?.[0])
      console.log('  - User data in first meeting:', data?.[0]?.user)

      setMeetings(data || [])
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredMeetings = () => {
    const now = new Date()
    
    switch (filterType) {
      case 'today':
        return meetings.filter(meeting => 
          isSameDay(parseISO(meeting.meeting_date), now)
        )
      case 'this-week':
        const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday start
        const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
        return meetings.filter(meeting => 
          isWithinInterval(parseISO(meeting.meeting_date), { start: weekStart, end: weekEnd })
        )
      case 'this-month':
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        return meetings.filter(meeting => 
          isWithinInterval(parseISO(meeting.meeting_date), { start: monthStart, end: monthEnd })
        )
      case 'all':
        return meetings
      default:
        return meetings
    }
  }

  const handleDeleteMeeting = async (meetingId: string) => {
    setDeleting(true)
    try {
      const { success } = await deleteConfirmedMeeting(meetingId)
      
      if (success) {
        await loadMeetings()
        setShowDeleteDialog(false)
        setDeleteTarget(null)
      } else {
        setError('Failed to delete meeting')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setDeleting(false)
    }
  }

  const handleDeleteAllMeetings = async () => {
    setDeleting(true)
    try {
      const { success } = await deleteAllConfirmedMeetings()
      
      if (success) {
        await loadMeetings()
        setShowDeleteDialog(false)
        setDeleteTarget(null)
      } else {
        setError('Failed to delete all meetings')
      }
    } catch {
      setError('An unexpected error occurred')
    } finally {
      setDeleting(false)
    }
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonth(subMonths(currentMonth, 1))
    } else {
      setCurrentMonth(addMonths(currentMonth, 1))
    }
    // Reset expanded states when navigating
    setExpandedDay(null)
    setExpandedMeeting(null)
  }

  const getMeetingsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return meetings.filter(meeting => 
      meeting.meeting_date === dateStr
    )
  }

  const renderCalendarDays = () => {
    let days: Date[] = []
    let gridCols = 7
    
    switch (filterType) {
      case 'today':
        const today = new Date()
        days = [today]
        gridCols = 1
        break
      case 'this-week':
        const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }) // Monday start
        days = eachDayOfInterval({ 
          start: weekStart, 
          end: endOfWeek(new Date(), { weekStartsOn: 1 }) 
        })
        gridCols = 7
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
        gridCols = 7
        break
    }
    
    return (
      <>
        {days.map((day, index) => {
          const dayMeetings = getMeetingsForDate(day)
          const dateStr = format(day, 'yyyy-MM-dd')
          const expanded = isDayExpanded(day)
          const hasMeetings = dayMeetings.length > 0
          
          return (
            <div key={index} className={getDayClassNames(day, expanded)}>
              {/* Date Number and Expand Button */}
              <div className="flex items-center justify-between mb-2">
                <span className={isToday(day) ? "bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" : ""}>
                  {getDate(day)}
                </span>
                {hasMeetings && (
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
                    aria-label={expanded ? 'Collapse day view' : 'Expand day view'}
                  >
                    {expanded ? '−' : '+'}
                  </Button>
                )}
              </div>
              
              {/* Show meetings for this day */}
              <div className="space-y-1 max-h-24 overflow-y-auto">
                {dayMeetings.map((meeting, meetingIndex) => (
                  <div key={meeting.id} className="text-xs bg-green-100 border border-green-200 rounded p-1 cursor-pointer hover:bg-green-200 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div 
                        className="font-medium text-green-800 truncate flex-1 cursor-pointer"
                        onClick={() => toggleMeetingExpansion(meeting.id)}
                        title="Click to expand meeting details"
                      >
                        {meeting.meeting_title}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleMeetingExpansion(meeting.id)
                          }}
                          title={isMeetingExpanded(meeting.id) ? 'Collapse meeting' : 'Expand meeting'}
                        >
                          {isMeetingExpanded(meeting.id) ? '−' : '+'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 text-red-500 hover:text-red-600 hover:bg-red-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteTarget(meeting.id)
                            setShowDeleteDialog(true)
                          }}
                          disabled={deleting}
                        >
                          {deleting && deleteTarget === meeting.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-500"></div>
                          ) : (
                            <Trash2 className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="text-green-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span className="truncate">
                        {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                      </span>
                    </div>
                    {showAllMeetings && (
                      <div className="text-green-600 text-xs mt-1">
                        <span className="font-medium">Duration:</span> {calculateDuration(meeting.start_time, meeting.end_time)}
                      </div>
                    )}
                    
                    {/* User Info */}
                    <div className="text-green-600 text-xs mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span className="font-medium">User:</span> 
                      <span className="ml-1 font-semibold text-blue-700">
                        {getUserDisplayName(meeting)}
                      </span>
                    </div>
                    
                    {/* Expanded Meeting Details */}
                    {isMeetingExpanded(meeting.id) && (
                      <div className="mt-2 p-2 bg-white border border-green-300 rounded text-xs transition-all duration-200 ease-in-out">
                        <div className="space-y-1">
                          {meeting.meeting_description && (
                            <div className="text-gray-700">
                              <span className="font-medium">Description:</span> {meeting.meeting_description}
                            </div>
                          )}
                          <div className="text-gray-600">
                            <span className="font-medium">Duration:</span> {calculateDuration(meeting.start_time, meeting.end_time)}
                          </div>
                          <div className="text-gray-600">
                            <span className="font-medium">User:</span> 
                            <span className="ml-1 font-semibold text-blue-700">
                              {getUserDisplayName(meeting)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Expanded Day View - Now integrated into the cell */}
              {expanded && hasMeetings && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-blue-900 text-sm">
                      {format(day, 'EEEE, MMMM d, yyyy')} - {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}
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
                    {dayMeetings.map((meeting) => (
                      <div key={meeting.id} className="bg-white p-3 rounded border border-blue-200">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-semibold text-gray-900 text-sm">
                                {meeting.meeting_title}
                              </h5>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                onClick={() => toggleMeetingExpansion(meeting.id)}
                                title={isMeetingExpanded(meeting.id) ? 'Collapse meeting' : 'Expand meeting'}
                              >
                                {isMeetingExpanded(meeting.id) ? '−' : '+'}
                              </Button>
                            </div>
                            <div className="text-xs text-gray-600 space-y-1">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3 h-3 flex-shrink-0" />
                                <span>
                                  {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                                  <span className="ml-2 text-blue-600">
                                    ({calculateDuration(meeting.start_time, meeting.end_time)})
                                  </span>
                                </span>
                              </div>
                              {meeting.meeting_description && (
                                <div className="flex items-start gap-2">
                                  <span className="text-gray-500 flex-shrink-0">📝</span>
                                  <span className="text-gray-700 break-words">{meeting.meeting_description}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="text-gray-500">
                                  User: <span className="font-semibold text-blue-700">{getUserDisplayName(meeting)}</span>
                                </span>
                              </div>
                              
                              {/* Additional Meeting Details when Expanded */}
                              {isMeetingExpanded(meeting.id) && (
                                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded transition-all duration-200 ease-in-out">
                                  <div className="text-xs text-blue-800 space-y-1">
                                    <div>
                                      <span className="font-medium">Meeting ID:</span> {meeting.id}
                                    </div>
                                    <div>
                                      <span className="font-medium">Created:</span> {format(parseISO(meeting.meeting_date), 'MMM d, yyyy')}
                                    </div>
                                    <div>
                                      <span className="font-medium">Time Range:</span> {formatTime(meeting.start_time)} - {formatTime(meeting.end_time)}
                                    </div>
                                    <div>
                                      <span className="font-medium">User:</span> 
                                      <span className="ml-1 font-semibold text-blue-700">
                                        {getUserDisplayName(meeting)}
                                      </span>
                                    </div>
                                    {meeting.meeting_description && (
                                      <div>
                                        <span className="font-medium">Full Description:</span>
                                        <div className="mt-1 text-blue-700 bg-white p-2 rounded border">
                                          {meeting.meeting_description}
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
                              setDeleteTarget(meeting.id)
                              setShowDeleteDialog(true)
                            }}
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-6 px-2 text-xs flex-shrink-0 ml-2"
                            disabled={deleting}
                          >
                            {deleting && deleteTarget === meeting.id ? (
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
      return null // No header for single day view
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
            <div key={day.toISOString()} className="h-12 flex items-center justify-center font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
              {format(day, 'EEE')}
            </div>
          ))}
        </div>
      )
    }
    
    // Default month view
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    return (
      <div className="grid grid-cols-7 gap-0">
        {days.map(day => (
          <div key={day} className="h-12 flex items-center justify-center font-semibold text-gray-700 bg-gray-50 border-b border-gray-200">
            {day}
          </div>
        ))}
      </div>
    )
  }

  const getDayClassNames = (date: Date, expanded: boolean) => {
    let baseClasses = "min-h-32 p-2 border-r border-b border-gray-200 text-sm relative transition-all duration-300 ease-in-out"
    
    // Adjust height for single day view
    if (filterType === 'today') {
      baseClasses = "min-h-96 p-4 border border-gray-200 text-sm relative transition-all duration-300 ease-in-out"
    }
    
    // Adjust height when expanded
    if (expanded) {
      baseClasses = baseClasses.replace('min-h-32', 'min-h-96')
      if (filterType === 'today') {
        baseClasses = baseClasses.replace('min-h-96', 'min-h-[32rem]')
      }
    }
    
    const todayClasses = isToday(date) ? "bg-blue-50 font-semibold" : ""
    const otherMonthClasses = !isSameMonth(date, currentMonth) && filterType !== 'today' && filterType !== 'this-week' ? "text-gray-300 bg-gray-50" : ""
    
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
    // Reset to current month when switching to month views
    if (newFilterType === 'this-month' || newFilterType === 'all') {
      setCurrentMonth(new Date())
    }
    // Reset expanded day and meeting when changing filters
    setExpandedDay(null)
    setExpandedMeeting(null)
  }

  const toggleDayExpansion = (dateStr: string) => {
    if (expandedDay === dateStr) {
      setExpandedDay(null)
    } else {
      setExpandedDay(dateStr)
    }
  }

  const toggleMeetingExpansion = (meetingId: string) => {
    if (expandedMeeting === meetingId) {
      setExpandedMeeting(null)
    } else {
      setExpandedMeeting(meetingId)
    }
  }

  const isDayExpanded = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return expandedDay === dateStr
  }

  const isMeetingExpanded = (meetingId: string) => {
    return expandedMeeting === meetingId
  }

  const getUserDisplayName = (meeting: ConfirmedMeeting & { user?: { full_name: string } }) => {
    console.log('🔍 Debug: getUserDisplayName')
    console.log('  - Meeting ID:', meeting.id)
    console.log('  - Requester ID:', meeting.requester_id)
    console.log('  - User object:', meeting.user)
    console.log('  - User full_name:', meeting.user?.full_name)
    
    const result = meeting.user?.full_name || meeting.requester_id
    console.log('  - Final result:', result)
    return result
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
    const filtered = getFilteredMeetings()
    return filtered.length
  }

  const formatTime = (time: string) => {
    // Convert 24-hour format to 12-hour format for display
    if (time.includes(':')) {
      const [hours, minutes] = time.split(':').map(Number)
      const period = hours >= 12 ? 'PM' : 'AM'
      const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
    }
    return time
  }

  const calculateDuration = (startTime: string, endTime: string) => {
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

  const filteredMeetings = getFilteredMeetings()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading confirmed meetings...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {/* Header with Filters and Calendar Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">Confirmed Meetings Calendar</h3>
            <Badge variant="secondary" className="ml-2">
              {getFilterCount(filterType)} meetings
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllMeetings(!showAllMeetings)}
              className="flex items-center gap-2"
            >
              {showAllMeetings ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showAllMeetings ? 'Hide Details' : 'Show Details'}
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDeleteTarget('all')
                setShowDeleteDialog(true)
              }}
              className="flex items-center gap-2 text-red-500 hover:text-red-600"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Filter Options */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600 mr-2">Show:</span>
          
          <div className="flex gap-1">
            {(['today', 'this-week', 'this-month', 'all'] as FilterType[]).map((type) => (
              <Button
                key={type}
                variant={filterType === type ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange(type)}
                className="text-xs px-3 py-1 h-8"
              >
                {getFilterLabel(type)}
                <Badge variant="secondary" className="ml-1 text-xs">
                  {getFilterCount(type)}
                </Badge>
              </Button>
            ))}
          </div>
          
          {/* Help text for expandable days */}
          <div className="ml-4 text-xs text-gray-500 flex items-center gap-1">
            <span>💡</span>
            <span>Click + on days with meetings to expand • Click meeting titles or + buttons to expand meeting details</span>
          </div>
        </div>

        {/* Calendar Navigation */}
        {shouldShowMonthNavigation() && (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h2 className="text-xl font-semibold text-gray-900">
              {getCalendarTitle()}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {renderCalendarHeader()}
            <div className="grid grid-cols-7 auto-rows-auto gap-0 [&>*:nth-child(7n)]:border-r-0">
              {renderCalendarDays()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-4 gap-4 text-center">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-blue-600">{meetings.length}</div>
          <div className="text-sm text-blue-600">Total Meetings</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-green-600">
            {filterType === 'today' 
              ? meetings.filter(m => isSameDay(parseISO(m.meeting_date), new Date())).length
              : filterType === 'this-week'
              ? meetings.filter(m => {
                  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 })
                  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 })
                  return isWithinInterval(parseISO(m.meeting_date), { start: weekStart, end: weekEnd })
                }).length
              : meetings.filter(m => isSameMonth(parseISO(m.meeting_date), currentMonth)).length
            }
          </div>
          <div className="text-sm text-green-600">
            {filterType === 'today' ? 'Today' : 
             filterType === 'this-week' ? 'This Week' : 'This Month'}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-600">
            {meetings.filter(m => isSameDay(parseISO(m.meeting_date), new Date())).length}
          </div>
          <div className="text-sm text-purple-600">Today</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="text-2xl font-bold text-orange-600">
            {getFilterCount(filterType)}
          </div>
          <div className="text-sm text-orange-600">Filtered</div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteTarget === 'all' ? 'Delete All Meetings' : 'Delete Meeting'}
            </DialogTitle>
            <DialogDescription>
              {deleteTarget === 'all' 
                ? 'This will permanently delete ALL confirmed meetings. This action cannot be undone.'
                : 'This will permanently delete this meeting. This action cannot be undone.'
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (deleteTarget === 'all') {
                  handleDeleteAllMeetings()
                } else if (deleteTarget) {
                  handleDeleteMeeting(deleteTarget)
                }
              }}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : (deleteTarget === 'all' ? 'Delete All' : 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


