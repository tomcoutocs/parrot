"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface ReportAutomationModalProps {
  isOpen: boolean
  onClose: () => void
  marketplaceId: string
  automationTitle: string
  onReported?: () => void
}

export function ReportAutomationModal({ 
  isOpen, 
  onClose, 
  marketplaceId, 
  automationTitle,
  onReported 
}: ReportAutomationModalProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toastError('Please provide a reason for reporting this automation')
      return
    }

    setIsSubmitting(true)
    try {
      // Get current user from localStorage
      const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || 'null') : null
      
      if (!currentUser) {
        toastError('You must be logged in to report an automation')
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/automations/marketplace/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketplaceId,
          reason: reason.trim(),
          userId: currentUser.id,
          userEmail: currentUser.email,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toastSuccess('Automation reported successfully. Thank you for your feedback.')
        setReason('')
        onReported?.()
        onClose()
      } else {
        toastError(result.error || 'Failed to report automation')
      }
    } catch (error) {
      console.error('Error reporting automation:', error)
      toastError('Failed to report automation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Report Automation</DialogTitle>
          <DialogDescription>
            Report "{automationTitle}" for review. Please provide a detailed reason for your report.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label className="mb-2 block">Reason for Report *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please describe why you are reporting this automation (e.g., inappropriate content, spam, broken functionality, etc.)"
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your report will be reviewed by administrators. False reports may result in account restrictions.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !reason.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

