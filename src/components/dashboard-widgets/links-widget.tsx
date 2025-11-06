'use client'

import { useState, useEffect } from 'react'
import { Link as LinkIcon, Plus, Edit2, Trash2, ExternalLink, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useSession } from '@/components/providers/session-provider'
import { 
  fetchDashboardLinks, 
  createDashboardLink, 
  updateDashboardLink, 
  deleteDashboardLink 
} from '@/lib/simplified-database-functions'
import type { DashboardLink } from '@/lib/supabase'
import EmptyState from '@/components/ui/empty-state'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'

interface LinksWidgetProps {
  companyId: string
  config?: Record<string, unknown>
}

export default function LinksWidget({ companyId, config }: LinksWidgetProps) {
  const { data: session } = useSession()
  const [links, setLinks] = useState<DashboardLink[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedLink, setSelectedLink] = useState<DashboardLink | null>(null)
  const [formData, setFormData] = useState({ 
    title: '', 
    url: '', 
    description: '', 
    icon_name: '',
    display_order: 0
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const maxLinks = (config?.maxLinks as number) || 10

  useEffect(() => {
    loadLinks()
  }, [companyId])

  const loadLinks = async () => {
    setLoading(true)
    try {
      const data = await fetchDashboardLinks(companyId)
      setLinks(data.slice(0, maxLinks))
    } catch (err) {
      console.error('Error loading links:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({ title: '', url: '', description: '', icon_name: '', display_order: links.length })
    setError('')
    setIsCreateModalOpen(true)
  }

  const handleEdit = (link: DashboardLink) => {
    setSelectedLink(link)
    setFormData({
      title: link.title,
      url: link.url,
      description: link.description || '',
      icon_name: link.icon_name || '',
      display_order: link.display_order
    })
    setError('')
    setIsEditModalOpen(true)
  }

  const handleDelete = (link: DashboardLink) => {
    setSelectedLink(link)
    setIsDeleteDialogOpen(true)
  }

  const validateUrl = (url: string) => {
    try {
      // Add protocol if missing
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url
      }
      new URL(url)
      return url
    } catch {
      return null
    }
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return
    }

    if (!formData.url.trim()) {
      setError('URL is required')
      return
    }

    const validUrl = validateUrl(formData.url)
    if (!validUrl) {
      setError('Please enter a valid URL')
      return
    }

    if (!session?.user?.id) {
      setError('User session not found')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (selectedLink) {
        // Update existing link
        const result = await updateDashboardLink(selectedLink.id, {
          ...formData,
          url: validUrl
        })
        if (result.success) {
          setIsEditModalOpen(false)
          setSelectedLink(null)
          loadLinks()
        } else {
          setError(result.error || 'Failed to update link')
        }
      } else {
        // Create new link
        const result = await createDashboardLink(companyId, {
          ...formData,
          url: validUrl
        }, session.user.id)
        if (result.success) {
          setIsCreateModalOpen(false)
          setFormData({ title: '', url: '', description: '', icon_name: '', display_order: links.length })
          loadLinks()
        } else {
          setError(result.error || 'Failed to create link')
        }
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedLink) return

    setSaving(true)
    try {
      const result = await deleteDashboardLink(selectedLink.id)
      if (result.success) {
        setIsDeleteDialogOpen(false)
        setSelectedLink(null)
        loadLinks()
      } else {
        setError(result.error || 'Failed to delete link')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = session?.user?.role === 'admin' || session?.user?.role === 'manager'

  return (
    <>
      <Card className="parrot-card-enhanced h-full flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
          <CardTitle className="flex items-center">
            <LinkIcon className="h-5 w-5 mr-2" />
            Quick Links
          </CardTitle>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Link
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : links.length === 0 ? (
            <EmptyState
              icon={LinkIcon}
              title="No links yet"
              description={canEdit ? "Add quick links to important resources and websites." : "No links have been added yet."}
              variant="compact"
            />
          ) : (
            <div className="space-y-2">
              {links.map((link) => (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors group"
                >
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 flex items-center gap-3"
                  >
                    <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                        {link.title}
                      </p>
                      {link.description && (
                        <p className="text-xs text-gray-500 truncate">
                          {link.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 truncate mt-1">
                        {link.url}
                      </p>
                    </div>
                    <ExternalLink className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                  {canEdit && (
                    <div className="flex gap-1 ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          handleEdit(link)
                        }}
                        className="h-7 w-7 p-0"
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.preventDefault()
                          handleDelete(link)
                        }}
                        className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={isCreateModalOpen || isEditModalOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateModalOpen(false)
          setIsEditModalOpen(false)
          setSelectedLink(null)
          setFormData({ title: '', url: '', description: '', icon_name: '', display_order: links.length })
          setError('')
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedLink ? 'Edit Link' : 'Create Link'}</DialogTitle>
            <DialogDescription>
              {selectedLink ? 'Update the link details.' : 'Add a new quick link for easy access.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Link title"
                disabled={saving}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="url">URL *</Label>
              <Input
                id="url"
                type="url"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                placeholder="https://example.com"
                disabled={saving}
                required
              />
              <p className="text-xs text-gray-500">Protocol (https://) will be added automatically if missing</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the link"
                rows={2}
                disabled={saving}
              />
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                {error}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false)
                setIsEditModalOpen(false)
                setSelectedLink(null)
                setFormData({ title: '', url: '', description: '', icon_name: '', display_order: links.length })
                setError('')
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.title.trim() || !formData.url.trim()}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setSelectedLink(null)
        }}
        onConfirm={handleDeleteConfirm}
        itemName={selectedLink?.title || 'this link'}
        isLoading={saving}
      />
    </>
  )
}

