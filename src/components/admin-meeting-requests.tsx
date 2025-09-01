import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  getPendingMeetingRequests, 
  updateMeetingRequestStatus, 
  createConfirmedMeeting,
  formatDateLocal
} from '@/lib/meeting-functions'
import { triggerGlobalRefresh } from '@/lib/refresh-utils'
import { MeetingRequest } from '@/lib/supabase'
import { format } from 'date-fns'
import { 
  Calendar, 
  Clock, 
  User, 
  Check, 
  X, 
  MessageSquare,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react'

interface AdminMeetingRequestsProps {
  userId: string
  slotDuration?: number
  onMeetingConfirmed?: () => void
}

export const AdminMeetingRequests: React.FC<AdminMeetingRequestsProps> = ({ userId, slotDuration, onMeetingConfirmed }) => {
  const [meetingRequests, setMeetingRequests] = useState<MeetingRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedRequest, setSelectedRequest] = useState<MeetingRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadMeetingRequests()
  }, [])

  const loadMeetingRequests = async () => {
    try {
      setLoading(true)
      const { data, error: fetchError } = await getPendingMeetingRequests()
      
      if (fetchError) {
        setError('Failed to load meeting requests')
        return
      }

      setMeetingRequests(data || [])
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (request: MeetingRequest) => {
    setProcessing(request.id)
    setError('')

    try {
      // First, update the request status to approved
      const { error: updateError } = await updateMeetingRequestStatus(
        request.id,
        'approved',
        adminNotes
      )

      if (updateError) {
        console.error('Failed to update meeting request status:', updateError)
        setError('Failed to approve meeting request')
        return
      }

      // Calculate end time using the actual slot duration
      const startTime = request.requested_time_slot
      const duration = (slotDuration && !isNaN(Number(slotDuration)) && Number(slotDuration) > 0) ? Number(slotDuration) : 30 // Default to 30 minutes if not provided
      
      // Convert start time to 24-hour format FIRST
      const startTime24h = startTime.toLowerCase().includes('am') || startTime.toLowerCase().includes('pm')
        ? (() => {
            const [timeStr, period] = startTime.toLowerCase().split(/(?=[ap]m)/)
            const [hours, minutes] = timeStr.split(':').map(Number)
            let hour = hours
            if (period === 'pm' && hours !== 12) {
              hour += 12
            } else if (period === 'am' && hours === 12) {
              hour = 0
            }
            const result = `${hour.toString().padStart(2, '0')}:${(minutes || 0).toString().padStart(2, '0')}`
            return result
          })()
        : startTime
      
      // NOW calculate end time using the converted 24-hour start time
      const endTime = calculateEndTime(startTime24h, duration)
      
      // Create confirmed meeting
      const { error: createError } = await createConfirmedMeeting(
        request.id,
        request.requester_id,
        request.requested_date,
        startTime24h, // Use 24-hour format
        endTime,
        request.meeting_title,
        request.meeting_description
      )

      if (createError) {
        console.error('Failed to create confirmed meeting:', createError)
        setError('Failed to create confirmed meeting')
        return
      }

      console.log('Meeting approved and confirmed successfully')
      
      // Refresh the list
      await loadMeetingRequests()
      setSelectedRequest(null)
      setAdminNotes('')
      
      // Notify parent component that a meeting was confirmed (to refresh calendar)
      if (onMeetingConfirmed) {
        try {
          // Force a refresh by calling the callback
          onMeetingConfirmed()
        } catch (callbackError) {
          console.error('❌ Error executing callback:', callbackError)
        }
      }

      // Also trigger global refresh as a backup
      triggerGlobalRefresh()
    } catch (err) {
      console.error('Unexpected error in handleApprove:', err)
      setError('An unexpected error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const handleDeny = async (request: MeetingRequest) => {
    setProcessing(request.id)
    setError('')

    try {
      const { error: updateError } = await updateMeetingRequestStatus(
        request.id,
        'denied',
        adminNotes
      )

      if (updateError) {
        setError('Failed to deny meeting request')
        return
      }

      // Refresh the list
      await loadMeetingRequests()
      setSelectedRequest(null)
      setAdminNotes('')
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setProcessing(null)
    }
  }

  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    // Convert start time to 24-hour format for consistent calculation
    let startHour: number
    let startMinute: number
    
    // FIXED: Better detection of 12-hour format (case insensitive)
    if (startTime.toLowerCase().includes('am') || startTime.toLowerCase().includes('pm')) {
      // 12-hour format (e.g., "9:00am", "2:30pm", "12:00pm")
      
      const [timeStr, period] = startTime.toLowerCase().split(/(?=[ap]m)/)
      const [hours, minutes] = timeStr.split(':').map(Number)
      
      let hour = hours
      if (period === 'pm' && hours !== 12) {
        hour += 12
      } else if (period === 'am' && hours === 12) {
        hour = 0
      }
      
      startHour = hour
      startMinute = minutes || 0
    } else {
      // 24-hour format (e.g., "09:00", "14:30")
      const [hour, minute] = startTime.split(':').map(Number)
      startHour = hour
      startMinute = minute || 0
    }
    
    // Calculate end time
    const totalStartMinutes = startHour * 60 + startMinute
    const totalEndMinutes = totalStartMinutes + durationMinutes
    const endHours = Math.floor(totalEndMinutes / 60)
    const endMinutes = totalEndMinutes % 60
    
    // Return in 24-hour format for consistent storage
    const result = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`
    
    return result
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'denied':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>
      case 'approved':
        return <Badge variant="default">Approved</Badge>
      case 'denied':
        return <Badge variant="destructive">Denied</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading meeting requests...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (meetingRequests.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Pending Requests</h3>
            <p className="text-gray-600">All meeting requests have been processed.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="w-4 h-4" />
            <span className="font-medium">Error:</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {meetingRequests.map((request) => (
        <Card key={request.id} className="border-l-4 border-l-yellow-500">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {request.meeting_title}
                  </h3>
                  {getStatusBadge(request.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{(() => {
                      // Parse the date string directly to avoid timezone issues
                      const [year, month, day] = request.requested_date.split('-').map(Number)
                      const date = new Date(year, month - 1, day) // month is 0-indexed
                      return format(date, 'MMM d, yyyy')
                    })()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{request.requested_time_slot}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>User ID: {request.requester_id}</span>
                  </div>
                </div>

                {request.meeting_description && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">{request.meeting_description}</p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRequest(request)}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  Review
                </Button>
              </div>
            </div>

            {/* Admin Notes Input */}
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <Label htmlFor={`notes-${request.id}`} className="text-sm font-medium text-gray-700 mb-2 block">
                Admin Notes (optional)
              </Label>
              <Textarea
                id={`notes-${request.id}`}
                value={selectedRequest?.id === request.id ? adminNotes : ''}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add notes about this request..."
                rows={2}
                className="mb-3"
              />
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(request)}
                  disabled={processing === request.id}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  {processing === request.id ? 'Processing...' : 'Approve'}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleDeny(request)}
                  disabled={processing === request.id}
                  className="flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  {processing === request.id ? 'Deny' : 'Deny'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}