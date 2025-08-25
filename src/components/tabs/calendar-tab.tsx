"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Calendar, Clock, User, CheckCircle, XCircle, AlertCircle, Plus, CalendarDays, Users, Clock3, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addMinutes, startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfMonth, addMonths, subMonths, isSameMonth, isToday } from 'date-fns'

interface AdminAvailability {
  id: string
  admin_id: string
  start_time: string
  end_time: string
  is_available: boolean
  reason?: string
  created_at: string
}

interface BookingRequest {
  id: string
  user_id: string
  admin_id: string
  requested_start_time: string
  requested_end_time: string
  duration_minutes: number
  title: string
  description?: string
  status: 'pending' | 'approved' | 'rejected' | 'cancelled'
  admin_notes?: string
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

interface CalendarEvent {
  id: string
  booking_request_id: string
  user_id: string
  admin_id: string
  start_time: string
  end_time: string
  title: string
  description?: string
  duration_minutes: number
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  meeting_link?: string
  notes?: string
  created_at: string
  user?: {
    full_name: string
    email: string
  }
}

interface User {
  id: string
  full_name: string
  email: string
  role: string
}

export default function CalendarTab() {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [adminAvailability, setAdminAvailability] = useState<AdminAvailability[]>([])
  const [bookingRequests, setBookingRequests] = useState<BookingRequest[]>([])
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal states
  const [showBlockTimeModal, setShowBlockTimeModal] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)

  // Form states
  const [blockTimeForm, setBlockTimeForm] = useState({
    start_time: '',
    end_time: '',
    reason: ''
  })

  const [bookingForm, setBookingForm] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    selected_time: ''
  })

  const [requestForm, setRequestForm] = useState({
    title: '',
    description: '',
    duration_minutes: 30,
    selected_date: '',
    selected_time: '',
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_count: 4
  })

  const isAdmin = session?.user.role === 'admin'
  const isUser = session?.user.role === 'user'

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const fetchData = async () => {
    if (!supabase) return
    
    try {
      setLoading(true)
      setError(null)

      // Fetch admin availability for the entire month
      const { data: availabilityData, error: availabilityError } = await supabase
        .from('admin_availability')
        .select('*')
        .gte('start_time', startOfMonth(currentDate).toISOString())
        .lte('end_time', endOfMonth(currentDate).toISOString())

      if (availabilityError) throw availabilityError
      setAdminAvailability(availabilityData || [])

      // Fetch booking requests for the entire month
      let requestsQuery = supabase
        .from('booking_requests')
        .select(`
          *,
          user:users!booking_requests_user_id_fkey(full_name, email)
        `)
        .gte('requested_start_time', startOfMonth(currentDate).toISOString())
        .lte('requested_end_time', endOfMonth(currentDate).toISOString())

      // Users can only see their own requests
      if (!isAdmin) {
        requestsQuery = requestsQuery.eq('user_id', session?.user.id)
      }

      const { data: requestsData, error: requestsError } = await requestsQuery
      if (requestsError) throw requestsError
      setBookingRequests(requestsData || [])

      // Fetch calendar events for the entire month
      let eventsQuery = supabase
        .from('calendar_events')
        .select(`
          *,
          user:users!calendar_events_user_id_fkey(full_name, email)
        `)
        .gte('start_time', startOfMonth(currentDate).toISOString())
        .lte('end_time', endOfMonth(currentDate).toISOString())

      // Users can only see their own approved events
      if (!isAdmin) {
        eventsQuery = eventsQuery.eq('user_id', session?.user.id)
      }

      const { data: eventsData, error: eventsError } = await eventsQuery
      if (eventsError) throw eventsError
      setCalendarEvents(eventsData || [])

      // Fetch users (for admin)
      if (isAdmin) {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email, role')
          .eq('role', 'user')

        if (usersError) throw usersError
        setUsers(usersData || [])
      }
    } catch (err) {
      console.error('Error fetching calendar data:', err)
      setError('Failed to load calendar data')
    } finally {
      setLoading(false)
    }
  }

  const handleBlockTime = async () => {
    if (!supabase) return
    
    try {
      const { error } = await supabase
        .from('admin_availability')
        .insert({
          admin_id: session?.user.id,
          start_time: blockTimeForm.start_time,
          end_time: blockTimeForm.end_time,
          is_available: false,
          reason: blockTimeForm.reason
        })

      if (error) throw error

      setShowBlockTimeModal(false)
      setBlockTimeForm({ start_time: '', end_time: '', reason: '' })
      fetchData()
    } catch (err) {
      console.error('Error blocking time:', err)
      setError('Failed to block time slot')
    }
  }

  const handleCreateBooking = async () => {
    if (!supabase) return
    
    try {
      const startTime = new Date(bookingForm.selected_time)
      const endTime = addMinutes(startTime, bookingForm.duration_minutes)

      const { error } = await supabase
        .from('calendar_events')
        .insert({
          user_id: bookingForm.title.includes('Demo') ? users[0]?.id : session?.user.id,
          admin_id: session?.user.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          title: bookingForm.title,
          description: bookingForm.description,
          duration_minutes: bookingForm.duration_minutes,
          status: 'scheduled'
        })

      if (error) throw error

      setShowBookingModal(false)
      setBookingForm({ title: '', description: '', duration_minutes: 30, selected_time: '' })
      fetchData()
    } catch (err) {
      console.error('Error creating booking:', err)
      setError('Failed to create booking')
    }
  }

  const handleRequestBooking = async () => {
    if (!supabase) return
    
    try {
      // Check if user is authenticated
      if (!session?.user?.id) {
        setError('You must be logged in to request a booking')
        return
      }

      // Verify the session is still valid (using custom auth system)
      if (!session?.user?.id) {
        setError('Your session has expired. Please log in again.')
        return
      }

      console.log('Session user ID:', session?.user.id)

      // Validate form data
      if (!requestForm.title.trim()) {
        setError('Please enter a meeting title')
        return
      }
      if (!requestForm.selected_date || !requestForm.selected_time) {
        setError('Please select both date and time')
        return
      }

             const startTime = new Date(`${requestForm.selected_date}T${requestForm.selected_time}`)
       const endTime = addMinutes(startTime, requestForm.duration_minutes)

       // Check if the selected time is in the future
       if (startTime <= new Date()) {
         setError('Please select a future date and time')
         return
       }

       // Handle recurring meetings
       const meetings = []
       if (requestForm.is_recurring) {
         for (let i = 0; i < requestForm.recurrence_count; i++) {
           let meetingStartTime
           let meetingEndTime
           
           switch (requestForm.recurrence_type) {
             case 'weekly':
               meetingStartTime = addDays(startTime, i * 7)
               meetingEndTime = addDays(endTime, i * 7)
               break
             case 'biweekly':
               meetingStartTime = addDays(startTime, i * 14)
               meetingEndTime = addDays(endTime, i * 14)
               break
             case 'monthly':
               meetingStartTime = addMonths(startTime, i)
               meetingEndTime = addMonths(endTime, i)
               break
             default:
               meetingStartTime = startTime
               meetingEndTime = endTime
           }
           
           meetings.push({
             start_time: meetingStartTime,
             end_time: meetingEndTime
           })
         }
       } else {
         meetings.push({
           start_time: startTime,
           end_time: endTime
         })
       }

      // Debug: Log current user info
      console.log('Current user ID:', session?.user.id)
      console.log('Current user role:', session?.user.role)

      // For users, we need to find an admin to book with
      let adminId = ''
      if (isAdmin) {
        // If admin is creating booking for someone else, use their own ID
        adminId = session?.user.id
      } else {
        // For users, find the first available admin
        const { data: adminUsers, error: adminError } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'admin')
          .limit(1)

        if (adminError) {
          console.error('Error fetching admin users:', adminError)
          throw adminError
        }
        if (!adminUsers || adminUsers.length === 0) {
          setError('No admin available for booking')
          return
        }
        adminId = adminUsers[0].id
              console.log('Found admin ID:', adminId)
    }

         // Insert all meetings
     const bookingRequests = meetings.map(meeting => ({
       user_id: session.user.id,
       admin_id: adminId,
       requested_start_time: meeting.start_time.toISOString(),
       requested_end_time: meeting.end_time.toISOString(),
       title: requestForm.title,
       description: requestForm.description,
       duration_minutes: requestForm.duration_minutes,
       status: 'pending'
     }))

     console.log('Attempting to insert booking requests:', bookingRequests)

     const { error } = await supabase
       .from('booking_requests')
       .insert(bookingRequests)

      if (error) {
        console.error('Supabase error details:', error)
        throw error
      }

      setShowRequestModal(false)
             setRequestForm({ title: '', description: '', duration_minutes: 30, selected_date: '', selected_time: '', is_recurring: false, recurrence_type: 'weekly', recurrence_count: 4 })
      setError(null) // Clear any previous errors
      fetchData()
    } catch (err) {
      console.error('Error requesting booking:', err)
      setError('Failed to request booking')
    }
  }

  const handleApproveRequest = async (requestId: string) => {
    if (!supabase) return
    
    try {
      const { error } = await supabase.rpc('approve_booking_request', {
        p_booking_request_id: requestId
      })

      if (error) throw error
      fetchData()
    } catch (err) {
      console.error('Error approving request:', err)
      setError('Failed to approve booking request')
    }
  }

  const handleRejectRequest = async (requestId: string) => {
    if (!supabase) return
    
    try {
      const { error } = await supabase.rpc('reject_booking_request', {
        p_booking_request_id: requestId
      })

      if (error) throw error
      fetchData()
    } catch (err) {
      console.error('Error rejecting request:', err)
      setError('Failed to reject booking request')
    }
  }

  const getMonthDays = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const monthStart = startOfWeek(start)
    const monthEnd = endOfWeek(end)
    return eachDayOfInterval({ start: monthStart, end: monthEnd })
  }

  const getEventsForDate = (date: Date) => {
    const dayStart = new Date(date.setHours(0, 0, 0, 0))
    const dayEnd = new Date(date.setHours(23, 59, 59, 999))

    // For users, only show their own events and requests
    // For admins, show all events and requests
    const events = calendarEvents.filter(event => {
      const eventDate = new Date(event.start_time)
      const isSameDay = eventDate >= dayStart && eventDate <= dayEnd
      
      if (isAdmin) {
        return isSameDay
      } else {
        // Users can only see their own approved events
        return isSameDay && event.user_id === session?.user.id
      }
    })

    const requests = bookingRequests.filter(request => {
      const requestDate = new Date(request.requested_start_time)
      const isSameDay = requestDate >= dayStart && requestDate <= dayEnd
      
      if (isAdmin) {
        return isSameDay
      } else {
        // Users can only see their own requests
        return isSameDay && request.user_id === session?.user.id
      }
    })

    // For blocked times, users only see that time is blocked (no details)
    // Admins can see all blocked times with details
    const blocked = adminAvailability.filter(block => {
      const blockDate = new Date(block.start_time)
      return blockDate >= dayStart && blockDate <= dayEnd && !block.is_available
    })

    return { events, requests, blocked }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'approved': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'no_show': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Calendar</h2>
          <p className="text-gray-600">Manage your schedule and appointments</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous Month
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button
            variant="outline"
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
          >
            Next Month
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
          {isAdmin && (
            <Dialog open={showBlockTimeModal} onOpenChange={setShowBlockTimeModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Block Time
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Block Time Slot</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="start_time">Start Time</Label>
                    <Input
                      id="start_time"
                      type="datetime-local"
                      value={blockTimeForm.start_time}
                      onChange={(e) => setBlockTimeForm({ ...blockTimeForm, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End Time</Label>
                    <Input
                      id="end_time"
                      type="datetime-local"
                      value={blockTimeForm.end_time}
                      onChange={(e) => setBlockTimeForm({ ...blockTimeForm, end_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Input
                      id="reason"
                      value={blockTimeForm.reason}
                      onChange={(e) => setBlockTimeForm({ ...blockTimeForm, reason: e.target.value })}
                      placeholder="e.g., Team meeting, Lunch break"
                    />
                  </div>
                  <Button onClick={handleBlockTime} className="w-full">
                    Block Time
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {isUser && (
            <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Request Booking
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Request Booking</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={requestForm.title}
                      onChange={(e) => setRequestForm({ ...requestForm, title: e.target.value })}
                      placeholder="Meeting title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={requestForm.description}
                      onChange={(e) => setRequestForm({ ...requestForm, description: e.target.value })}
                      placeholder="Meeting description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration</Label>
                    <Select
                      value={requestForm.duration_minutes.toString()}
                      onValueChange={(value) => setRequestForm({ ...requestForm, duration_minutes: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="45">45 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={requestForm.selected_date}
                      onChange={(e) => setRequestForm({ ...requestForm, selected_date: e.target.value })}
                    />
                  </div>
                                     <div>
                     <Label htmlFor="time">Time</Label>
                     <Input
                       id="time"
                       type="time"
                       value={requestForm.selected_time}
                       onChange={(e) => setRequestForm({ ...requestForm, selected_time: e.target.value })}
                     />
                   </div>
                   
                   {/* Recurring Meeting Options */}
                   <div className="space-y-4">
                     <div className="flex items-center space-x-2">
                       <input
                         type="checkbox"
                         id="is_recurring"
                         checked={requestForm.is_recurring}
                         onChange={(e) => setRequestForm({ ...requestForm, is_recurring: e.target.checked })}
                         className="rounded"
                       />
                       <Label htmlFor="is_recurring">Make this a recurring meeting</Label>
                     </div>
                     
                     {requestForm.is_recurring && (
                       <div className="space-y-4 pl-6">
                         <div>
                           <Label htmlFor="recurrence_type">Repeat every</Label>
                           <Select
                             value={requestForm.recurrence_type}
                             onValueChange={(value) => setRequestForm({ ...requestForm, recurrence_type: value })}
                           >
                             <SelectTrigger>
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="weekly">Week</SelectItem>
                               <SelectItem value="biweekly">2 Weeks</SelectItem>
                               <SelectItem value="monthly">Month</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                         
                         <div>
                           <Label htmlFor="recurrence_count">Number of meetings</Label>
                           <Select
                             value={requestForm.recurrence_count.toString()}
                             onValueChange={(value) => setRequestForm({ ...requestForm, recurrence_count: parseInt(value) })}
                           >
                             <SelectTrigger>
                               <SelectValue />
                             </SelectTrigger>
                             <SelectContent>
                               <SelectItem value="2">2 meetings</SelectItem>
                               <SelectItem value="3">3 meetings</SelectItem>
                               <SelectItem value="4">4 meetings</SelectItem>
                               <SelectItem value="5">5 meetings</SelectItem>
                               <SelectItem value="6">6 meetings</SelectItem>
                               <SelectItem value="8">8 meetings</SelectItem>
                               <SelectItem value="10">10 meetings</SelectItem>
                               <SelectItem value="12">12 meetings</SelectItem>
                             </SelectContent>
                           </Select>
                         </div>
                       </div>
                     )}
                   </div>
                   
                   <Button onClick={handleRequestBooking} className="w-full">
                     Request Booking{requestForm.is_recurring ? ` (${requestForm.recurrence_count} meetings)` : ''}
                   </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Month Title */}
      <div className="text-center">
        <h3 className="text-xl font-semibold text-gray-900">
          {format(currentDate, 'MMMM yyyy')}
        </h3>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-semibold text-gray-700 py-2 text-sm">
            {day}
          </div>
        ))}

                 {/* Day Content */}
         {getMonthDays().map((day) => {
           const { events, requests, blocked } = getEventsForDate(day)
           const isCurrentMonth = isSameMonth(day, currentDate)
           const isCurrentDay = isToday(day)
           const isSelectedDay = selectedDate && isSameDay(day, selectedDate)
           
           return (
             <Card 
               key={day.toISOString()} 
               className={`min-h-24 cursor-pointer transition-all ${
                 !isCurrentMonth ? 'bg-gray-50 opacity-50' : 'hover:shadow-md'
               } ${
                 isSelectedDay ? 'ring-2 ring-blue-500 bg-blue-50' : ''
               }`}
               onClick={() => setSelectedDate(day)}
             >
               <CardContent className="p-2">
                 <div className={`text-sm font-medium mb-1 ${
                   isSelectedDay ? 'text-blue-600 font-bold' : 
                   isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                 }`}>
                   {format(day, 'd')}
                 </div>
                <div className="space-y-1">
                  {/* Confirmed Events */}
                  {events.slice(0, 2).map((event) => (
                    <div
                      key={event.id}
                      className="p-1 bg-blue-100 rounded text-xs cursor-pointer hover:bg-blue-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        setShowEventModal(true)
                      }}
                    >
                      <div className="font-medium text-blue-900 truncate">{event.title}</div>
                      <div className="text-blue-700 text-xs">
                        {format(new Date(event.start_time), 'HH:mm')}
                      </div>
                    </div>
                  ))}

                  {/* Pending Requests */}
                  {requests.slice(0, 1).map((request) => (
                    <div
                      key={request.id}
                      className="p-1 bg-yellow-100 rounded text-xs cursor-pointer hover:bg-yellow-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="font-medium text-yellow-900 truncate">{request.title}</div>
                      <div className="text-yellow-700 text-xs">
                        {format(new Date(request.requested_start_time), 'HH:mm')}
                      </div>
                    </div>
                  ))}

                                     {/* Blocked Times */}
                   {blocked.slice(0, 1).map((block) => (
                     <div
                       key={block.id}
                       className="p-1 bg-red-100 rounded text-xs"
                       onClick={(e) => e.stopPropagation()}
                     >
                       <div className="font-medium text-red-900 truncate">
                         {isAdmin ? 'Blocked' : 'Unavailable'}
                       </div>
                       {isAdmin && (
                         <div className="text-red-700 text-xs">
                           {format(new Date(block.start_time), 'HH:mm')}
                         </div>
                       )}
                     </div>
                   ))}

                  {/* Show more indicator if there are more events */}
                  {(events.length + requests.length + blocked.length) > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{(events.length + requests.length + blocked.length) - 3} more
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Events for {format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedDate(null)}>
                Close
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getEventsForDate(selectedDate).events.map((event) => (
                <div key={event.id} className="p-3 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900">{event.title}</h4>
                  <p className="text-sm text-blue-700">{event.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-blue-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(event.start_time), 'HH:mm')} - {format(new Date(event.end_time), 'HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {event.user?.full_name}
                    </span>
                  </div>
                </div>
              ))}
              
              {getEventsForDate(selectedDate).requests.map((request) => (
                <div key={request.id} className="p-3 bg-yellow-50 rounded-lg">
                  <h4 className="font-medium text-yellow-900">{request.title}</h4>
                  <p className="text-sm text-yellow-700">{request.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm text-yellow-600">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {format(new Date(request.requested_start_time), 'HH:mm')} - {format(new Date(request.requested_end_time), 'HH:mm')}
                    </span>
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {request.user?.full_name}
                    </span>
                    <Badge className={getStatusColor(request.status)} variant="secondary">
                      {request.status}
                    </Badge>
                  </div>
                </div>
              ))}
              
                             {getEventsForDate(selectedDate).blocked.map((block) => (
                 <div key={block.id} className="p-3 bg-red-50 rounded-lg">
                   <h4 className="font-medium text-red-900">
                     {isAdmin ? 'Blocked Time' : 'Unavailable Time'}
                   </h4>
                   {isAdmin && block.reason && (
                     <p className="text-sm text-red-700">{block.reason}</p>
                   )}
                   <div className="flex items-center gap-4 mt-2 text-sm text-red-600">
                     <span className="flex items-center gap-1">
                       <Clock className="h-4 w-4" />
                       {format(new Date(block.start_time), 'HH:mm')} - {format(new Date(block.end_time), 'HH:mm')}
                     </span>
                   </div>
                 </div>
               ))}
              
              {getEventsForDate(selectedDate).events.length === 0 && 
               getEventsForDate(selectedDate).requests.length === 0 && 
               getEventsForDate(selectedDate).blocked.length === 0 && (
                <div className="text-center text-gray-500 py-8">
                  No events scheduled for this day
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Booking Requests Section (Admin Only) */}
      {isAdmin && bookingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Pending Booking Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookingRequests.filter(req => req.status === 'pending').map((request) => (
                <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">{request.title}</h4>
                    <p className="text-sm text-gray-600">{request.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {request.user?.full_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(request.requested_start_time), 'MMM d, yyyy')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {format(new Date(request.requested_start_time), 'HH:mm')} - {format(new Date(request.requested_end_time), 'HH:mm')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock3 className="h-4 w-4" />
                        {request.duration_minutes} min
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleApproveRequest(request.id)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

             {/* Statistics Cards - Admin Only */}
       {isAdmin && (
         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card>
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-gray-600">Total Events</p>
                   <p className="text-2xl font-bold text-gray-900">{calendarEvents.length}</p>
                 </div>
                 <Calendar className="h-8 w-8 text-blue-600" />
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-gray-600">Pending Requests</p>
                   <p className="text-2xl font-bold text-gray-900">
                     {bookingRequests.filter(req => req.status === 'pending').length}
                   </p>
                 </div>
                 <Clock className="h-8 w-8 text-yellow-600" />
               </div>
             </CardContent>
           </Card>

           <Card>
             <CardContent className="p-6">
               <div className="flex items-center justify-between">
                 <div>
                   <p className="text-sm font-medium text-gray-600">Blocked Time Slots</p>
                   <p className="text-2xl font-bold text-gray-900">
                     {adminAvailability.filter(block => !block.is_available).length}
                   </p>
                 </div>
                 <XCircle className="h-8 w-8 text-red-600" />
               </div>
             </CardContent>
           </Card>
         </div>
       )}
    </div>
  )
} 