'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
import { useSession } from '@/components/providers/session-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Code2,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Undo,
  Redo,
  CheckSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Save,
  Loader2,
  Plus,
  ArrowLeft,
  MoreVertical,
  Link2,
  Image,
  Palette,
  Settings,
  Type,
  Table as TableIcon,
  CheckCircle2,
  Calendar,
  User,
} from 'lucide-react'
import { saveRichDocument, getRichDocument } from '@/lib/database-functions'
import { supabase } from '@/lib/supabase'
import { toastSuccess, toastError } from '@/lib/toast'
import { format } from 'date-fns'
import DashboardLayout from '@/components/dashboard-layout'

interface DocumentEditorPageProps {
  documentId: string
}

export default function DocumentEditorPage({ documentId }: DocumentEditorPageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [documentTitle, setDocumentTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [author, setAuthor] = useState<string>('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isNewDocument = documentId === 'new'
  const [isWiki, setIsWiki] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Type "/" for commands or just start typing...',
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
        HTMLAttributes: {
          class: 'my-4',
        },
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none min-h-[600px] px-16 py-8 dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-gray-100 prose-p:text-gray-800 dark:prose-p:text-gray-200',
      },
    },
    onUpdate: () => {
      // Auto-save could be implemented here
    },
  })

  // Load existing document if editing
  useEffect(() => {
    if (!isNewDocument && session?.user?.id) {
      const loadDocument = async () => {
        setLoading(true)
        try {
          const result = await getRichDocument(documentId)
          if (result.success && result.document) {
            setDocumentTitle(result.document.title)
            if (editor) {
              editor.commands.setContent(result.document.content || '')
            }
            setLastSaved(result.document.updated_at ? new Date(result.document.updated_at) : null)
            
            // Fetch author information
            if (result.document.created_by && supabase) {
              try {
                const { data: userData } = await supabase
                  .from('users')
                  .select('full_name, email')
                  .eq('id', result.document.created_by)
                  .single()
                
                if (userData) {
                  setAuthor(userData.full_name || userData.email || 'Unknown')
                } else {
                  setAuthor('Unknown')
                }
              } catch (err) {
                console.error('Error loading author:', err)
                setAuthor('Unknown')
              }
            } else {
              setAuthor('Unknown')
            }
          } else {
            toastError('Document not found')
          }
        } catch (err) {
          console.error('Error loading document:', err)
          toastError('Failed to load document', {
            description: err instanceof Error ? err.message : 'Please try again'
          })
        } finally {
          setLoading(false)
        }
      }
      loadDocument()
    } else {
      setLoading(false)
      if (session?.user) {
        setAuthor(session.user.name || session.user.email || 'Unknown')
      }
    }
  }, [documentId, isNewDocument, session, editor])

  // Focus title input on mount for new documents
  useEffect(() => {
    if (isNewDocument && titleInputRef.current) {
      setTimeout(() => {
        titleInputRef.current?.focus()
      }, 100)
    }
  }, [isNewDocument])

  const handleSave = async () => {
    if (!documentTitle.trim()) {
      toastError('Please enter a document title')
      return
    }

    if (!editor || !session?.user?.id) {
      toastError('Editor not initialized or user not authenticated')
      return
    }

    setSaving(true)

    try {
      const content = editor.getHTML()
      const companyId = session.user.company_id || ''

      if (!companyId) {
        toastError('User must be associated with a company')
        return
      }

      const result = await saveRichDocument(
        documentTitle.trim(),
        content,
        companyId,
        session.user.id,
        '/',
        isNewDocument ? undefined : documentId
      )

      if (result.success && result.document) {
        toastSuccess('Document saved successfully!')
        setLastSaved(new Date())
        
        // If this was a new document, redirect to the new document ID
        if (isNewDocument && result.document.id) {
          router.replace(`/documents/${result.document.id}`)
        }
      } else {
        toastError(result.error || 'Failed to save document')
      }
    } catch (err) {
      console.error('Error saving document:', err)
      toastError('Failed to save document', {
        description: err instanceof Error ? err.message : 'Please try again'
      })
    } finally {
      setSaving(false)
    }
  }

  // Quick insert actions
  const quickInsertActions = [
    { label: 'Heading 1', icon: Heading1, action: () => editor?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: Heading2, action: () => editor?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: Heading3, action: () => editor?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bullet List', icon: List, action: () => editor?.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', icon: ListOrdered, action: () => editor?.chain().focus().toggleOrderedList().run() },
    { label: 'To-do List', icon: CheckSquare, action: () => editor?.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: Quote, action: () => editor?.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', icon: Code, action: () => editor?.chain().focus().toggleCodeBlock().run() },
    { label: 'Table', icon: TableIcon, action: () => insertTable() },
    { label: 'Horizontal Rule', icon: Code2, action: () => editor?.chain().focus().setHorizontalRule().run() },
  ]

  const insertTable = () => {
    if (!editor) return
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

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

  if (loading) {
    return (
      <DashboardLayout activeTab="documents" onTabChange={() => {}} breadcrumbContext={{}}>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (!editor) {
    return null
  }

  return (
    <DashboardLayout activeTab="documents" onTabChange={() => {}} breadcrumbContext={{}}>
      <div className="min-h-screen bg-white dark:bg-gray-900">
        {/* Top Header Bar */}
        <div className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard?tab=documents')}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <Button variant="ghost" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add page
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Type className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Link2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Page Controls Row */}
          <div className="flex items-center gap-2 px-4 pb-2 flex-wrap">
            <Button variant="ghost" size="sm" className="h-7 text-sm gap-1">
              <Link2 className="h-3 w-3" />
              Link Task or Doc
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={`h-7 text-sm gap-1 ${isWiki ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : ''}`}
              onClick={() => setIsWiki(!isWiki)}
            >
              <CheckCircle2 className={`h-3 w-3 ${isWiki ? 'fill-current' : ''}`} />
              Mark Wiki
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-sm gap-1">
              <Palette className="h-3 w-3" />
              Add icon
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-sm gap-1">
              <Image className="h-3 w-3" />
              Add cover
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-sm gap-1">
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="max-w-4xl mx-auto">
          {/* Page Title */}
          <div className="px-16 py-6">
            <Input
              ref={titleInputRef}
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Untitled"
              className="text-5xl font-bold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>

          {/* Metadata */}
          <div className="px-16 pb-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {author && (
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{author}</span>
              </div>
            )}
            {lastSaved && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Last updated {format(lastSaved, 'MMM d')} at {format(lastSaved, 'h:mm a')}</span>
              </div>
            )}
          </div>

          {/* Toolbar */}
          <div className="sticky top-[73px] z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
            <div className="flex items-center gap-1 overflow-x-auto">
              {/* Notion-like Insert dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 gap-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-sm">Insert</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  {quickInsertActions.map((action) => {
                    const Icon = action.icon
                    return (
                      <DropdownMenuItem
                        key={action.label}
                        onClick={action.action}
                        className="cursor-pointer gap-2"
                      >
                        <Icon className="h-4 w-4" />
                        {action.label}
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
              
              {toolbarButtons.map((button, index) => {
                if ('separator' in button) {
                  return <div key={index} className="w-px h-6 bg-gray-300 dark:bg-gray-600 mx-1" />
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
              
              <div className="flex-1" />
              
              <Button
                variant="orange"
                size="sm"
                onClick={handleSave}
                disabled={!documentTitle.trim() || saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Editor */}
          <div className="min-h-[600px] pb-16">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

