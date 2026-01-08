"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

interface ShareToMarketplaceModalProps {
  isOpen: boolean
  onClose: () => void
  automationId: string
  automationName: string
  onShared: () => void
}

export function ShareToMarketplaceModal({ 
  isOpen, 
  onClose, 
  automationId, 
  automationName,
  onShared 
}: ShareToMarketplaceModalProps) {
  const [title, setTitle] = useState(automationName)
  const [description, setDescription] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState('')
  const [isSharing, setIsSharing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)

  // Load existing marketplace data if automation is already shared
  useEffect(() => {
    if (isOpen && automationId) {
      loadExistingMarketplaceData()
    } else if (!isOpen) {
      // Reset form when modal closes
      setTitle(automationName)
      setDescription('')
      setShortDescription('')
      setCategory('')
      setTags('')
      setIsUpdate(false)
    }
  }, [isOpen, automationId, automationName])

  const loadExistingMarketplaceData = async () => {
    setIsLoading(true)
    try {
      // Get current user from localStorage to send with request
      const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || 'null') : null
      
      if (!currentUser) {
        setIsLoading(false)
        return
      }

      const response = await fetch(`/api/automations/marketplace/get?automationId=${automationId}&userId=${currentUser.id}&userEmail=${encodeURIComponent(currentUser.email)}`)
      const result = await response.json()
      
      if (result.success && result.data) {
        const marketplace = result.data
        setIsUpdate(true)
        setTitle(marketplace.title || automationName)
        setDescription(marketplace.description || '')
        setShortDescription(marketplace.short_description || '')
        setCategory(marketplace.category || '')
        setTags(marketplace.tags?.join(', ') || '')
      } else {
        setIsUpdate(false)
      }
    } catch (error) {
      console.error('Error loading marketplace data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    if (!title.trim()) {
      toastError('Please enter a title')
      return
    }

    if (!description.trim()) {
      toastError('Please enter a description')
      return
    }

    setIsSharing(true)
    try {
      // Get current user from localStorage to send with request
      const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('auth-user') || 'null') : null
      
      const response = await fetch('/api/automations/marketplace/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          automationId,
          title,
          description,
          shortDescription,
          category,
          tags,
          pricingTier: 'free', // All automations are free
          userId: currentUser?.id,
          userEmail: currentUser?.email,
        }),
      })

      const result = await response.json()
      
      if (result.success) {
        toastSuccess(isUpdate ? 'Marketplace listing updated successfully' : 'Automation shared to marketplace successfully')
        onShared()
        onClose()
      } else {
        toastError(result.error || `Failed to ${isUpdate ? 'update' : 'share'} automation`)
      }
    } catch (error) {
      console.error('Error sharing automation:', error)
      toastError('Failed to share automation')
    } finally {
      setIsSharing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isUpdate ? 'Update Marketplace Listing' : 'Share to Marketplace'}</DialogTitle>
          <DialogDescription>
            {isUpdate 
              ? 'Update your marketplace listing information. Changes will be visible to all users.'
              : 'Make your automation available for others to discover and install. Once shared, other users can browse, install, and use your automation in their workflows.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
        <div className="space-y-4 mt-4">
          <div>
            <Label className="mb-2 block">Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Automation title"
            />
          </div>

          <div>
            <Label className="mb-2 block">Short Description *</Label>
            <Input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief description (max 500 characters)"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {shortDescription.length}/500 characters
            </p>
          </div>

          <div>
            <Label className="mb-2 block">Full Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of what this automation does"
              rows={5}
            />
          </div>

          <div>
            <Label className="mb-2 block">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Tags</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Comma-separated tags (e.g., email, automation, workflow)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Separate tags with commas
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSharing}>
              Cancel
            </Button>
            <Button onClick={handleShare} disabled={isSharing}>
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sharing...
                </>
              ) : (
                isUpdate ? 'Update Listing' : 'Share to Marketplace'
              )}
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

