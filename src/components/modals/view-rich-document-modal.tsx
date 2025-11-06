'use client'

import { useState, useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extension-placeholder'
import { Link } from '@tiptap/extension-link'
import { TextAlign } from '@tiptap/extension-text-align'
import { TaskList } from '@tiptap/extension-task-list'
import { TaskItem } from '@tiptap/extension-task-item'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  Strikethrough, 
  Code, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3, 
  Quote, 
  Undo, 
  Redo, 
  Save,
  Loader2,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  CheckSquare,
  Edit,
  X,
  Plus
} from 'lucide-react'
import { saveRichDocument, deleteRichDocument, type RichDocument } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ViewRichDocumentModalProps {
  isOpen: boolean
  onClose: () => void
  document: RichDocument | null
  companyId: string
  userId: string
  onDocumentUpdated?: () => void
  onDocumentDeleted?: () => void
}

export default function ViewRichDocumentModal({
  isOpen,
  onClose,
  document,
  companyId,
  userId,
  onDocumentUpdated,
  onDocumentDeleted
}: ViewRichDocumentModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [documentTitle, setDocumentTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Start typing...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 underline hover:text-blue-800',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Underline,
      TextStyle,
      Color,
      Table.configure({
        resizable: true,
      }),
      TableRow.configure({}),
      TableHeader.configure({}),
      TableCell.configure({}),
    ],
    content: document?.content || '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4',
      },
    },
  })

  useEffect(() => {
    if (document && editor) {
      setDocumentTitle(document.title)
      editor.commands.setContent(document.content)
    }
  }, [document, editor])

  useEffect(() => {
    if (isEditing && isOpen) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [isEditing, isOpen])

  const handleSave = async () => {
    if (!document) return
    
    if (!documentTitle.trim()) {
      toastError('Please enter a document title')
      return
    }

    if (!editor) {
      toastError('Editor not initialized')
      return
    }

    setSaving(true)

    try {
      const content = editor.getHTML()

      const result = await saveRichDocument(
        documentTitle.trim(),
        content,
        companyId,
        userId,
        document.folder_path,
        document.id
      )

      if (result.success) {
        toastSuccess('Document updated successfully!')
        setIsEditing(false)
        
        if (onDocumentUpdated) {
          onDocumentUpdated()
        }
      } else {
        toastError(result.error || 'Failed to update document')
      }
    } catch (err) {
      console.error('Error saving document:', err)
      toastError('Failed to update document', {
        description: err instanceof Error ? err.message : 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!document) return

    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return
    }

    setDeleting(true)

    try {
      const result = await deleteRichDocument(document.id)

      if (result.success) {
        toastSuccess('Document deleted successfully')
        onClose()
        if (onDocumentDeleted) {
          onDocumentDeleted()
        }
      } else {
        toastError(result.error || 'Failed to delete document')
      }
    } catch (err) {
      console.error('Error deleting document:', err)
      toastError('Failed to delete document', {
        description: err instanceof Error ? err.message : 'Please try again'
      })
    } finally {
      setDeleting(false)
    }
  }

  const handleClose = () => {
    setIsEditing(false)
    onClose()
  }

  // Quick insert actions (Notion-like)
  const quickInsertActions = [
    { label: 'Heading 1', action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bullet List', action: () => editor?.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', action: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: 'To-do List', action: () => editor?.chain().focus().toggleTaskList().run() },
    { label: 'Quote', action: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', action: () => editor?.chain().focus().toggleCodeBlock().run() },
    { label: 'Horizontal Rule', action: () => editor?.chain().focus().setHorizontalRule().run() },
  ]

  // Toolbar buttons
  const toolbarButtons = [
    { icon: Bold, onClick: () => editor?.chain().focus().toggleBold().run(), isActive: () => editor?.isActive('bold') || false },
    { icon: Italic, onClick: () => editor?.chain().focus().toggleItalic().run(), isActive: () => editor?.isActive('italic') || false },
    { icon: UnderlineIcon, onClick: () => editor?.chain().focus().toggleUnderline().run(), isActive: () => editor?.isActive('underline') || false },
    { icon: Strikethrough, onClick: () => editor?.chain().focus().toggleStrike().run(), isActive: () => editor?.isActive('strike') || false },
    { icon: Code, onClick: () => editor?.chain().focus().toggleCode().run(), isActive: () => editor?.isActive('code') || false },
    { separator: true },
    { icon: Heading1, onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor?.isActive('heading', { level: 1 }) || false },
    { icon: Heading2, onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor?.isActive('heading', { level: 2 }) || false },
    { icon: Heading3, onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor?.isActive('heading', { level: 3 }) || false },
    { separator: true },
    { icon: List, onClick: () => editor?.chain().focus().toggleBulletList().run(), isActive: () => editor?.isActive('bulletList') || false },
    { icon: ListOrdered, onClick: () => editor?.chain().focus().toggleOrderedList().run(), isActive: () => editor?.isActive('orderedList') || false },
    { icon: CheckSquare, onClick: () => editor?.chain().focus().toggleTaskList().run(), isActive: () => editor?.isActive('taskList') || false },
    { icon: Quote, onClick: () => editor?.chain().focus().toggleBlockquote().run(), isActive: () => editor?.isActive('blockquote') || false },
    { separator: true },
    { icon: AlignLeft, onClick: () => editor?.chain().focus().setTextAlign('left').run(), isActive: () => editor?.isActive({ textAlign: 'left' }) || false },
    { icon: AlignCenter, onClick: () => editor?.chain().focus().setTextAlign('center').run(), isActive: () => editor?.isActive({ textAlign: 'center' }) || false },
    { icon: AlignRight, onClick: () => editor?.chain().focus().setTextAlign('right').run(), isActive: () => editor?.isActive({ textAlign: 'right' }) || false },
    { separator: true },
    { icon: Undo, onClick: () => editor?.chain().focus().undo().run() },
    { icon: Redo, onClick: () => editor?.chain().focus().redo().run() },
  ]

  if (!document || !editor) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          {isEditing ? (
            <div>
              <Label htmlFor="edit-title" className="mb-2 block">Document Title</Label>
              <Input
                id="edit-title"
                ref={titleInputRef}
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !saving) {
                    handleSave()
                  }
                }}
              />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <DialogTitle>{document.title}</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Toolbar - only show when editing */}
        {isEditing && (
          <div className="flex items-center gap-1 p-2 border-b overflow-x-auto">
            {/* Notion-like Insert dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1">
                  <Plus className="h-4 w-4" />
                  <span className="text-sm">Insert</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {quickInsertActions.map((action) => (
                  <DropdownMenuItem
                    key={action.label}
                    onClick={action.action}
                    className="cursor-pointer"
                  >
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="w-px h-6 bg-gray-300 mx-1" />
            
            {toolbarButtons.map((button, index) => {
              if ('separator' in button) {
                return <div key={index} className="w-px h-6 bg-gray-300 mx-1" />
              }
              const Icon = button.icon
              const isActive = button.isActive ? button.isActive() : false
              return (
                <Button
                  key={index}
                  variant={isActive ? 'default' : 'ghost'}
                  size="sm"
                  onClick={button.onClick}
                  className="h-8 w-8 p-0"
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            })}
          </div>
        )}

        {/* Editor/Viewer */}
        <div className="flex-1 overflow-auto border rounded-lg">
          <EditorContent 
            editor={editor} 
            className={isEditing ? '' : 'pointer-events-none'}
          />
        </div>

        {/* Footer - only show when editing */}
        {isEditing && (
          <DialogFooter className="flex-shrink-0">
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting || saving}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button 
              variant="orange" 
              onClick={handleSave} 
              disabled={!documentTitle.trim() || saving}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}

