'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { saveRichDocument, getRichDocument, getCompanyDocuments, type Document } from '@/lib/database-functions'
import { fetchCompanyTasks } from '@/lib/company-detail-functions'
import { supabase } from '@/lib/supabase'
import { toastSuccess, toastError } from '@/lib/toast'
import { format } from 'date-fns'
import DashboardLayout from '@/components/dashboard-layout'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Search, FileText, CheckSquare as TaskIcon, X } from 'lucide-react'
import type { TaskWithDetails } from '@/lib/supabase'

interface DocumentEditorPageProps {
  documentId: string
}

export default function DocumentEditorPage({ documentId }: DocumentEditorPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [documentTitle, setDocumentTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [author, setAuthor] = useState<string>('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const isNewDocument = documentId === 'new'
  const [isWiki, setIsWiki] = useState(false)
  const [documentIcon, setDocumentIcon] = useState<string>('')
  const [coverImage, setCoverImage] = useState<string>('')
  
  // Get current space ID from URL or use user's company_id
  // For non-admin users, always use their company_id as the space
  // For admin users, ONLY use the space param from URL (don't fall back to company_id)
  const spaceParam = searchParams?.get('space')
  const isAdmin = session?.user?.role === 'admin'
  const currentSpaceId = spaceParam || (!isAdmin && session?.user?.company_id ? session.user.company_id : null)
  
  // Modal states
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showIconModal, setShowIconModal] = useState(false)
  const [showCoverModal, setShowCoverModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  
  // Link modal state
  const [linkSearchTerm, setLinkSearchTerm] = useState('')
  const [linkType, setLinkType] = useState<'task' | 'doc'>('task')
  const [tasks, setTasks] = useState<TaskWithDetails[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loadingLinks, setLoadingLinks] = useState(false)
  
  const handleTabChange = (tab: string) => {
    const spaceQuery = currentSpaceId ? `&space=${currentSpaceId}` : ''
    router.push(`/dashboard?tab=${tab}${spaceQuery}`)
  }
  
  const handleSpaceChange = (spaceId: string | null) => {
    if (spaceId === null) {
      router.push('/dashboard?tab=spaces')
    } else {
      router.push(`/dashboard?tab=documents&space=${spaceId}`)
    }
  }

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
        
        // If this was a new document, redirect to the new document ID with space context
        if (isNewDocument && result.document.id) {
          const spaceQuery = currentSpaceId ? `?space=${currentSpaceId}` : ''
          router.replace(`/documents/${result.document.id}${spaceQuery}`)
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

  // Load tasks and documents for linking
  useEffect(() => {
    if (showLinkModal && currentSpaceId) {
      loadLinkableItems()
    }
  }, [showLinkModal, linkType, currentSpaceId])

  const loadLinkableItems = async () => {
    if (!currentSpaceId) return
    
    setLoadingLinks(true)
    try {
      if (linkType === 'task') {
        // Fetch tasks for the current space (company)
        const tasksData = await fetchCompanyTasks(currentSpaceId)
        setTasks(tasksData)
      } else {
        // Fetch documents for the current space (company)
        const docsResult = await getCompanyDocuments(currentSpaceId)
        if (docsResult.success && docsResult.documents) {
          setDocuments(docsResult.documents)
        }
      }
    } catch (err) {
      console.error('Error loading linkable items:', err)
    } finally {
      setLoadingLinks(false)
    }
  }

  const handleLinkItem = (item: TaskWithDetails | Document) => {
    if (!editor) return
    
    if (linkType === 'task') {
      const task = item as TaskWithDetails
      const url = `/dashboard?tab=projects&taskId=${task.id}`
      editor.chain().focus().insertContent(`<a href="${url}">${task.title}</a>`).run()
      toastSuccess('Task linked successfully')
    } else {
      const doc = item as Document
      const url = `/documents/${doc.id}`
      editor.chain().focus().insertContent(`<a href="${url}">${doc.name}</a>`).run()
      toastSuccess('Document linked successfully')
    }
    
    setShowLinkModal(false)
    setLinkSearchTerm('')
  }

  const handleAddIcon = (emoji: string) => {
    setDocumentIcon(emoji)
    setShowIconModal(false)
    toastSuccess('Icon added')
  }

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoverImage(reader.result as string)
        toastSuccess('Cover image added')
      }
      reader.readAsDataURL(file)
    }
  }

  const filteredTasks = tasks.filter(task => 
    task.title.toLowerCase().includes(linkSearchTerm.toLowerCase())
  )

  const filteredDocuments = documents.filter(doc => 
    doc.name.toLowerCase().includes(linkSearchTerm.toLowerCase())
  )

  const commonEmojis = ['📄', '📝', '📋', '📑', '📊', '📈', '📉', '💡', '⭐', '🔥', '✨', '🎯', '🚀', '💼', '📌', '🔖', '📎', '📐', '📏', '📓', '📔', '📕', '📗', '📘', '📙', '📚', '📖', '🔍', '💬', '📞']

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
      <DashboardLayout 
        activeTab="documents" 
        onTabChange={handleTabChange} 
        breadcrumbContext={{}} 
        currentSpaceId={currentSpaceId}
        onSpaceChange={handleSpaceChange}
      >
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
    <DashboardLayout 
      activeTab="documents" 
      onTabChange={handleTabChange} 
      breadcrumbContext={{}} 
      currentSpaceId={currentSpaceId}
      onSpaceChange={handleSpaceChange}
    >
      <div className="h-screen flex flex-col bg-white dark:bg-gray-900 overflow-hidden">
        {/* Top Header Bar - Fixed */}
        <div className="border-b bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const spaceQuery = currentSpaceId ? `&space=${currentSpaceId}` : ''
                  router.push(`/dashboard?tab=documents${spaceQuery}`)
                }}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  const spaceQuery = currentSpaceId ? `?space=${currentSpaceId}` : ''
                  router.push(`/documents/new${spaceQuery}`)
                }}
              >
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-sm gap-1"
              onClick={() => setShowLinkModal(true)}
            >
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
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-sm gap-1"
              onClick={() => setShowIconModal(true)}
            >
              <Palette className="h-3 w-3" />
              Add icon
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-sm gap-1"
              onClick={() => setShowCoverModal(true)}
            >
              <Image className="h-3 w-3" />
              Add cover
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-7 text-sm gap-1"
              onClick={() => setShowSettingsModal(true)}
            >
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
          {/* Cover Image */}
          {coverImage && (
            <div className="w-full h-64 mb-6 relative">
              <img 
                src={coverImage} 
                alt="Cover" 
                className="w-full h-full object-cover"
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => setCoverImage('')}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Page Title */}
          <div className="px-16 py-6 flex items-center gap-3">
            {documentIcon && (
              <span className="text-5xl">{documentIcon}</span>
            )}
            <Input
              ref={titleInputRef}
              value={documentTitle}
              onChange={(e) => setDocumentTitle(e.target.value)}
              placeholder="Untitled"
              className="text-5xl font-bold border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-auto py-2 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 flex-1"
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

          {/* Toolbar - Sticky within scrollable area */}
          <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
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
      </div>

      {/* Link Task or Doc Modal */}
      <Dialog open={showLinkModal} onOpenChange={setShowLinkModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Link Task or Document</DialogTitle>
            <DialogDescription>
              Search and link a task or document to this page
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={linkType === 'task' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLinkType('task')}
              >
                <TaskIcon className="h-4 w-4 mr-2" />
                Tasks
              </Button>
              <Button
                variant={linkType === 'doc' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setLinkType('doc')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Documents
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Search ${linkType === 'task' ? 'tasks' : 'documents'}...`}
                value={linkSearchTerm}
                onChange={(e) => setLinkSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {loadingLinks ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : linkType === 'task' ? (
                filteredTasks.length > 0 ? (
                  filteredTasks.map((task) => (
                    <Button
                      key={task.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleLinkItem(task)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{task.title}</span>
                      </div>
                    </Button>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No tasks found</p>
                )
              ) : (
                filteredDocuments.length > 0 ? (
                  filteredDocuments.map((doc) => (
                    <Button
                      key={doc.id}
                      variant="ghost"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleLinkItem(doc)}
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{doc.name}</span>
                        <span className="text-xs text-gray-500">Document</span>
                      </div>
                    </Button>
                  ))
                ) : (
                  <p className="text-center text-gray-500 py-8">No documents found</p>
                )
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Icon Modal */}
      <Dialog open={showIconModal} onOpenChange={setShowIconModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Icon</DialogTitle>
            <DialogDescription>
              Select an emoji to use as the document icon
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-2 max-h-[400px] overflow-y-auto p-4">
            {commonEmojis.map((emoji) => (
              <Button
                key={emoji}
                variant="ghost"
                className="h-12 w-12 text-2xl hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => handleAddIcon(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIconModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Cover Modal */}
      <Dialog open={showCoverModal} onOpenChange={setShowCoverModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Cover Image</DialogTitle>
            <DialogDescription>
              Upload an image to use as the cover
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="cover-upload">Upload Image</Label>
              <Input
                id="cover-upload"
                type="file"
                accept="image/*"
                onChange={handleCoverImageChange}
                className="mt-2"
              />
            </div>
            {coverImage && (
              <div className="relative w-full h-32">
                <img 
                  src={coverImage} 
                  alt="Cover preview" 
                  className="w-full h-full object-cover rounded"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCoverModal(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettingsModal} onOpenChange={setShowSettingsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Document Settings</DialogTitle>
            <DialogDescription>
              Configure document preferences
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="wiki-toggle">Mark as Wiki</Label>
              <Button
                variant={isWiki ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsWiki(!isWiki)}
              >
                {isWiki ? 'Yes' : 'No'}
              </Button>
            </div>
            <div>
              <Label htmlFor="document-description">Description (optional)</Label>
              <Textarea
                id="document-description"
                placeholder="Add a description for this document..."
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettingsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}

