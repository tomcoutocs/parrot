'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Edit2, Trash2, Pin, PinOff, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'
import { useSession } from '@/components/providers/session-provider'
import { 
  fetchDashboardNotes, 
  createDashboardNote, 
  updateDashboardNote, 
  deleteDashboardNote 
} from '@/lib/simplified-database-functions'
import type { DashboardNote } from '@/lib/supabase'
import EmptyState from '@/components/ui/empty-state'

interface NotesWidgetProps {
  companyId: string
  config?: Record<string, unknown>
}

export default function NotesWidget({ companyId, config }: NotesWidgetProps) {
  const { data: session } = useSession()
  const [notes, setNotes] = useState<DashboardNote[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedNote, setSelectedNote] = useState<DashboardNote | null>(null)
  const [formData, setFormData] = useState({ title: '', content: '', is_pinned: false })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadNotes()
  }, [companyId])

  const loadNotes = async () => {
    setLoading(true)
    try {
      const data = await fetchDashboardNotes(companyId)
      setNotes(data)
    } catch (err) {
      console.error('Error loading notes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({ title: '', content: '', is_pinned: false })
    setError('')
    setIsCreateModalOpen(true)
  }

  const handleEdit = (note: DashboardNote) => {
    setSelectedNote(note)
    setFormData({
      title: note.title || '',
      content: note.content,
      is_pinned: note.is_pinned
    })
    setError('')
    setIsEditModalOpen(true)
  }

  const handleDelete = (note: DashboardNote) => {
    setSelectedNote(note)
    setIsDeleteDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.content.trim()) {
      setError('Content is required')
      return
    }

    if (!session?.user?.id) {
      setError('User session not found')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (selectedNote) {
        // Update existing note
        const result = await updateDashboardNote(selectedNote.id, formData, session.user.id)
        if (result.success) {
          setIsEditModalOpen(false)
          setSelectedNote(null)
          loadNotes()
        } else {
          setError(result.error || 'Failed to update note')
        }
      } else {
        // Create new note
        const result = await createDashboardNote(companyId, formData, session.user.id)
        if (result.success) {
          setIsCreateModalOpen(false)
          setFormData({ title: '', content: '', is_pinned: false })
          loadNotes()
        } else {
          setError(result.error || 'Failed to create note')
        }
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteConfirm = async () => {
    if (!selectedNote) return

    setSaving(true)
    try {
      const result = await deleteDashboardNote(selectedNote.id)
      if (result.success) {
        setIsDeleteDialogOpen(false)
        setSelectedNote(null)
        loadNotes()
      } else {
        setError(result.error || 'Failed to delete note')
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
            <FileText className="h-5 w-5 mr-2" />
            Notes
          </CardTitle>
          {canEdit && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCreate}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Note
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : notes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No notes yet"
              description={canEdit ? "Add a note to share information with your team." : "No notes have been added yet."}
              variant="compact"
            />
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <div
                  key={note.id}
                  className={`p-3 rounded-lg border ${
                    note.is_pinned ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-900/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {note.is_pinned && (
                        <Badge variant="secondary" className="mb-1">
                          <Pin className="h-3 w-3 mr-1" />
                          Pinned
                        </Badge>
                      )}
                      {note.title && (
                        <h4 className="font-semibold text-sm mb-1">{note.title}</h4>
                      )}
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {note.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {note.created_user?.full_name || 'Unknown'} • {new Date(note.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(note)}
                          className="h-7 w-7 p-0"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(note)}
                          className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
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
          setSelectedNote(null)
          setFormData({ title: '', content: '', is_pinned: false })
          setError('')
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{selectedNote ? 'Edit Note' : 'Create Note'}</DialogTitle>
            <DialogDescription>
              {selectedNote ? 'Update the note details.' : 'Add a new note to share with your team.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (optional)</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Note title"
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <Textarea
                id="content"
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter note content..."
                rows={6}
                disabled={saving}
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_pinned"
                checked={formData.is_pinned}
                onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                disabled={saving}
                className="rounded"
              />
              <Label htmlFor="is_pinned" className="cursor-pointer">
                Pin this note
              </Label>
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
                setSelectedNote(null)
                setFormData({ title: '', content: '', is_pinned: false })
                setError('')
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !formData.content.trim()}>
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
          setSelectedNote(null)
        }}
        onConfirm={handleDeleteConfirm}
        itemName={selectedNote?.title || 'this note'}
        isLoading={saving}
      />
    </>
  )
}

