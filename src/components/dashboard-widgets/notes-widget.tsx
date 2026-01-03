'use client'

import { useState, useEffect, useRef } from 'react'
import { FileText, Loader2, Save, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSession } from '@/components/providers/session-provider'
import { hasAdminPrivileges } from '@/lib/role-helpers'
import { 
  fetchDashboardNotes, 
  createDashboardNote, 
  updateDashboardNote
} from '@/lib/simplified-database-functions'
import type { DashboardNote } from '@/lib/supabase'

interface NotesWidgetProps {
  companyId: string
  config?: Record<string, unknown>
}

export default function NotesWidget({ companyId, config }: NotesWidgetProps) {
  const { data: session } = useSession()
  const [note, setNote] = useState<DashboardNote | null>(null)
  const [content, setContent] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    loadNote()
  }, [companyId])

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      // Move cursor to end
      const length = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(length, length)
    }
  }, [isEditing])

  const loadNote = async () => {
    setLoading(true)
    try {
      const notes = await fetchDashboardNotes(companyId)
      // Get the first note, or null if none exists
      const firstNote = notes.length > 0 ? notes[0] : null
      setNote(firstNote)
      setContent(firstNote?.content || '')
    } catch (err) {
      console.error('Error loading note:', err)
      setError('Failed to load note')
    } finally {
      setLoading(false)
    }
  }

  const handleStartEdit = () => {
    setIsEditing(true)
    setError('')
  }

  const handleCancel = () => {
    setIsEditing(false)
    setContent(note?.content || '')
    setError('')
  }

  const handleSave = async () => {
    if (!session?.user?.id) {
      setError('User session not found')
      return
    }

    setSaving(true)
    setError('')

    try {
      if (note) {
        // Update existing note
        const result = await updateDashboardNote(note.id, { content }, session.user.id)
        if (result.success) {
          setIsEditing(false)
          await loadNote() // Reload to get updated timestamp
        } else {
          setError(result.error || 'Failed to save note')
        }
      } else {
        // Create new note
        const result = await createDashboardNote(companyId, { content }, session.user.id)
        if (result.success) {
          setIsEditing(false)
          await loadNote() // Reload to get the new note
        } else {
          setError(result.error || 'Failed to create note')
        }
      }
    } catch (err) {
      setError('An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  const canEdit = hasAdminPrivileges(session?.user?.role) || session?.user?.role === 'manager'

  return (
    <Card className="parrot-card-enhanced h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 flex-shrink-0">
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Notes
        </CardTitle>
        {canEdit && isEditing && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCancel}
              className="h-8"
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              className="h-8"
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </>
              )}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="h-full flex flex-col">
            {isEditing ? (
              <div className="flex-1 flex flex-col">
                <Textarea
                  ref={textareaRef}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your note here..."
                  className="flex-1 min-h-[200px] resize-none font-sans text-sm bg-transparent border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                  disabled={saving}
                />
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 p-2 rounded mt-2">
                    {error}
                  </div>
                )}
                {note && (
                  <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    Last updated {new Date(note.updated_at || note.created_at).toLocaleDateString()} by {note.updated_user?.full_name || note.created_user?.full_name || 'Unknown'}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex-1">
                {content ? (
                  <div 
                    className="min-h-[200px] cursor-text"
                    onClick={canEdit ? handleStartEdit : undefined}
                  >
                    <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-sans font-normal">
                      {content}
                    </pre>
                    {note && (
                      <p className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        Last updated {new Date(note.updated_at || note.created_at).toLocaleDateString()} by {note.updated_user?.full_name || note.created_user?.full_name || 'Unknown'}
                      </p>
                    )}
                  </div>
                ) : (
                  <div 
                    className="min-h-[200px] flex items-center justify-center cursor-text"
                    onClick={canEdit ? handleStartEdit : undefined}
                  >
                    <div className="text-center text-gray-500">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {canEdit ? 'Click here to start writing your note' : 'No note yet'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
