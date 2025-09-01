import { supabase } from './supabase'
import { MeetingRequest, ConfirmedMeeting } from './supabase'

// Define a proper error type for database operations
type DatabaseError = Error | { message: string; code?: string; details?: string } | null | unknown

// Define update data type for meeting requests
type MeetingRequestUpdateData = {
  status: 'approved' | 'denied' | 'cancelled'
  admin_notes?: string
}

// Unified time conversion utility - SIMPLIFIED VERSION
const convertTo24Hour = (timeString: string): string => {
  // Handle any AM/PM format (case insensitive)
  if (timeString.toLowerCase().includes('am') || timeString.toLowerCase().includes('pm')) {
    // Remove any spaces and convert to lowercase for consistent processing
    const cleanTime = timeString.replace(/\s/g, '').toLowerCase()
    
    // Find the colon position
    const colonIndex = cleanTime.indexOf(':')
    if (colonIndex === -1) {
      return timeString
    }
    
    // Find the AM/PM position
    const amIndex = cleanTime.indexOf('am')
    const pmIndex = cleanTime.indexOf('pm')
    const periodIndex = amIndex !== -1 ? amIndex : pmIndex
    
    if (periodIndex === -1) {
      return timeString
    }
    
    // Extract hours, minutes, and period
    const hours = cleanTime.substring(0, colonIndex)
    const minutes = cleanTime.substring(colonIndex + 1, periodIndex)
    const period = cleanTime.substring(periodIndex, periodIndex + 2)
    
    // Convert to numbers
    const hourNum = parseInt(hours)
    const minuteNum = parseInt(minutes)
    
    if (isNaN(hourNum) || isNaN(minuteNum)) {
      return timeString
    }
    
    let finalHour = hourNum
    
    // Handle PM conversion
    if (period === 'pm') {
      if (hourNum !== 12) {
        finalHour = hourNum + 12
      }
    }
    // Handle AM conversion
    else if (period === 'am') {
      if (hourNum === 12) {
        finalHour = 0
      }
    }
    
    // Format result
    const result = `${finalHour.toString().padStart(2, '0')}:${minuteNum.toString().padStart(2, '0')}`
    return result
  }
  
  // Already 24-hour format
  return timeString
}

// Utility function to format date consistently in local timezone
export const formatDateLocal = (date: Date | string): string => {
  let dateObj: Date
  
  if (typeof date === 'string') {
    dateObj = new Date(date)
  } else {
    dateObj = date
  }
  
  // Create a new date object using local components to avoid timezone issues
  const localDate = new Date(
    dateObj.getFullYear(),
    dateObj.getMonth(),
    dateObj.getDate()
  )
  
  return localDate.toISOString().split('T')[0] // Returns YYYY-MM-DD
}

// Test database connection and table existence
export const testDatabaseConnection = async (): Promise<{ connected: boolean; tablesExist: boolean; error?: string }> => {
  try {
    if (!supabase) {
      return { connected: false, tablesExist: false, error: 'Supabase client not initialized' }
    }

    // Test basic connection
    const { error: connectionError } = await supabase
      .from('meeting_requests')
      .select('id')
      .limit(1)

    if (connectionError) {
      // Check if it's a "table doesn't exist" error
      if (connectionError.code === '42P01') {
        return { connected: true, tablesExist: false, error: 'Tables do not exist' }
      }
      return { connected: false, tablesExist: false, error: connectionError }
    }

    return { connected: true, tablesExist: true }
  } catch (error) {
    return { connected: false, tablesExist: false, error }
  }
}

// Test function to check database tables and user access
export const testDatabaseTables = async () => {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized')
      return
    }

    console.log('🔍 Testing database tables...')

    // Test confirmed_meetings table
    const { data: meetingsTest, error: meetingsError } = await supabase
      .from('confirmed_meetings')
      .select('id, requester_id')
      .limit(1)

    console.log('  - confirmed_meetings test:', { data: meetingsTest, error: meetingsError })

    // Test users table
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .limit(1)

    console.log('  - users table test:', { data: usersTest, error: usersError })

    // Test if we can get a specific user
    if (meetingsTest && meetingsTest.length > 0) {
      const firstMeeting = meetingsTest[0]
      console.log('  - First meeting requester_id:', firstMeeting.requester_id)

      const { data: specificUser, error: specificUserError } = await supabase
        .from('users')
        .select('id, full_name')
        .eq('id', firstMeeting.requester_id)
        .single()

      console.log('  - Specific user lookup:', { data: specificUser, error: specificUserError })
    }

  } catch (error) {
    console.error('Error testing database tables:', error)
  }
}

// Create a new meeting request
export const createMeetingRequest = async (
  requesterId: string,
  requestedDate: string,
  requestedTimeSlot: string,
  meetingTitle: string,
  meetingDescription?: string
): Promise<{ data: MeetingRequest | null; error: string | null }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    console.log('Creating meeting request with data:', {
      requester_id: requesterId,
      requested_date: requestedDate,
      requested_time_slot: requestedTimeSlot,
      meeting_title: meetingTitle,
      meeting_description: meetingDescription
    })

    // Test if we can access the table at all
    console.log('Testing table access...')
    const { error: testError } = await supabase
      .from('meeting_requests')
      .select('id')
      .limit(1)

    if (testError) {
      console.error('Table access test failed:', testError)
      return { data: null, error: testError }
    }

    console.log('Table access test successful, proceeding with insert...')

    const { data, error } = await supabase
      .from('meeting_requests')
      .insert({
        requester_id: requesterId,
        requested_date: requestedDate,
        requested_time_slot: requestedTimeSlot,
        meeting_title: meetingTitle,
        meeting_description: meetingDescription
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error creating meeting request:', error)
      console.error('Full error object:', JSON.stringify(error, null, 2))
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        constraint: error.constraint
      })
      return { data: null, error }
    }

    console.log('Meeting request created successfully:', data)
    return { data, error: null }
  } catch (error) {
    console.error('Unexpected error in createMeetingRequest:', error)
    console.error('Error type:', typeof error)
    console.error('Error constructor:', error?.constructor?.name)
    if (error instanceof Error) {
      console.error('Error name:', error.name)
      console.error('Error stack:', error.stack)
    }
    return { data: null, error }
  }
}

// Get all pending meeting requests (for admins)
export const getPendingMeetingRequests = async (): Promise<{ data: MeetingRequest[] | null; error: string | null }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('meeting_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching pending meeting requests:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in getPendingMeetingRequests:', error)
    return { data: null, error }
  }
}

// Get meeting requests for a specific user
export const getUserMeetingRequests = async (userId: string): Promise<{ data: MeetingRequest[] | null; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('meeting_requests')
      .select('*')
      .eq('requester_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user meeting requests:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in getUserMeetingRequests:', error)
    return { data: null, error }
  }
}

// Update meeting request status (for admins)
export const updateMeetingRequestStatus = async (
  requestId: string,
  status: 'approved' | 'denied' | 'cancelled',
  adminNotes?: string
): Promise<{ data: MeetingRequest | null; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const updateData: MeetingRequestUpdateData = { status }
    if (adminNotes) {
      updateData.admin_notes = adminNotes
    }

    const { data, error } = await supabase
      .from('meeting_requests')
      .update(updateData)
      .eq('id', requestId)
      .select()
      .single()

    if (error) {
      console.error('Error updating meeting request status:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in updateMeetingRequestStatus:', error)
    return { data: null, error }
  }
}

// Create a confirmed meeting (for admins)
export const createConfirmedMeeting = async (
  meetingRequestId: string,
  requesterId: string,
  meetingDate: string,
  startTime: string,
  endTime: string,
  meetingTitle: string,
  meetingDescription?: string
): Promise<{ data: ConfirmedMeeting | null; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('confirmed_meetings')
      .insert({
        meeting_request_id: meetingRequestId,
        requester_id: requesterId,
        meeting_date: meetingDate,
        start_time: startTime,
        end_time: endTime,
        meeting_title: meetingTitle,
        meeting_description: meetingDescription
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating confirmed meeting:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in createConfirmedMeeting:', error)
    return { data: null, error }
  }
}

// Get confirmed meetings for a specific user
export const getUserConfirmedMeetings = async (userId: string): Promise<{ data: ConfirmedMeeting[] | null; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { data, error } = await supabase
      .from('confirmed_meetings')
      .select('*')
      .eq('requester_id', userId)
      .order('meeting_date', { ascending: true })

    if (error) {
      console.error('Error fetching user confirmed meetings:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in getUserConfirmedMeetings:', error)
    return { data: null, error }
  }
}

// Get all confirmed meetings (for admins)
export const getAllConfirmedMeetings = async (): Promise<{ data: (ConfirmedMeeting & { user?: { full_name: string } })[] | null; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // First, get all confirmed meetings
    const { data: meetings, error: meetingsError } = await supabase
      .from('confirmed_meetings')
      .select('*')
      .order('meeting_date', { ascending: true })

    if (meetingsError) {
      console.error('Error fetching confirmed meetings:', meetingsError)
      return { data: null, error: meetingsError }
    }

    if (!meetings || meetings.length === 0) {
      return { data: [], error: null }
    }

    // Get unique user IDs from the meetings
    const userIds = [...new Set(meetings.map(m => m.requester_id))]

    // Fetch user information for all unique user IDs
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds)

    if (usersError) {
      console.error('Error fetching users:', usersError)
      // Return meetings without user data if user fetch fails
      return { data: meetings, error: null }
    }

    // Create a map of user ID to user data
    const userMap = new Map()
    if (users) {
      users.forEach(user => {
        userMap.set(user.id, user)
      })
    }

    // Combine meeting data with user data
    const meetingsWithUsers = meetings.map(meeting => ({
      ...meeting,
      user: userMap.get(meeting.requester_id) ? { full_name: userMap.get(meeting.requester_id).full_name } : undefined
    }))

    console.log('🔍 Debug: getAllConfirmedMeetings')
    console.log('  - Total meetings:', meetings.length)
    console.log('  - Unique user IDs:', userIds)
    console.log('  - Users fetched:', users?.length || 0)
    console.log('  - User map size:', userMap.size)
    console.log('  - Sample meeting with user:', meetingsWithUsers[0])

    return { data: meetingsWithUsers, error: null }
  } catch (error) {
    console.error('Error in getAllConfirmedMeetings:', error)
    return { data: null, error }
  }
}

// Delete a confirmed meeting (for admins)
export const deleteConfirmedMeeting = async (meetingId: string): Promise<{ success: boolean; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await supabase
      .from('confirmed_meetings')
      .delete()
      .eq('id', meetingId)

    if (error) {
      console.error('Error deleting confirmed meeting:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deleteConfirmedMeeting:', error)
    return { success: false, error }
  }
}

// Delete all confirmed meetings (for admins - use with caution!)
export const deleteAllConfirmedMeetings = async (): Promise<{ success: boolean; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    const { error } = await supabase
      .from('confirmed_meetings')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all records

    if (error) {
      console.error('Error deleting all confirmed meetings:', error)
      return { success: false, error }
    }

    return { success: true, error: null }
  } catch (error) {
    console.error('Error in deleteAllConfirmedMeetings:', error)
    return { success: false, error }
  }
}

// Check if a time slot is available (not blocked by confirmed meetings)
export const isTimeSlotAvailable = async (
  date: string,
  timeSlot: string,
  duration: number = 30 // Default 30 minutes
): Promise<{ available: boolean; error: DatabaseError }> => {
  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized')
    }

    // Convert timeSlot to 24-hour format for consistent comparison
    const startTime = convertTo24Hour(timeSlot)
    
    // Calculate end time based on duration
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    
    // Validate that we have valid numbers
    if (isNaN(startHours) || isNaN(startMinutes)) {
      console.error(`🔍 Invalid time format: ${timeSlot} -> ${startTime}`)
      return { available: false, error: 'Invalid time format' }
    }
    
    const totalStartMinutes = startHours * 60 + startMinutes
    const totalEndMinutes = totalStartMinutes + duration
    const endHours = Math.floor(totalEndMinutes / 60)
    const endMinutes = totalEndMinutes % 60
    const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
    
    // Get all confirmed meetings for this date
    const { data, error } = await supabase
      .from('confirmed_meetings')
      .select('start_time, end_time')
      .eq('meeting_date', date)

    if (error) {
      console.error('Error checking time slot availability:', error)
      return { available: false, error }
    }

    // Check for overlaps manually
    let hasOverlap = false
    
    for (const meeting of data || []) {
      const meetingStart = meeting.start_time
      const meetingEnd = meeting.end_time
      
      // Convert meeting times to 24-hour format for consistent comparison
      const meetingStart24h = convertTo24Hour(meetingStart)
      const meetingEnd24h = convertTo24Hour(meetingEnd)
      
      // Check if there's an overlap
      // Our slot: [startTime, endTime] (e.g., 10:00-10:30)
      // Meeting: [meetingStart, meetingEnd] (e.g., 10:00-10:30)
      // Overlap if: startTime < meetingEnd AND endTime > meetingStart
      
      // Convert times to minutes for proper numerical comparison
      const [startHour, startMin] = startTime.split(':').map(Number)
      const [endHour, endMin] = endTime.split(':').map(Number)
      const [meetingStartHour, meetingStartMin] = meetingStart24h.split(':').map(Number)
      const [meetingEndHour, meetingEndMin] = meetingEnd24h.split(':').map(Number)
      
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin
      const meetingStartMinutes = meetingStartHour * 60 + meetingStartMin
      const meetingEndMinutes = meetingEndHour * 60 + meetingEndMin
      
      if (startMinutes < meetingEndMinutes && endMinutes > meetingStartMinutes) {
        // Check if this is a significant overlap (more than just touching at boundaries)
        const overlapStartMinutes = Math.max(startMinutes, meetingStartMinutes)
        const overlapEndMinutes = Math.min(endMinutes, meetingEndMinutes)
        
        const overlapMinutes = overlapEndMinutes - overlapStartMinutes
        
        // Only block if there's a significant overlap (more than 5 minutes)
        if (overlapMinutes > 5) {
          hasOverlap = true
          break
        }
      }
    }

    const available = !hasOverlap
    return { available, error: null }
  } catch (error) {
    console.error('Error in isTimeSlotAvailable:', error)
    return { available: false, error }
  }
}
