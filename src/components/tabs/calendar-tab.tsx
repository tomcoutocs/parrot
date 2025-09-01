'use client'

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, Clock, User, Globe, ChevronLeft, ChevronRight, Plus, Settings, AlertCircle } from 'lucide-react'
import { MeetingRequestModal } from '@/components/meeting-request-modal'
import { AdminMeetingRequests } from '@/components/admin-meeting-requests'
import { AdminConfirmedMeetingsCalendar } from '@/components/admin-confirmed-meetings-calendar'
import { isTimeSlotAvailable, formatDateLocal } from '@/lib/meeting-functions'
import { refreshManager } from '@/lib/refresh-utils'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO, addMinutes, startOfMonth, endOfMonth, eachDayOfInterval as eachDayOfMonth, addMonths, subMonths, isSameMonth, isToday, getDay, getDate } from 'date-fns'
import { supabase } from '@/lib/supabase'

interface MeetingDetails {
  title: string
  duration: number
  platform: string
  timezone: string
}

interface TimeSlot {
  time: string
  selected?: boolean
}

export default function CalendarTab() {
  const { data: session } = useSession()
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>('12h')
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails>({
    title: '30 Min Meeting',
    duration: 30,
    platform: 'Google Meet',
    timezone: 'America/New_York'
  })

  // Admin settings for time window
  const [adminSettings, setAdminSettings] = useState(() => {
    // Try to load saved settings from localStorage
    const savedSettings = localStorage.getItem('adminCalendarSettings')
    if (savedSettings) {
      try {
        return JSON.parse(savedSettings)
      } catch (error) {
        console.error('Failed to parse saved admin settings:', error)
      }
    }
    
    // Default settings if none saved
    return {
      startHour: 9,
      endHour: 17,
      slotDuration: 30,
      showAdminPanel: false,
      // Per-day availability settings
      dailySettings: {
        monday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        tuesday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        wednesday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        thursday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        friday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        saturday: { enabled: false, startHour: 9, endHour: 17, blocked: false },
        sunday: { enabled: false, startHour: 9, endHour: 17, blocked: false }
      }
    }
  })

  // Wrapper function to update admin settings and save to localStorage
  const updateAdminSettings = (updater: (prev: typeof adminSettings) => typeof adminSettings) => {
    setAdminSettings(prev => {
      const newSettings = updater(prev)
      // Save to localStorage
      localStorage.setItem('adminCalendarSettings', JSON.stringify(newSettings))
      return newSettings
    })
  }

  // Function to reset admin settings to defaults
  const resetAdminSettings = () => {
    const defaultSettings = {
      startHour: 9,
      endHour: 17,
      slotDuration: 30,
      showAdminPanel: false,
      dailySettings: {
        monday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        tuesday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        wednesday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        thursday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        friday: { enabled: true, startHour: 9, endHour: 17, blocked: false },
        saturday: { enabled: false, startHour: 9, endHour: 17, blocked: false },
        sunday: { enabled: false, startHour: 9, endHour: 17, blocked: false }
      }
    }
    updateAdminSettings(() => defaultSettings)
    // Refresh time slots after resetting
    setTimeout(() => refreshTimeSlots(), 100)
  }

  // Time slots state
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [error, setError] = useState<string>('')

  // Meeting request modal state
  const [showMeetingRequestModal, setShowMeetingRequestModal] = useState(false)
  const [showAdminMeetingRequests, setShowAdminMeetingRequests] = useState(false)
  const [adminCalendarRefreshTrigger, setAdminCalendarRefreshTrigger] = useState(0)
  const [globalRefreshTrigger, setGlobalRefreshTrigger] = useState(0)

  // Generate calendar days
  const startMonth = startOfMonth(currentMonth)
  const endMonth = endOfMonth(currentMonth)
  const startDate = startOfWeek(startMonth)
  const endDate = endOfWeek(endMonth)
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate })

  // Regenerate time slots when admin settings change
  useEffect(() => {
    // This will trigger a re-render when adminSettings change
  }, [adminSettings.startHour, adminSettings.endHour, adminSettings.slotDuration])

  // Generate time slots for selected date
  const generateTimeSlots = async (): Promise<TimeSlot[]> => {
    const slots: TimeSlot[] = []
    const { slotDuration, dailySettings } = adminSettings

    const dayName = format(selectedDate, 'EEEE').toLowerCase() as keyof typeof dailySettings
    const daySettings = dailySettings[dayName]

    if (daySettings.blocked || !daySettings.enabled) {
      return []
    }

    const { startHour, endHour } = daySettings

    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = new Date()
        time.setHours(hour, minute, 0, 0)

        const timeString = timeFormat === '12h'
          ? format(time, 'h:mma')
          : format(time, 'HH:mm')

        const formattedDate = formatDateLocal(selectedDate)
        
        const { available } = await isTimeSlotAvailable(
          formattedDate,
          timeString,
          slotDuration
        )

        // Only add available slots to the list
        if (available) {
          slots.push({
            time: timeString,
            selected: false
          })
        }
      }
    }
    return slots
  }

  // Initialize time slots and update when selected date or admin settings change
  useEffect(() => {
    const updateTimeSlots = async () => {
      const slots = await generateTimeSlots()
      setTimeSlots(slots)
    }
    updateTimeSlots()
  }, [selectedDate, adminSettings, globalRefreshTrigger])

  // Initial time slots generation
  useEffect(() => {
    const updateTimeSlots = async () => {
      const slots = await generateTimeSlots()
      setTimeSlots(slots)
    }
    updateTimeSlots()
  }, [])

  // Subscribe to global refresh events
  useEffect(() => {
    const unsubscribe = refreshManager.subscribe(() => {
      forceCalendarRefresh()
    })
    
    return unsubscribe
  }, [])


  const navigateMonth = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentMonth(subMonths(currentMonth, 1))
    } else {
      setCurrentMonth(addMonths(currentMonth, 1))
    }
  }

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    // Clear any previously selected time slot when date changes
    setTimeSlots(prev => prev.map(slot => ({ ...slot, selected: false })))
    setSelectedTime('')
    setError('')
    
    // Refresh time slots availability for the new date
    refreshTimeSlots()
  }

  // Function to refresh time slots availability (called after meetings are confirmed)
  const refreshTimeSlots = async () => {
    // Force a small delay to ensure database transaction is complete
    await new Promise(resolve => setTimeout(resolve, 100))
    
    const slots = await generateTimeSlots()
    setTimeSlots(slots)
  }

  // Force a complete calendar refresh (more aggressive)
  const forceCalendarRefresh = async () => {
    // Clear current time slots first
    setTimeSlots([])
    
    // Wait a moment for state to update
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Regenerate time slots
    const slots = await generateTimeSlots()
    setTimeSlots(slots)
    
    // Also trigger admin calendar refresh
    setAdminCalendarRefreshTrigger(prev => prev + 1)
    
    // Trigger global refresh
    setGlobalRefreshTrigger(prev => prev + 1)
  }

  // Global refresh function that can be called from anywhere
  const triggerGlobalRefresh = () => {
    setGlobalRefreshTrigger(prev => prev + 1)
  }

  const selectTimeSlot = (slotIndex: number) => {
    setTimeSlots(prev => prev.map((slot, index) => ({
      ...slot,
      selected: index === slotIndex
    })))
    // Set the selected time for the meeting request
    setSelectedTime(timeSlots[slotIndex]?.time || '')
  }

  const handleContinue = () => {
    if (!selectedTime) {
      setError('Please select a time slot')
      return
    }

    // Debug logging
    console.log('Session data:', session)
    console.log('User ID:', session?.user?.id)
    console.log('User role:', session?.user?.role)

    // Validate that we have a valid user session
    if (!session?.user?.id) {
      setError('You must be logged in to request a meeting')
      return
    }

    // Validate that the user ID is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(session.user.id)) {
      console.error('Invalid UUID format:', session.user.id)
      setError('Invalid user session. Please log in again.')
      return
    }

    console.log('Opening meeting request modal with valid session')
    setShowMeetingRequestModal(true)
  }

  const isDateInCurrentMonth = (date: Date) => {
    return isSameMonth(date, currentMonth)
  }

  const isDateAvailable = (date: Date) => {
    const dayName = format(date, 'EEEE').toLowerCase() as keyof typeof adminSettings.dailySettings
    const daySettings = adminSettings.dailySettings[dayName]
    
    // Date is available if it's not blocked and enabled
    return !daySettings.blocked && daySettings.enabled
  }

  const getDateClasses = (date: Date) => {
    let classes = 'w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium cursor-pointer transition-colors'
    
    if (isSameDay(date, selectedDate)) {
      classes += ' bg-gray-800 text-white relative'
    } else if (isDateAvailable(date)) {
      classes += ' bg-gray-100 text-gray-900 hover:bg-gray-200'
    } else {
      classes += ' bg-red-100 text-red-600 cursor-not-allowed'
    }
    
    if (!isDateInCurrentMonth(date)) {
      classes += ' opacity-50'
    }
    
    return classes
  }

  const getMonthLabel = (date: Date) => {
    if (!isDateInCurrentMonth(date)) {
      const month = format(date, 'MMM')
      return month
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Schedule Meeting</h1>
            <p className="text-gray-600">Choose a date and time that works for you</p>
          </div>
          {session?.user?.role === 'admin' && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => updateAdminSettings(prev => ({ ...prev, showAdminPanel: !prev.showAdminPanel }))}
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Admin Settings
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAdminMeetingRequests(prev => !prev)}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                Meeting Requests
              </Button>
            </div>
          )}
        </div>

        {/* Admin Settings Panel */}
        {adminSettings.showAdminPanel && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Meeting Availability Settings</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => updateAdminSettings(prev => ({ ...prev, showAdminPanel: false }))}
                >
                  ×
                </Button>
              </div>
              
              {/* Global Settings */}
              <div className="mb-8">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Global Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Slot Duration */}
                  <div>
                    <Label htmlFor="slotDuration" className="text-sm font-medium text-gray-700 mb-2 block">
                      Time Slot Duration
                    </Label>
                    <Select
                      value={adminSettings.slotDuration.toString()}
                      onValueChange={(value) => updateAdminSettings(prev => ({ 
                        ...prev, 
                        slotDuration: parseInt(value) 
                      }))}
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
                </div>
              </div>

              {/* Daily Settings */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Availability</h3>
                <div className="space-y-4">
                  {Object.entries(adminSettings.dailySettings).map(([day, settings]) => (
                    <div key={day} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={`${day}-enabled`}
                            checked={settings.enabled}
                            onCheckedChange={(checked) => updateAdminSettings(prev => ({
                              ...prev,
                              dailySettings: {
                                ...prev.dailySettings,
                                [day]: {
                                  ...prev.dailySettings[day as keyof typeof prev.dailySettings],
                                  enabled: !!checked
                                }
                              }
                            }))}
                          />
                          <Label htmlFor={`${day}-enabled`} className="text-sm font-medium text-gray-900 capitalize">
                            {day}
                          </Label>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`${day}-blocked`}
                            checked={settings.blocked}
                            onCheckedChange={(checked) => updateAdminSettings(prev => ({
                              ...prev,
                              dailySettings: {
                                ...prev.dailySettings,
                                [day]: {
                                  ...prev.dailySettings[day as keyof typeof prev.dailySettings],
                                  blocked: !!checked
                                }
                              }
                            }))}
                          />
                          <Label htmlFor={`${day}-blocked`} className="text-sm text-gray-600">
                            Block Day
                          </Label>
                        </div>
                      </div>

                      {settings.enabled && !settings.blocked && (
                        <div className="grid grid-cols-2 gap-4 ml-6">
                          {/* Start Time */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">Start Time</Label>
                            <Select
                              value={settings.startHour.toString()}
                              onValueChange={(value) => updateAdminSettings(prev => ({
                                ...prev,
                                dailySettings: {
                                  ...prev.dailySettings,
                                  [day]: {
                                    ...prev.dailySettings[day as keyof typeof prev.dailySettings],
                                    startHour: parseInt(value)
                                  }
                                }
                              }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {format(new Date().setHours(i), 'h:00 a')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* End Time */}
                          <div>
                            <Label className="text-xs text-gray-600 mb-1 block">End Time</Label>
                            <Select
                              value={settings.endHour.toString()}
                              onValueChange={(value) => updateAdminSettings(prev => ({
                                ...prev,
                                dailySettings: {
                                  ...prev.dailySettings,
                                  [day]: {
                                    ...prev.dailySettings[day as keyof typeof prev.dailySettings],
                                    endHour: parseInt(value)
                                  }
                                }
                              }))}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Array.from({ length: 24 }, (_, i) => (
                                  <SelectItem key={i} value={i.toString()}>
                                    {format(new Date().setHours(i), 'h:00 a')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Status Display */}
                      <div className="mt-3 ml-6">
                        {settings.blocked ? (
                          <Badge variant="destructive" className="text-xs">Day Blocked</Badge>
                        ) : !settings.enabled ? (
                          <Badge variant="secondary" className="text-xs">Disabled</Badge>
                        ) : (
                          <Badge variant="default" className="text-xs">
                            Available {format(new Date().setHours(settings.startHour), 'h:00 a')} - {format(new Date().setHours(settings.endHour), 'h:00 a')}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAdminSettings}
                >
                  Reset to Default
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => updateAdminSettings(prev => ({
                    ...prev,
                    dailySettings: {
                      monday: { enabled: false, startHour: 9, endHour: 17, blocked: true },
                      tuesday: { enabled: false, startHour: 9, endHour: 17, blocked: true },
                      wednesday: { enabled: false, startHour: 9, endHour: 17, blocked: true },
                      thursday: { enabled: false, startHour: 9, endHour: 17, blocked: true },
                      friday: { enabled: false, startHour: 9, endHour: 17, blocked: true },
                      saturday: { enabled: false, startHour: 9, endHour: 17, blocked: false },
                      sunday: { enabled: false, startHour: 9, endHour: 17, blocked: true }
                    }
                  }))}
                >
                  Block All Days
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Calendar Interface */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - Meeting Details */}
          <div className="col-span-3">
            <Card className="h-fit">
              <CardContent className="p-6">
                {/* Logo and Brand */}
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">P</span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">Parrot</span>
                </div>

                {/* Meeting Title */}
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-gray-900 mb-2">{meetingDetails.title}</h2>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Clock className="w-4 h-4" />
                    <span>{meetingDetails.duration}m</span>
                  </div>
                </div>

                {/* Meeting Platform */}
                <div className="mb-4">
                  <div className="flex items-center gap-2 text-gray-600">
                    <div className="w-6 h-6 bg-gradient-to-br from-green-400 via-blue-500 to-red-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">G</span>
                    </div>
                    <span>{meetingDetails.platform}</span>
                  </div>
                </div>

                {/* Timezone */}
                <div className="flex items-center gap-2 text-gray-600">
                  <Globe className="w-4 h-4" />
                  <span>{meetingDetails.timezone}</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Middle Panel - Calendar */}
          <div className="col-span-5">
            <Card>
              <CardContent className="p-6">
                {/* Month Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigateMonth('prev')}
                    className="p-2 hover:bg-gray-100"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {format(currentMonth, 'MMMM yyyy')}
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

                {/* Days of Week */}
                <div className="grid grid-cols-7 gap-1 mb-4">
                  {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((date, index) => (
                    <div key={index} className="relative">
                      {/* Month Label for first day of month */}
                      {getDate(date) === 1 && (
                        <div className="absolute -top-2 left-1 text-xs font-medium text-gray-400">
                          {getMonthLabel(date)}
                        </div>
                      )}
                      
                      <div
                        className={getDateClasses(date)}
                        onClick={() => handleDateSelect(date)}
                      >
                        {getDate(date)}
                        {/* Selected date indicator */}
                        {isSameDay(date, selectedDate) && (
                          <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Time Slots */}
          <div className="col-span-4">
            <Card>
              <CardContent className="p-6">
                {/* Selected Date Summary */}
                <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                      </p>
                      <p className="text-sm text-gray-600">
                        {isDateAvailable(selectedDate) ? 'Available for meetings' : 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Header with Date and Time Format Toggle */}
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {format(selectedDate, 'EEE d')}
                  </h3>
                  <div className="flex items-center gap-2">
                    {session?.user?.role === 'admin' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshTimeSlots}
                        className="text-xs px-3 py-1 h-8"
                      >
                        Refresh
                      </Button>
                    )}
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      <Button
                        variant={timeFormat === '12h' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFormat('12h')}
                        className="text-xs px-3 py-1 h-8"
                      >
                        12h
                      </Button>
                      <Button
                        variant={timeFormat === '24h' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setTimeFormat('24h')}
                        className="text-xs px-3 py-1 h-8"
                      >
                        24h
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Time Slots */}
                <div className="space-y-2">
                  {timeSlots.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No available time slots for this date</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This day may be blocked or disabled in admin settings
                      </p>
                    </div>
                  ) : (
                    timeSlots.map((slot, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          slot.selected
                            ? 'border-blue-600 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                        onClick={() => selectTimeSlot(index)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            slot.selected 
                              ? 'bg-blue-600' 
                              : 'bg-green-500'
                          }`} />
                          <span className="font-medium">{slot.time}</span>
                          {slot.selected && (
                            <Badge variant="default" className="ml-auto text-xs">
                              Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 text-red-700">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Continue Button */}
                <Button 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={!timeSlots.some(slot => slot.selected)}
                  onClick={handleContinue}
                >
                  {timeSlots.some(slot => slot.selected) ? (
                    <>
                      Continue with {format(selectedDate, 'MMM d, yyyy')} at{' '}
                      {timeSlots.find(slot => slot.selected)?.time}
                    </>
                  ) : (
                    'Select a time to continue'
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Additional Options */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Settings className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Meeting Settings</h3>
              </div>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox id="buffer" />
                  <Label htmlFor="buffer" className="text-sm">Add buffer time</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="reminder" />
                  <Label htmlFor="reminder" className="text-sm">Send reminder</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="followup" />
                  <Label htmlFor="followup" className="text-sm">Follow-up email</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Attendees</h3>
              </div>
              <div className="space-y-3">
                <Input placeholder="Add attendee email" />
                <Button variant="outline" size="sm" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Attendee
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Recurring</h3>
              </div>
              <div className="space-y-3">
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="No repeat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
                <div className="text-sm text-gray-500">
                  Set up recurring meetings for consistent scheduling
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Meeting Request Modal */}
        {showMeetingRequestModal && (
          <MeetingRequestModal
            isOpen={showMeetingRequestModal}
            onClose={() => setShowMeetingRequestModal(false)}
            selectedDate={selectedDate}
            selectedTime={timeSlots.find(slot => slot.selected)?.time || ''}
            requesterId={session?.user?.id || ''}
            session={session}
          />
        )}

        {/* Admin Meeting Requests Panel */}
        {showAdminMeetingRequests && session?.user?.role === 'admin' && (
          <div className="mt-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Meeting Requests</h2>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdminMeetingRequests(false)}
                    >
                      ×
                    </Button>
                  </div>
                </div>
                <AdminMeetingRequests 
                  userId={session.user.id} 
                  slotDuration={adminSettings.slotDuration}
                  onMeetingConfirmed={forceCalendarRefresh}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Admin Confirmed Meetings Calendar */}
        {session?.user?.role === 'admin' && (
          <div className="mt-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Confirmed Meetings Calendar</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAdminMeetingRequests(!showAdminMeetingRequests)}
                  >
                    {showAdminMeetingRequests ? 'Hide Requests' : 'Show Requests'}
                  </Button>
                </div>
                <AdminConfirmedMeetingsCalendar 
                  refreshTrigger={adminCalendarRefreshTrigger} 
                />
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
} 