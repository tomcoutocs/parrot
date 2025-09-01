import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { createMeetingRequest, testDatabaseConnection, formatDateLocal } from '@/lib/meeting-functions'
import { format } from 'date-fns'
import { Calendar, Clock, User, FileText } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MeetingRequestModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: Date
  selectedTime: string
  requesterId: string
  session: any // Add session prop
}

export const MeetingRequestModal: React.FC<MeetingRequestModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  requesterId,
  session
}) => {
  const [meetingTitle, setMeetingTitle] = useState('')
  const [meetingDescription, setMeetingDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      // Validate requesterId
      if (!requesterId || requesterId.trim() === '') {
        setError('Invalid user session. Please log in again.')
        return
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(requesterId)) {
        console.error('Invalid UUID format in requesterId:', requesterId)
        setError('Invalid user session. Please log in again.')
        return
      }

      // First, test the database connection
      const connectionTest = await testDatabaseConnection()
      console.log('Database connection test:', connectionTest)
      
      if (!connectionTest.connected) {
        setError('Database connection failed. Please check your connection.')
        return
      }
      
      if (!connectionTest.tablesExist) {
        setError('Meeting system tables are not set up. Please contact an administrator.')
        return
      }

      console.log('Submitting meeting request with data:', {
        requesterId,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        title: meetingTitle.trim(),
        description: meetingDescription.trim() || undefined
      })

      // === AUTH DEBUG ===
      console.log('Session from props:', session)
      console.log('User ID from props session:', session?.user?.id)
      console.log('User role from props session:', session?.user?.role)
      console.log('Requester ID being used:', requesterId)
      console.log('==================')

      // Format date in user's local timezone to prevent date shifting
      const formattedDate = formatDateLocal(selectedDate)
      
      console.log('Date handling:', {
        originalSelectedDate: selectedDate,
        formattedDate: formattedDate
      })

      const { data, error: submitError } = await createMeetingRequest(
        requesterId,
        formattedDate,
        selectedTime,
        meetingTitle.trim(),
        meetingDescription.trim() || undefined
      )

      if (submitError) {
        console.error('Meeting request submission error:', submitError)
        
        // Better error message handling
        let errorMessage = 'Failed to submit meeting request'
        
        if (submitError.message) {
          errorMessage += `: ${submitError.message}`
        } else if (submitError.details) {
          errorMessage += `: ${submitError.details}`
        } else if (submitError.hint) {
          errorMessage += `: ${submitError.hint}`
        } else if (submitError.code) {
          errorMessage += ` (Error code: ${submitError.code})`
        } else if (typeof submitError === 'string') {
          errorMessage += `: ${submitError}`
        } else if (submitError && typeof submitError === 'object') {
          errorMessage += `: ${JSON.stringify(submitError)}`
        }
        
        setError(errorMessage)
        return
      }

      setSuccess(true)
      // Reset form
      setMeetingTitle('')
      setMeetingDescription('')
      
      // Close modal after a short delay
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Unexpected error in handleSubmit:', err)
      let errorMessage = 'An unexpected error occurred. Please try again.'
      
      if (err && typeof err === 'object' && 'message' in err) {
        errorMessage += ` Details: ${(err as any).message}`
      } else if (err && typeof err === 'string') {
        errorMessage += ` Details: ${err}`
      }
      
      setError(errorMessage)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setError('')
      setSuccess(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Request Meeting
          </DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Meeting Request Submitted!</h3>
            <p className="text-gray-600">
              Your meeting request has been sent to the admin for approval.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Meeting Details Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{selectedTime}</span>
              </div>
            </div>

            {/* Meeting Title */}
            <div className="space-y-2">
              <Label htmlFor="meetingTitle" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Meeting Title *
              </Label>
              <Input
                id="meetingTitle"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Enter meeting title"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Meeting Description */}
            <div className="space-y-2">
              <Label htmlFor="meetingDescription" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Meeting Description
              </Label>
              <Textarea
                id="meetingDescription"
                value={meetingDescription}
                onChange={(e) => setMeetingDescription(e.target.value)}
                placeholder="Describe the purpose of this meeting (optional)"
                rows={3}
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !meetingTitle.trim()}
                className="flex-1"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>

            {/* Info Note */}
            <div className="text-xs text-gray-500 text-center">
              Your meeting request will be reviewed by an admin. You'll be notified once it's approved or denied.
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
