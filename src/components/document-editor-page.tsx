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
import { ModernDashboardLayout } from '@/components/modern-dashboard-layout'
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
  inline?: boolean
  spaceId?: string | null
}

export default function DocumentEditorPage({ documentId, inline = false, spaceId: propSpaceId }: DocumentEditorPageProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()
  const [documentTitle, setDocumentTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [author, setAuthor] = useState<string>('')
  const isNewDocument = documentId === 'new'
  const [isWiki, setIsWiki] = useState(false)
  const [documentIcon, setDocumentIcon] = useState<string>('')
  const [coverImage, setCoverImage] = useState<string>('')
  const [isMounted, setIsMounted] = useState(false)
  const [showFloatingToolbar, setShowFloatingToolbar] = useState(false)
  const [showSlashMenu, setShowSlashMenu] = useState(false)
  const [slashCommandQuery, setSlashCommandQuery] = useState('')
  const [selectedSlashIndex, setSelectedSlashIndex] = useState(0)
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0, isAbove: true })
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const [hasCalculatedPosition, setHasCalculatedPosition] = useState(false)
  const floatingToolbarRef = useRef<HTMLDivElement>(null)
  const slashMenuRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)
  const showSlashMenuRef = useRef(false)
  const slashCommandQueryRef = useRef('')
  const selectedSlashIndexRef = useRef(0)
  const lastToolbarPositionRef = useRef({ top: 0, left: 0 })
  const isFirstPositionRef = useRef(true)
  
  // Sync refs with state
  useEffect(() => {
    showSlashMenuRef.current = showSlashMenu
  }, [showSlashMenu])
  
  useEffect(() => {
    slashCommandQueryRef.current = slashCommandQuery
  }, [slashCommandQuery])
  
  useEffect(() => {
    selectedSlashIndexRef.current = selectedSlashIndex
  }, [selectedSlashIndex])
  
  // Ensure we're on the client before rendering editor
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  // Get current space ID from prop, URL, or use user's company_id
  // For non-admin users, always use their company_id as the space
  // For admin users, ONLY use the space param from URL (don't fall back to company_id)
  const spaceParam = propSpaceId || searchParams?.get('space')
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
  
  const handleModernTabChange = (tabId: string) => {
    // Map modern tab IDs to internal tab names
    const tabMap: Record<string, string> = {
      'overview': 'dashboard',
      'tasks': 'projects',
      'documents': 'documents',
      'calendar': 'company-calendars',
      'reports': 'reports',
      'users': 'admin',
      'settings': 'settings',
    }
    const internalTab = tabMap[tabId] || 'dashboard'
    handleTabChange(internalTab)
  }

  // Define quick insert actions - needs to be before editor for handleKeyDown
  const getQuickInsertActions = (editorInstance: typeof editor) => [
    { label: 'Heading 1', icon: Heading1, action: () => editorInstance?.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: 'Heading 2', icon: Heading2, action: () => editorInstance?.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: 'Heading 3', icon: Heading3, action: () => editorInstance?.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: 'Bullet List', icon: List, action: () => editorInstance?.chain().focus().toggleBulletList().run() },
    { label: 'Numbered List', icon: ListOrdered, action: () => editorInstance?.chain().focus().toggleOrderedList().run() },
    { label: 'To-do List', icon: CheckSquare, action: () => editorInstance?.chain().focus().toggleTaskList().run() },
    { label: 'Quote', icon: Quote, action: () => editorInstance?.chain().focus().toggleBlockquote().run() },
    { label: 'Code Block', icon: Code, action: () => editorInstance?.chain().focus().toggleCodeBlock().run() },
    { label: 'Table', icon: TableIcon, action: () => {
      if (!editorInstance) return
      editorInstance.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    }},
    { label: 'Horizontal Rule', icon: Code2, action: () => editorInstance?.chain().focus().setHorizontalRule().run() },
  ]

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Placeholder.configure({
        placeholder: 'Type "/" for commands or just start typing...',
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline hover:text-primary/80',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
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
        class: 'prose prose-lg max-w-none focus:outline-none min-h-[600px] py-4 dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed [&_h1]:text-5xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-0 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-base [&_p]:mb-4',
      },
      handleKeyDown: (view, event) => {
        // Handle Escape to close menus
        if (event.key === 'Escape') {
          setShowSlashMenu(false)
          setShowFloatingToolbar(false)
          return false
        }
        
        // Handle Enter key in task items - ensure it creates a new task item like bullet lists
        if (event.key === 'Enter' && !event.shiftKey) {
          const { state } = view
          const { selection } = state
          const { $from } = selection
          
          // Check if we're in a task item
          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)
            if (node.type.name === 'taskItem') {
              // Let TipTap's default behavior handle Enter in task items
              // It should create a new task item, just like bullet lists
              return false
            }
          }
        }
        
        // Handle "/" command menu
        if (event.key === '/' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
          const { state } = view
          const { selection } = state
          const { $from } = selection
          const textBefore = $from.nodeBefore?.textContent || ''
          
          // Only trigger if at start of line or after space
          if ($from.parentOffset === 0 || textBefore.endsWith(' ')) {
            // Don't prevent default, let it insert "/"
            return false
          }
        }
        
        // Handle arrow keys in slash menu
        if (showSlashMenuRef.current && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
          event.preventDefault()
          const editorInstance = editorRef.current
          if (!editorInstance) return false
          const actions = getQuickInsertActions(editorInstance)
          const query = slashCommandQueryRef.current
          const filteredActions = actions.filter(action => 
            action.label.toLowerCase().includes(query)
          )
          
          if (filteredActions.length > 0) {
            const currentIndex = selectedSlashIndexRef.current
            if (event.key === 'ArrowDown') {
              setSelectedSlashIndex((currentIndex + 1) % filteredActions.length)
            } else {
              setSelectedSlashIndex((currentIndex - 1 + filteredActions.length) % filteredActions.length)
            }
          }
          return true
        }
        
        // Handle Enter to select from slash menu
        if (event.key === 'Enter' && showSlashMenuRef.current) {
          event.preventDefault()
          event.stopPropagation()
          const editorInstance = editorRef.current
          if (!editorInstance) return true
          
          // Use the exact same filtering logic as the UI
          const actions = getQuickInsertActions(editorInstance)
          const query = slashCommandQueryRef.current
          const filteredActions = actions.filter(action => 
            action.label.toLowerCase().includes(query.toLowerCase())
          )
          const currentIndex = selectedSlashIndexRef.current
          
          // Ensure index is within bounds
          const validIndex = Math.max(0, Math.min(currentIndex, filteredActions.length - 1))
          
          if (filteredActions.length > 0 && filteredActions[validIndex]) {
            const action = filteredActions[validIndex]
            
            // Remove the slash command text
            const { from } = view.state.selection
            let searchStart = from - 1
            
            // Find the start of the slash command (look backwards for '/' or whitespace)
            while (searchStart > 0) {
              const char = view.state.doc.textBetween(searchStart - 1, searchStart)
              if (char === ' ' || char === '\n') {
                searchStart++
                break
              }
              if (searchStart === from - 1 && char === '/') {
                break
              }
              searchStart--
            }
            
            // Delete the command text including the '/'
            if (searchStart < from) {
              view.dispatch(view.state.tr.delete(searchStart, from))
            }
            
            // Execute the action
            setTimeout(() => {
              try {
                action.action()
                setShowSlashMenu(false)
                setSlashCommandQuery('')
                setSelectedSlashIndex(0)
              } catch (error) {
                console.error('Error executing slash command:', error)
                setShowSlashMenu(false)
                setSlashCommandQuery('')
                setSelectedSlashIndex(0)
              }
            }, 0)
          } else {
            // If no valid action, just close the menu
            setShowSlashMenu(false)
            setSlashCommandQuery('')
            setSelectedSlashIndex(0)
          }
          return true
        }
        
        return false
      },
      handleDOMEvents: {
        mouseup: () => {
          // Let onSelectionUpdate handle positioning - this just ensures toolbar shows/hides correctly
          // Position updates are handled smoothly by onSelectionUpdate during selection
          return false
        },
      },
    },
    onUpdate: ({ editor }) => {
      // Check if editor is mounted and ready
      if (!editor || !editor.view) {
        return
      }
      
      // Check for "/" command - simplified detection
      const { from } = editor.state.selection
      const { $from } = editor.state.selection
      
      // Get the paragraph/block node we're in
      const paragraph = $from.node($from.depth)
      const paragraphStart = $from.start($from.depth)
      const paragraphEnd = $from.end($from.depth)
      
      // Get text from start of paragraph to cursor
      const textToCursor = editor.state.doc.textBetween(paragraphStart, from)
      
      // Find the last "/" in this paragraph
      const lastSlashIndex = textToCursor.lastIndexOf('/')
      
      if (lastSlashIndex >= 0) {
        // Get text before the "/"
        const textBeforeSlash = textToCursor.substring(0, lastSlashIndex)
        // Get command text after "/"
        const commandText = textToCursor.substring(lastSlashIndex)
        const query = commandText.slice(1).toLowerCase()
        
        // Check if "/" is at start of paragraph or after whitespace only
        const isAtStart = lastSlashIndex === 0
        const isAfterWhitespace = textBeforeSlash.trim() === '' && (textBeforeSlash === '' || textBeforeSlash.endsWith(' ') || textBeforeSlash.endsWith('\n'))
        
        if (isAtStart || isAfterWhitespace) {
          try {
            const view = (editor as any).view
            if (view && typeof view.coordsAtPos === 'function') {
              const coords = view.coordsAtPos(from)
              
              if (coords) {
                setSlashMenuPosition({
                  top: coords.bottom + 5,
                  left: coords.left,
                })
                setSlashCommandQuery(query)
                setSelectedSlashIndex(0)
                setShowSlashMenu(true)
              } else {
                setShowSlashMenu(false)
              }
            } else {
              setShowSlashMenu(false)
            }
          } catch (error) {
            // Silently handle - view may not be mounted yet
            setShowSlashMenu(false)
          }
        } else {
          setShowSlashMenu(false)
          setSlashCommandQuery('')
          setSelectedSlashIndex(0)
        }
      } else {
        // No "/" found, hide menu
        setShowSlashMenu(false)
        setSlashCommandQuery('')
        setSelectedSlashIndex(0)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      // This fires when selection changes
      // Check if editor is mounted and ready
      if (!editor || !editor.view) {
        return
      }
      
      const { from, to } = editor.state.selection
      const hasSelection = from !== to
      
      if (hasSelection) {
        // Use requestAnimationFrame to batch position updates and reduce jitter
        requestAnimationFrame(() => {
          try {
            // Access the editor's view through the editor instance
            const view = (editor as any).view
            if (view && typeof view.coordsAtPos === 'function') {
              // Use the end position (to) so toolbar follows the cursor as user drags
              let centerX = 0
              let centerY = 0
              
              // Use end position to follow the selection cursor
              const endCoords = view.coordsAtPos(to)
              if (!endCoords) {
                setShowFloatingToolbar(false)
                return
              }
              centerX = endCoords.left
              centerY = endCoords.top
              
              // Get actual toolbar width from ref if available, otherwise estimate
              const toolbarHeight = 40
              const padding = 10
              let toolbarWidth = 400 // Default estimate
              
              // Try to get actual toolbar width from the ref
              if (floatingToolbarRef.current) {
                const toolbarRect = floatingToolbarRef.current.getBoundingClientRect()
                toolbarWidth = toolbarRect.width || 400
              }
              
              // Get viewport dimensions
              const viewportWidth = window.innerWidth
              const viewportHeight = window.innerHeight
              
              // Get sidebar width - check multiple possible selectors
              let sidebarWidth = 0
              
              // Method 1: Check editor container's left offset (most reliable)
              const editorElement = view.dom.closest('.ProseMirror') || view.dom
              const editorContainer = editorElement.closest('[class*="max-w"], [class*="container"], main, [role="main"]')
              if (editorContainer) {
                const containerRect = editorContainer.getBoundingClientRect()
                if (containerRect.left > 0) {
                  sidebarWidth = containerRect.left
                }
              }
              
              // Method 2: Try multiple selectors to find the sidebar
              if (sidebarWidth === 0) {
                const sidebarSelectors = [
                  '[data-slot="sidebar"]',
                  '.bg-sidebar.border-r',
                  '.w-60.bg-sidebar',
                  '.w-16.bg-sidebar',
                  'aside[class*="w-"]',
                  '.parrot-sidebar-gradient',
                  'div[class*="sidebar"]'
                ]
                
                for (const selector of sidebarSelectors) {
                  const sidebarElement = document.querySelector(selector)
                  if (sidebarElement) {
                    const sidebarRect = sidebarElement.getBoundingClientRect()
                    if (sidebarRect.width > 0 && sidebarRect.left === 0) {
                      sidebarWidth = sidebarRect.width
                      break
                    }
                  }
                }
              }
              
              // Method 3: Check for any fixed/absolute element at left edge
              if (sidebarWidth === 0) {
                const editorRect = editorElement.getBoundingClientRect()
                if (editorRect.left > 0) {
                  sidebarWidth = editorRect.left
                }
              }
              
              // Calculate horizontal position with boundary checks
              // Position toolbar at start of selection, offset slightly to the right
              let finalLeft = centerX + 20 // Small offset so it doesn't overlap the text
              const halfToolbarWidth = toolbarWidth / 2
              const leftBoundary = sidebarWidth + padding
              
              // Check left boundary (accounting for sidebar)
              if (finalLeft - halfToolbarWidth < leftBoundary) {
                finalLeft = halfToolbarWidth + leftBoundary
              }
              // Check right boundary
              else if (finalLeft + halfToolbarWidth > viewportWidth - padding) {
                finalLeft = viewportWidth - halfToolbarWidth - padding
              }
              
              // Calculate vertical position with boundary checks
              let finalTop = centerY - toolbarHeight - padding
              let isAbove = true
              const spaceAbove = centerY
              const spaceBelow = viewportHeight - centerY
              
              // If not enough space above, show below instead
              if (spaceAbove < toolbarHeight + padding && spaceBelow > toolbarHeight + padding) {
                finalTop = centerY + padding
                isAbove = false
              }
              // If not enough space above or below, position at top of viewport
              else if (spaceAbove < toolbarHeight + padding && spaceBelow < toolbarHeight + padding) {
                finalTop = padding
                isAbove = true
              }
              
              // Always update position smoothly during selection - no threshold to prevent snapping
              lastToolbarPositionRef.current = { top: finalTop, left: finalLeft }
              isFirstPositionRef.current = false
              setHasCalculatedPosition(true)
              setToolbarPosition({
                top: finalTop,
                left: finalLeft,
                isAbove,
              })
              setShowFloatingToolbar(true)
            } else {
              setShowFloatingToolbar(false)
            }
          } catch (error) {
            // If coordinates can't be calculated, hide toolbar
            console.error('Error calculating toolbar position:', error)
            setShowFloatingToolbar(false)
          }
        })
      } else {
        setShowFloatingToolbar(false)
        // Reset flags when selection is cleared
        isFirstPositionRef.current = true
        setHasCalculatedPosition(false)
      }
    },
  })

  // Add table controls when table is selected
  useEffect(() => {
    if (!editor) return

    const addTableControls = () => {
      // Check if we're in a table using TipTap's isActive
      if (!editor.isActive('table')) {
        // Not in a table, clean up any existing wrappers
        document.querySelectorAll('.table-controls-wrapper').forEach(el => {
          const table = el.querySelector('table')
          if (table && el.parentNode && el.parentNode.contains(el)) {
            try {
              el.parentNode.insertBefore(table, el)
              el.remove()
            } catch (error) {
              // If insertBefore fails, just remove the wrapper
              console.warn('Failed to unwrap table:', error)
              el.remove()
            }
          } else {
            el.remove()
          }
        })
        return
      }

      // Get the table node from selection
      const { selection } = editor.state
      const { $anchor } = selection
      
      let tableNode = null
      let tablePos = null

      // Find the table node
      for (let depth = $anchor.depth; depth > 0; depth--) {
        const node = $anchor.node(depth)
        if (node.type.name === 'table') {
          tableNode = node
          tablePos = $anchor.start(depth) - 1
          break
        }
      }

      if (!tableNode || tablePos === null) return

      // Get the table DOM element
      const view = (editor as any).view
      const dom = view.nodeDOM(tablePos + 1)
      if (!dom) return

      const tableElement = dom instanceof HTMLElement && dom.tagName === 'TABLE' 
        ? dom 
        : (dom as HTMLElement).closest('table')
      
      if (!tableElement || !(tableElement instanceof HTMLTableElement)) return

      // Check if controls already exist for this table
      if (tableElement.parentElement?.classList.contains('table-controls-wrapper')) {
        return
      }

      // Remove existing controls for other tables (not this one)
      document.querySelectorAll('.table-controls-wrapper').forEach(el => {
        const table = el.querySelector('table')
        // Only unwrap if it's not the current table
        if (table && table !== tableElement && el.parentNode && el.parentNode.contains(el)) {
          try {
            el.parentNode.insertBefore(table, el)
            el.remove()
          } catch (error) {
            // If insertBefore fails, just remove the wrapper
            console.warn('Failed to unwrap table:', error)
            el.remove()
          }
        } else if (!table) {
          // No table found, just remove wrapper
          el.remove()
        }
      })

      // Wrap table in controls wrapper
      const wrapper = document.createElement('div')
      wrapper.className = 'table-controls-wrapper'
      
      // Create bottom controls (add row)
      const bottomControls = document.createElement('div')
      bottomControls.className = 'table-bottom-controls'
      const addRowAfterBtn = document.createElement('button')
      addRowAfterBtn.innerHTML = '+'
      addRowAfterBtn.title = 'Add row below'
      addRowAfterBtn.style.fontSize = '14px'
      addRowAfterBtn.style.fontWeight = 'bold'
      addRowAfterBtn.style.pointerEvents = 'auto'
      addRowAfterBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Focus the editor view first
        const view = (editor as any).view
        if (view && view.dom) {
          view.dom.focus()
        }
        
        // Find the last cell and set selection to it, then run command
        const lastRow = tableElement.rows[tableElement.rows.length - 1]
        const lastCell = lastRow?.cells[lastRow.cells.length - 1]
        
        if (lastCell && view) {
          try {
            const cellPos = view.posAtDOM(lastCell, 0)
            if (cellPos !== null && cellPos !== undefined && cellPos > 0) {
              // Set selection and run command in one chain
              editor.chain()
                .setTextSelection(cellPos)
                .addRowAfter()
                .run()
            } else {
              // Fallback: just run command
              editor.chain().focus().addRowAfter().run()
            }
          } catch (error) {
            // Fallback: just run command
            editor.chain().focus().addRowAfter().run()
          }
        } else {
          // Fallback: just run command
          editor.chain().focus().addRowAfter().run()
        }
      }, true)
      bottomControls.appendChild(addRowAfterBtn)

      // Create right controls (add column)
      const rightControls = document.createElement('div')
      rightControls.className = 'table-right-controls'
      const addColAfterBtn = document.createElement('button')
      addColAfterBtn.innerHTML = '+'
      addColAfterBtn.title = 'Add column after'
      addColAfterBtn.style.fontSize = '14px'
      addColAfterBtn.style.fontWeight = 'bold'
      addColAfterBtn.style.pointerEvents = 'auto'
      addColAfterBtn.setAttribute('tabindex', '-1')
      addColAfterBtn.setAttribute('type', 'button')
      addColAfterBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Store reference to tableElement and editor in closure
        const currentTableElement = tableElement
        const currentEditor = editor
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const view = (currentEditor as any).view
          if (view && view.dom) {
            view.dom.focus()
          }
          
          // Find the last cell and set selection to it, then run command
          const lastRow = currentTableElement.rows[currentTableElement.rows.length - 1]
          const lastCell = lastRow?.cells[lastRow.cells.length - 1]
          
          if (lastCell && view) {
            try {
              const cellPos = view.posAtDOM(lastCell, 0)
              if (cellPos !== null && cellPos !== undefined && cellPos > 0) {
                // Set selection and run command in one chain
                currentEditor.chain()
                  .setTextSelection(cellPos)
                  .addColumnAfter()
                  .run()
              } else {
                // Fallback: just run command
                currentEditor.chain().focus().addColumnAfter().run()
              }
            } catch (error) {
              // Fallback: just run command
              currentEditor.chain().focus().addColumnAfter().run()
            }
          } else {
            // Fallback: just run command
            currentEditor.chain().focus().addColumnAfter().run()
          }
        })
      }, true)
      rightControls.appendChild(addColAfterBtn)

      // Create delete button
      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'table-delete-button'
      deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>'
      deleteBtn.title = 'Delete table'
      deleteBtn.style.pointerEvents = 'auto'
      deleteBtn.setAttribute('tabindex', '-1')
      deleteBtn.setAttribute('type', 'button')
      deleteBtn.addEventListener('mousedown', (e) => {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        // Store reference to tableElement and editor in closure
        const currentTableElement = tableElement
        const currentEditor = editor
        
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          const view = (currentEditor as any).view
          if (view && view.dom) {
            view.dom.focus()
          }
          
          // Find the first cell and set selection to it, then run command
          const firstRow = currentTableElement.rows[0]
          const firstCell = firstRow?.cells[0]
          
          if (firstCell && view) {
            try {
              const cellPos = view.posAtDOM(firstCell, 0)
              if (cellPos !== null && cellPos !== undefined && cellPos > 0) {
                // Set selection and run command in one chain
                currentEditor.chain()
                  .setTextSelection(cellPos)
                  .deleteTable()
                  .run()
              } else {
                // Fallback: just run command
                currentEditor.chain().focus().deleteTable().run()
              }
            } catch (error) {
              // Fallback: just run command
              currentEditor.chain().focus().deleteTable().run()
            }
          } else {
            // Fallback: just run command
            currentEditor.chain().focus().deleteTable().run()
          }
        })
      }, true)

      // Insert wrapper
      const parent = tableElement.parentNode
      if (parent) {
        parent.insertBefore(wrapper, tableElement)
        wrapper.appendChild(tableElement)
        wrapper.appendChild(bottomControls)
        wrapper.appendChild(rightControls)
        wrapper.appendChild(deleteBtn)
      }
    }

    const handleSelectionUpdate = () => {
      requestAnimationFrame(() => {
        setTimeout(addTableControls, 50)
      })
    }

    const handleUpdate = () => {
      requestAnimationFrame(() => {
        setTimeout(addTableControls, 50)
      })
    }

    editor.on('selectionUpdate', handleSelectionUpdate)
    editor.on('update', handleUpdate)

    // Initial check after a short delay to ensure DOM is ready
    setTimeout(addTableControls, 100)

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
      editor.off('update', handleUpdate)
      // Safely clean up all table wrappers
      document.querySelectorAll('.table-controls-wrapper').forEach(el => {
        const table = el.querySelector('table')
        if (table && el.parentNode && el.parentNode.contains(el)) {
          try {
            el.parentNode.insertBefore(table, el)
            el.remove()
          } catch (error) {
            // If insertBefore fails, just remove the wrapper
            console.warn('Failed to unwrap table in cleanup:', error)
            el.remove()
          }
        } else {
          el.remove()
        }
      })
    }
  }, [editor])

  // Recalculate toolbar position when it becomes visible to account for actual width
  useEffect(() => {
    if (showFloatingToolbar && floatingToolbarRef.current && editor && editor.view) {
      requestAnimationFrame(() => {
        try {
          const { from, to } = editor.state.selection
          const hasSelection = from !== to
          
          if (!hasSelection) return
          
          const view = (editor as any).view
          if (!view || typeof view.coordsAtPos !== 'function') return
          
          // Use the end position (to) so toolbar follows the cursor as user drags
          let centerX = 0
          let centerY = 0
          
          // Use end position to follow the selection cursor
          const endCoords = view.coordsAtPos(to)
          if (!endCoords) return
          centerX = endCoords.left
          centerY = endCoords.top
          
          // Get actual toolbar width
          const toolbarRect = floatingToolbarRef.current?.getBoundingClientRect()
          const toolbarWidth = toolbarRect?.width || 400
          const toolbarHeight = 40
          const padding = 10
          
          // Get viewport dimensions
          const viewportWidth = window.innerWidth
          const viewportHeight = window.innerHeight
          
          // Get sidebar width - check editor container's left offset (most reliable)
          let sidebarWidth = 0
          const editorElement = view.dom.closest('.ProseMirror') || view.dom
          const editorContainer = editorElement.closest('[class*="max-w"], [class*="container"], main, [role="main"]')
          if (editorContainer) {
            const containerRect = editorContainer.getBoundingClientRect()
            if (containerRect.left > 0) {
              sidebarWidth = containerRect.left
            }
          }
          
          // Fallback: Try multiple selectors to find the sidebar
          if (sidebarWidth === 0) {
            const sidebarSelectors = [
              '[data-slot="sidebar"]',
              '.bg-sidebar.border-r',
              '.w-60.bg-sidebar',
              '.w-16.bg-sidebar',
              'aside[class*="w-"]',
              '.parrot-sidebar-gradient',
              'div[class*="sidebar"]'
            ]
            
            for (const selector of sidebarSelectors) {
              const sidebarElement = document.querySelector(selector)
              if (sidebarElement) {
                const sidebarRect = sidebarElement.getBoundingClientRect()
                if (sidebarRect.width > 0 && sidebarRect.left === 0) {
                  sidebarWidth = sidebarRect.width
                  break
                }
              }
            }
          }
          
          // Final fallback: Use editor element's left offset
          if (sidebarWidth === 0) {
            const editorRect = editorElement.getBoundingClientRect()
            if (editorRect.left > 0) {
              sidebarWidth = editorRect.left
            }
          }
          
          // Calculate horizontal position with boundary checks
          // Position toolbar at start of selection, offset slightly to the right
          let finalLeft = centerX + 20 // Small offset so it doesn't overlap the text
          const halfToolbarWidth = toolbarWidth / 2
          const leftBoundary = sidebarWidth + padding
          
          // Check left boundary (accounting for sidebar)
          if (finalLeft - halfToolbarWidth < leftBoundary) {
            finalLeft = halfToolbarWidth + leftBoundary
          }
          // Check right boundary
          else if (finalLeft + halfToolbarWidth > viewportWidth - padding) {
            finalLeft = viewportWidth - halfToolbarWidth - padding
          }
          
          // Calculate vertical position
          let finalTop = centerY - toolbarHeight - padding
          let isAbove = true
          const spaceAbove = centerY
          const spaceBelow = viewportHeight - centerY
          
          if (spaceAbove < toolbarHeight + padding && spaceBelow > toolbarHeight + padding) {
            finalTop = centerY + padding
            isAbove = false
          } else if (spaceAbove < toolbarHeight + padding && spaceBelow < toolbarHeight + padding) {
            finalTop = padding
            isAbove = true
          }
          
          // Update position smoothly - use small threshold only to prevent micro-jitter
          const threshold = 2
          const lastPos = lastToolbarPositionRef.current
          const hasSignificantChange = 
            Math.abs(finalTop - lastPos.top) > threshold || 
            Math.abs(finalLeft - lastPos.left) > threshold
          
          if (hasSignificantChange) {
            lastToolbarPositionRef.current = { top: finalTop, left: finalLeft }
            setHasCalculatedPosition(true)
            setToolbarPosition({
              top: finalTop,
              left: finalLeft,
              isAbove,
            })
          }
        } catch (error) {
          console.error('Error recalculating toolbar position:', error)
        }
      })
    }
  }, [showFloatingToolbar, editor])

  // Load existing document if editing
  useEffect(() => {
    if (!isNewDocument && session?.user?.id) {
      const loadDocument = async () => {
        setLoading(true)
        try {
          const result = await getRichDocument(documentId)
          if (result.success && result.document) {
            // Set title from document, but also include it in editor content as first heading
            setDocumentTitle(result.document.title)
            if (editor) {
              // If content exists, use it; otherwise create a heading with the title
              const content = result.document.content || ''
              if (content) {
                editor.commands.setContent(content)
              } else if (result.document.title) {
                editor.commands.setContent(`<h1>${result.document.title}</h1>`)
              }
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
    } else if (isNewDocument) {
      // For new documents, set loading to false immediately
      setLoading(false)
      if (session?.user) {
        setAuthor(session.user.name || session.user.email || 'Unknown')
      }
    }
  }, [documentId, isNewDocument, session, editor])

  // Focus editor on mount for new documents
  useEffect(() => {
    if (isNewDocument && editor && !loading) {
      setTimeout(() => {
        editor.commands.focus()
        // Insert a heading placeholder for the title
        editor.commands.insertContent('<h1>Untitled</h1><p></p>')
        // Select "Untitled" so user can immediately start typing
        editor.commands.setTextSelection({ from: 1, to: 9 })
      }, 100)
    }
  }, [isNewDocument, editor, loading])

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (
        floatingToolbarRef.current &&
        !floatingToolbarRef.current.contains(target) &&
        slashMenuRef.current &&
        !slashMenuRef.current.contains(target) &&
        !target.closest('.ProseMirror')
      ) {
        setShowFloatingToolbar(false)
        setShowSlashMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Extract title from editor content (first heading or first paragraph)
  const extractTitleFromContent = (content: string): string => {
    if (!content) return 'Untitled'
    
    try {
      // Try to parse HTML and get first heading
      const parser = new DOMParser()
      const doc = parser.parseFromString(content, 'text/html')
      const firstHeading = doc.querySelector('h1, h2, h3')
      if (firstHeading) {
        return firstHeading.textContent?.trim() || 'Untitled'
      }
      
      // Fallback to first paragraph
      const firstParagraph = doc.querySelector('p')
      if (firstParagraph) {
        const text = firstParagraph.textContent?.trim() || ''
        // Use first 50 characters as title
        return text.substring(0, 50) || 'Untitled'
      }
      
      return 'Untitled'
    } catch {
      return 'Untitled'
    }
  }

  const handleSave = async () => {
    if (!editor || !session?.user?.id) {
      toastError('Editor not initialized or user not authenticated')
      return
    }

    // Extract title from editor content
    const content = editor.getHTML()
    const extractedTitle = extractTitleFromContent(content)
    
    if (!extractedTitle || extractedTitle === 'Untitled') {
      toastError('Please add a title (first heading) to your document')
      return
    }

    setSaving(true)

    try {
      const content = editor.getHTML()
      // Use currentSpaceId if available, otherwise fall back to user's company_id
      const companyId = currentSpaceId || session.user.company_id || ''

      if (!companyId) {
        toastError('Please select a space first')
        return
      }

      const result = await saveRichDocument(
        extractedTitle.trim(),
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
  // Get quick insert actions for rendering
  const quickInsertActions = editor ? getQuickInsertActions(editor) : []

  // Toolbar buttons
  const toolbarButtons = [
    { icon: Bold, onClick: () => editor?.chain().focus().toggleBold().run(), isActive: () => editor?.isActive('bold') || false, title: 'Bold (Ctrl+B)' },
    { icon: Italic, onClick: () => editor?.chain().focus().toggleItalic().run(), isActive: () => editor?.isActive('italic') || false, title: 'Italic (Ctrl+I)' },
    { icon: UnderlineIcon, onClick: () => editor?.chain().focus().toggleUnderline().run(), isActive: () => editor?.isActive('underline') || false, title: 'Underline (Ctrl+U)' },
    { icon: Strikethrough, onClick: () => editor?.chain().focus().toggleStrike().run(), isActive: () => editor?.isActive('strike') || false, title: 'Strikethrough' },
    { icon: Code, onClick: () => editor?.chain().focus().toggleCode().run(), isActive: () => editor?.isActive('code') || false, title: 'Inline Code' },
    { separator: true },
    { icon: Heading1, onClick: () => editor?.chain().focus().toggleHeading({ level: 1 }).run(), isActive: () => editor?.isActive('heading', { level: 1 }) || false, title: 'Heading 1' },
    { icon: Heading2, onClick: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), isActive: () => editor?.isActive('heading', { level: 2 }) || false, title: 'Heading 2' },
    { icon: Heading3, onClick: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), isActive: () => editor?.isActive('heading', { level: 3 }) || false, title: 'Heading 3' },
    { separator: true },
    { icon: List, onClick: () => editor?.chain().focus().toggleBulletList().run(), isActive: () => editor?.isActive('bulletList') || false, title: 'Bullet List' },
    { icon: ListOrdered, onClick: () => editor?.chain().focus().toggleOrderedList().run(), isActive: () => editor?.isActive('orderedList') || false, title: 'Numbered List' },
    { icon: CheckSquare, onClick: () => editor?.chain().focus().toggleTaskList().run(), isActive: () => editor?.isActive('taskList') || false, title: 'To-do List' },
    { icon: Quote, onClick: () => editor?.chain().focus().toggleBlockquote().run(), isActive: () => editor?.isActive('blockquote') || false, title: 'Quote' },
    { separator: true },
    { icon: AlignLeft, onClick: () => editor?.chain().focus().setTextAlign('left').run(), isActive: () => editor?.isActive({ textAlign: 'left' }) || false, title: 'Align Left' },
    { icon: AlignCenter, onClick: () => editor?.chain().focus().setTextAlign('center').run(), isActive: () => editor?.isActive({ textAlign: 'center' }) || false, title: 'Align Center' },
    { icon: AlignRight, onClick: () => editor?.chain().focus().setTextAlign('right').run(), isActive: () => editor?.isActive({ textAlign: 'right' }) || false, title: 'Align Right' },
    { separator: true },
    { icon: Undo, onClick: () => editor?.chain().focus().undo().run(), title: 'Undo (Ctrl+Z)' },
    { icon: Redo, onClick: () => editor?.chain().focus().redo().run(), title: 'Redo (Ctrl+Y)' },
  ]

  if (!isMounted) {
    return (
      <ModernDashboardLayout 
        activeTab="documents" 
        onTabChange={handleModernTabChange} 
        currentSpaceId={currentSpaceId}
        onSpaceChange={handleSpaceChange}
      >
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModernDashboardLayout>
    )
  }

  if (loading) {
    return (
      <ModernDashboardLayout 
        activeTab="documents" 
        onTabChange={handleModernTabChange} 
        currentSpaceId={currentSpaceId}
        onSpaceChange={handleSpaceChange}
      >
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </ModernDashboardLayout>
    )
  }

  if (!editor) {
    console.error('Editor not initialized')
    return (
      <ModernDashboardLayout 
        activeTab="documents" 
        onTabChange={handleModernTabChange} 
        currentSpaceId={currentSpaceId}
        onSpaceChange={handleSpaceChange}
      >
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-destructive mb-4">Editor failed to initialize</p>
            <Button onClick={() => window.location.reload()}>Reload Page</Button>
          </div>
        </div>
      </ModernDashboardLayout>
    )
  }

  const editorContent = (
    <>
      <div className="flex flex-col h-full bg-background">

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-8 py-6">
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

            {/* Document Icon (if set) */}
            {documentIcon && (
              <div className="py-4 flex items-center gap-3">
                <span className="text-5xl">{documentIcon}</span>
              </div>
            )}

            {/* Metadata - Minimal, only show when not editing */}
            {!isNewDocument && (
              <div className="pb-4 flex items-center gap-4 text-sm text-muted-foreground">
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
            )}

            {/* Editor - Notion-like free-form */}
            <div className="min-h-[600px] pb-16 relative">
              {editor ? (
                <>
                  <EditorContent 
                    editor={editor}
                    className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:text-foreground prose-p:text-foreground prose-p:leading-relaxed focus:outline-none [&_h1]:text-5xl [&_h1]:font-bold [&_h1]:mb-4 [&_h1]:mt-0 [&_h2]:text-3xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-3 [&_p]:text-base [&_p]:mb-4"
                  />
                  
                  {/* Floating Toolbar - appears on text selection */}
                  {showFloatingToolbar && editor && hasCalculatedPosition && (
                    <div
                      ref={floatingToolbarRef}
                      className="fixed z-50 bg-background border border-border rounded-lg shadow-lg p-1 flex items-center gap-1 transition-all duration-150 ease-out"
                      style={{
                        top: `${toolbarPosition.top}px`,
                        left: `${toolbarPosition.left}px`,
                        transform: toolbarPosition.isAbove 
                          ? 'translateX(-50%) translateY(-100%)' 
                          : 'translateX(-50%)',
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      {toolbarButtons.map((button, index) => {
                        if ('separator' in button) {
                          return <div key={index} className="w-px h-6 bg-border mx-1" />
                        }
                        const Icon = button.icon
                        const isActive = button.isActive ? button.isActive() : false
                        return (
                          <Button
                            key={index}
                            variant={isActive ? 'default' : 'ghost'}
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              button.onClick()
                            }}
                            className="h-8 w-8 p-0"
                            title={button.title || ''}
                          >
                            <Icon className="h-4 w-4" />
                          </Button>
                        )
                      })}
                    </div>
                  )}
                  
                  {/* Slash Command Menu */}
                  {showSlashMenu && editor && (() => {
                    // Filter actions based on query (case-insensitive)
                    const filteredActions = quickInsertActions.filter(action => 
                      action.label.toLowerCase().includes(slashCommandQuery.toLowerCase())
                    )
                    
                    return (
                      <div
                        ref={slashMenuRef}
                        className="fixed z-50 bg-background border border-border rounded-lg shadow-lg w-64 max-h-80 overflow-y-auto py-1 scrollbar-thin"
                        style={{
                          top: `${slashMenuPosition.top}px`,
                          left: `${slashMenuPosition.left}px`,
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {filteredActions.length > 0 ? (
                          filteredActions.map((action, index) => {
                            const Icon = action.icon
                            const isSelected = index === selectedSlashIndex
                            return (
                              <button
                                key={index}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  // Find the start of the slash command
                                  const { from } = editor.state.selection
                                  const { $from } = editor.state.selection
                                  let searchStart = from - 1
                                  while (searchStart > 0) {
                                    const char = editor.state.doc.textBetween(searchStart - 1, searchStart)
                                    if (char === ' ' || char === '\n') {
                                      searchStart++
                                      break
                                    }
                                    if (searchStart === from - 1 && char === '/') {
                                      break
                                    }
                                    searchStart--
                                  }
                                  
                                  // Delete the command text
                                  editor.commands.deleteRange({ from: searchStart, to: from })
                                  
                                  // Then execute the action
                                  setTimeout(() => {
                                    action.action()
                                    setShowSlashMenu(false)
                                    setSlashCommandQuery('')
                                    setSelectedSlashIndex(0)
                                  }, 0)
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onMouseEnter={() => setSelectedSlashIndex(index)}
                                className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                                  isSelected ? 'bg-muted' : 'hover:bg-muted/50'
                                }`}
                              >
                                <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{action.label}</span>
                              </button>
                            )
                          })
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">
                            No commands found
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </>
              ) : (
                <div className="flex items-center justify-center h-[600px]">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              )}
            </div>

            {/* Floating Save Button - Bottom Right */}
            <div className="fixed bottom-6 right-6 z-50">
              <Button
                className="bg-foreground text-background hover:bg-foreground/90 gap-2 shadow-lg"
                size="sm"
                onClick={handleSave}
                disabled={saving}
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
    </>
  )

  // If inline mode, return content without layout wrapper
  if (inline) {
    return editorContent
  }

  // Otherwise wrap in ModernDashboardLayout
  return (
    <ModernDashboardLayout 
      activeTab="documents" 
      onTabChange={handleModernTabChange} 
      currentSpaceId={currentSpaceId}
      onSpaceChange={handleSpaceChange}
    >
      {editorContent}
    </ModernDashboardLayout>
  )
}

