"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import dynamic from "next/dynamic"
import { FileText, Folder, Star, Plus, Search, Grid3x3, Upload, FileEdit, ArrowLeft, ChevronRight, Eye, Trash2, MoreVertical, ArrowRightLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { 
  getCompanyDocuments, 
  getCompanyFolders,
  getCompanyRichDocuments,
  createFolder,
  createDocumentRecord,
  deleteDocument,
  deleteRichDocument,
  deleteFolder,
  updateFolder,
  updateDocumentVisibility,
  moveDocumentToFolder,
  type Document,
  type DocumentFolder,
  type RichDocument
} from "@/lib/database-functions"
import { formatDate } from "@/lib/utils"
import { useSession } from "@/components/providers/session-provider"
import { fetchUsersOptimized } from "@/lib/simplified-database-functions"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { toastSuccess, toastError } from "@/lib/toast"
import { Loader2, AlertTriangle } from "lucide-react"
import DocumentPreviewModal from "@/components/modals/document-preview-modal"
import { LoadingSpinner } from "@/components/ui/loading-states"

// Dynamically import DocumentEditorPage to avoid SSR issues
const DocumentEditorPage = dynamic(
  () => import('@/components/document-editor-page'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }
)

interface ModernDocumentsTabProps {
  activeSpace: string | null
}

type FilterType = "all" | "documents" | "spreadsheets"

export function ModernDocumentsTab({ activeSpace }: ModernDocumentsTabProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [documents, setDocuments] = useState<Document[]>([])
  const [richDocuments, setRichDocuments] = useState<RichDocument[]>([])
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [currentPath, setCurrentPath] = useState<string[]>(["Documents"])
  const [searchTerm, setSearchTerm] = useState("")
  const [filter, setFilter] = useState<FilterType>("all")
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{ id: string; full_name: string; email: string }>>([])
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'document' | 'rich' | 'folder'; id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [showEditFolderModal, setShowEditFolderModal] = useState(false)
  const [editingFolder, setEditingFolder] = useState<DocumentFolder | null>(null)
  const [editingFolderName, setEditingFolderName] = useState("")
  const [updatingFolder, setUpdatingFolder] = useState(false)
  const [canAccessInternal, setCanAccessInternal] = useState(false)
  const [showExternalWarning, setShowExternalWarning] = useState(false)
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null)
  const [isInternalSection, setIsInternalSection] = useState(false)
  const [currentSection, setCurrentSection] = useState<'internal' | 'external'>('external')
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null)
  const [pendingIsSpreadsheet, setPendingIsSpreadsheet] = useState(false)
  const [draggedDocumentId, setDraggedDocumentId] = useState<string | null>(null)
  const [draggedDocumentType, setDraggedDocumentType] = useState<'document' | 'rich' | null>(null)
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const spreadsheetInputRef = useRef<HTMLInputElement>(null)

  const currentFolder = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'

  // Check if user can access internal documents
  useEffect(() => {
    const checkInternalAccess = async () => {
      if (!activeSpace || !session?.user?.id) {
        setCanAccessInternal(false)
        setCurrentSection('external')
        return
      }

      const userRole = session.user.role
      const userId = session.user.id
      const userCompanyId = session.user.company_id

      // Admins can always access internal documents
      if (userRole === 'admin') {
        setCanAccessInternal(true)
        return
      }

      // Check if user is a manager of this space
      if (userRole === 'manager') {
        if (userCompanyId === activeSpace) {
          setCanAccessInternal(true)
          return
        }
        // Check if user is the manager of this company
        if (supabase) {
          // Try spaces table first (after migration), fallback to companies for backward compatibility
          let { data: company } = await supabase
            .from('spaces')
            .select('manager_id')
            .eq('id', activeSpace)
            .single()

          // If spaces table doesn't exist (migration not run), try companies table
          if (!company || (company as any).error) {
            const fallback = await supabase
              .from('companies')
              .select('manager_id')
              .eq('id', activeSpace)
              .single()
            
            if (!fallback.error) {
              company = fallback.data
            }
          }
          
          if (company?.manager_id === userId) {
            setCanAccessInternal(true)
            return
          }
        }
      }

      // Check if user is an internal user assigned to this space
      if (userRole === 'internal' && supabase) {
        // Try space_id first (after migration), fallback to company_id
        let { data: assignments } = await supabase
          .from('internal_user_companies')
          .select('space_id')
          .eq('user_id', userId)
          .eq('space_id', activeSpace)
        
        // If space_id column doesn't exist (migration not run), try company_id
        if (!assignments || (assignments as any).error) {
          const fallback = await supabase
            .from('internal_user_companies')
            .select('company_id')
            .eq('user_id', userId)
            .eq('company_id', activeSpace)
          
          if (!fallback.error && fallback.data) {
            // Normalize fallback data to match expected structure
            assignments = fallback.data.map((item: { company_id: any }) => ({
              space_id: item.company_id,
              company_id: item.company_id
            }))
          }
        }
        
        if (assignments && assignments.length > 0) {
          setCanAccessInternal(true)
          return
        }
      }

      setCanAccessInternal(false)
      setCurrentSection('external')
    }

    checkInternalAccess()
  }, [activeSpace, session?.user?.id, session?.user?.role, session?.user?.company_id])

  useEffect(() => {
    if (!activeSpace) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult, richDocsResult, usersResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath),
          getCompanyRichDocuments(activeSpace, folderPath),
          fetchUsersOptimized()
        ])

        if (docsResult.success) {
          setDocuments(docsResult.documents || [])
        }
        if (foldersResult.success) {
          // Filter out the "Setup Instructions" system folder
          const filteredFolders = (foldersResult.folders || []).filter(
            folder => !(folder.name === 'Setup Instructions' && folder.is_system_folder === true)
          )
          setFolders(filteredFolders)
        }
        if (richDocsResult.success) {
          setRichDocuments(richDocsResult.documents || [])
        }
        if (usersResult) {
          setUsers(usersResult)
        }
      } catch (error) {
        console.error("Error loading documents:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeSpace, currentPath])

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId)
    return user?.full_name || "Unknown"
  }

  const isSpreadsheet = (fileName: string, fileType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    const spreadsheetExts = ['xlsx', 'xls', 'csv', 'gsheet']
    const spreadsheetTypes = ['spreadsheet', 'excel', 'csv']
    return spreadsheetExts.includes(ext || '') || spreadsheetTypes.some(t => fileType?.toLowerCase().includes(t))
  }

  const getCurrentFolderId = async (): Promise<string | undefined> => {
    if (currentFolder === '/') return undefined
    if (!supabase) return undefined
    
    try {
      const { data, error } = await supabase
        .from('document_folders')
        .select('id')
        .eq('company_id', activeSpace)
        .eq('path', currentFolder)
        .single()

      if (error) {
        console.error('Error getting current folder ID:', error)
        return undefined
      }

      return data?.id
    } catch (error) {
      console.error('Error getting current folder ID:', error)
      return undefined
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !activeSpace || !session?.user?.id) return

    const folderName = newFolderName.trim()
    if (folderName.length === 0) {
      toastError('Folder name cannot be empty')
      return
    }
    
    if (folderName.length > 255) {
      toastError('Folder name is too long', {
        description: 'Maximum 255 characters allowed'
      })
      return
    }
    
    if (/[<>:"/\\|?*]/.test(folderName)) {
      toastError('Folder name contains invalid characters', {
        description: 'Cannot use: < > : " / \\ | ? *'
      })
      return
    }

    setCreatingFolder(true)
    
    try {
      const currentFolderId = await getCurrentFolderId()
      // Use current section to determine if folder should be internal
      const section = canAccessInternal ? currentSection : 'external'
      const isInternal = section === 'internal'
      
      const result = await createFolder(
        folderName,
        activeSpace,
        session.user.id,
        currentFolderId,
        isInternal
      )

      if (result.success) {
        toastSuccess('Folder created successfully')
        setNewFolderName("")
        setShowCreateFolderModal(false)
        // Reload data
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult, richDocsResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath),
          getCompanyRichDocuments(activeSpace, folderPath)
        ])
        if (docsResult.success) setDocuments(docsResult.documents || [])
        if (foldersResult.success) setFolders(foldersResult.folders || [])
        if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
      } else {
        toastError(result.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      toastError('Failed to create folder', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement> | null, isSpreadsheetInput: boolean = false, isInternal: boolean = false, filesOverride?: FileList | null, skipWarning: boolean = false, targetFolderPath?: string) => {
    const files = filesOverride || (event?.target?.files || null)
    if (!files || files.length === 0 || !activeSpace || !supabase || !session?.user?.id) return

    // Check if we need to show warning for external upload (skip if already confirmed)
    if (!isInternal && canAccessInternal && !skipWarning) {
      // Capture values directly instead of relying on state
      const filesToUpload = files
      const isSpreadsheet = isSpreadsheetInput
      
      setPendingFiles(filesToUpload)
      setPendingIsSpreadsheet(isSpreadsheet)
      setPendingAction(() => () => {
        handleFileUpload(null, isSpreadsheet, false, filesToUpload, true)
      })
      setShowExternalWarning(true)
      return
    }

    setUploading(true)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        
        // Check if it's actually a spreadsheet if spreadsheet input was used
        if (isSpreadsheetInput && !isSpreadsheet(file.name, file.type)) {
          toastError(`"${file.name}" is not a spreadsheet file`)
          continue
        }

        const fileName = `${Date.now()}-${file.name}`
        const uploadFolderPath = targetFolderPath || currentFolder
        const folderPath = uploadFolderPath === '/' ? '' : uploadFolderPath.replace(/^\//, '')
        const filePath = `${activeSpace}/${folderPath}/${fileName}`.replace(/\/+/g, '/').replace(/\/$/, '')

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError
        }

        // Create document record
        const result = await createDocumentRecord(
          file.name,
          filePath,
          file.size,
          file.type,
          activeSpace,
          uploadFolderPath,
          session.user.id,
          isInternal
        )

        if (!result.success) {
          throw new Error(result.error || 'Failed to create document record')
        }
      }

      toastSuccess('Files uploaded successfully')
      // Update breadcrumbs if files were uploaded to a folder (only if not from drag & drop)
      if (!targetFolderPath && currentFolder !== '/') {
        const folderPathParts = currentFolder.split('/').filter(Boolean)
        setCurrentPath(['Documents', ...folderPathParts])
      }
      // Reload data - use targetFolderPath if provided, otherwise use currentPath
      const reloadFolderPath = targetFolderPath || (currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/')
      const [docsResult, foldersResult, richDocsResult] = await Promise.all([
        getCompanyDocuments(activeSpace, reloadFolderPath),
        getCompanyFolders(activeSpace, reloadFolderPath),
        getCompanyRichDocuments(activeSpace, reloadFolderPath)
      ])
      if (docsResult.success) setDocuments(docsResult.documents || [])
      if (foldersResult.success) setFolders(foldersResult.folders || [])
      if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
    } catch (error) {
      console.error('Error uploading files:', error)
      toastError('Failed to upload files', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setUploading(false)
      if (documentInputRef.current) documentInputRef.current.value = ''
      if (spreadsheetInputRef.current) spreadsheetInputRef.current.value = ''
    }
  }

  const [editingDocumentId, setEditingDocumentId] = useState<string | null>(null)
  const [editingDocumentIsInternal, setEditingDocumentIsInternal] = useState(false)

  const handleCreateDocument = (isInternal: boolean = false) => {
    // Use activeSpace if available, otherwise fall back to user's company_id
    const spaceId = activeSpace || session?.user?.company_id
    if (!spaceId) {
      toastError('Please select a space first')
      return
    }

    // Check if we need to show warning for external creation
    if (!isInternal && canAccessInternal) {
      setPendingAction(() => () => {
        setIsInternalSection(false)
        setEditingDocumentId('new')
      })
      setShowExternalWarning(true)
      return
    }

    // Open inline editor for new document
    setIsInternalSection(isInternal)
    setEditingDocumentId('new')
  }

  const handleEditDocument = (documentId: string, isInternal: boolean = false) => {
    setEditingDocumentId(documentId)
    setEditingDocumentIsInternal(isInternal)
  }

  const handleCloseEditor = () => {
    setEditingDocumentId(null)
    setEditingDocumentIsInternal(false)
    // Reload documents list
    if (activeSpace) {
      const loadData = async () => {
        try {
          const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
          const [docsResult, foldersResult, richDocsResult] = await Promise.all([
            getCompanyDocuments(activeSpace, folderPath),
            getCompanyFolders(activeSpace, folderPath),
            getCompanyRichDocuments(activeSpace, folderPath),
          ])
          if (docsResult.success) setDocuments(docsResult.documents || [])
          if (foldersResult.success) setFolders(foldersResult.folders || [])
          if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
        } catch (error) {
          console.error("Error reloading documents:", error)
        }
      }
      loadData()
    }
  }

  // Split items into internal and external
  // System folders always go to external section
  // Handle null/undefined is_internal as external (for backwards compatibility)
  const internalItems = [
    ...folders.filter(f => f.is_internal === true && !f.is_system_folder).map(f => ({ ...f, type: 'folder' as const })),
    ...documents.filter(d => d.is_internal === true).map(d => ({ ...d, type: 'document' as const })),
    ...richDocuments.filter(d => d.is_internal === true).map(d => ({ ...d, type: 'rich' as const, name: d.title }))
  ]

  const externalItems = [
    // Include folders that are not internal (false, null, undefined) or are system folders
    ...folders.filter(f => f.is_internal !== true || f.is_system_folder === true).map(f => ({ ...f, type: 'folder' as const })),
    ...documents.filter(d => d.is_internal !== true).map(d => ({ ...d, type: 'document' as const })),
    ...richDocuments.filter(d => d.is_internal !== true).map(d => ({ ...d, type: 'rich' as const, name: d.title }))
  ]

  const filterItems = (items: typeof internalItems) => {
    return items.filter(item => {
      // Filter by search term
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }

      // Filter by type
      if (filter === "documents") {
        return item.type === 'document' || item.type === 'rich'
      }
      if (filter === "spreadsheets") {
        return item.type === 'document' && isSpreadsheet(item.name, (item as Document).file_type)
      }
      return true // "all"
    })
  }

  const filteredInternalItems = filterItems(internalItems)
  const filteredExternalItems = filterItems(externalItems)

  const handleFolderClick = (folder: DocumentFolder) => {
    setCurrentPath([...currentPath, folder.name])
  }

  const handleBreadcrumbClick = (index: number) => {
    // Navigate back to the folder at the specified index
    // Index 0 is "Documents" (root), so we keep that and slice up to the clicked index
    setCurrentPath(currentPath.slice(0, index + 1))
  }

  const formatUpdateDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const year = date.getFullYear().toString().slice(-2)
    return `${month}/${day}/${year}`
  }

  const handleDelete = async () => {
    if (!deleteTarget || !activeSpace) return

    setDeleting(true)
    try {
      let result
      if (deleteTarget.type === 'document') {
        result = await deleteDocument(deleteTarget.id)
      } else if (deleteTarget.type === 'rich') {
        result = await deleteRichDocument(deleteTarget.id)
      } else {
        result = await deleteFolder(deleteTarget.id)
      }

      if (result.success) {
        toastSuccess(deleteTarget.type === 'folder' ? 'Folder deleted successfully' : 'Document deleted successfully')
        // Reload data
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult, richDocsResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath),
          getCompanyRichDocuments(activeSpace, folderPath)
        ])
        if (docsResult.success) setDocuments(docsResult.documents || [])
        if (foldersResult.success) setFolders(foldersResult.folders || [])
        if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
      } else {
        toastError(result.error || `Failed to delete ${deleteTarget.type}`)
      }
    } catch (error) {
      console.error(`Error deleting ${deleteTarget.type}:`, error)
      toastError(`Failed to delete ${deleteTarget.type}`, {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeleteTarget(null)
    }
  }

  const handleMoveDocument = async (documentId: string, documentType: 'document' | 'rich', currentIsInternal: boolean) => {
    if (!activeSpace || !session?.user?.id) return

    // Toggle between internal and external
    // If currently internal (true), move to external (false)
    // If currently external (false or null/undefined), move to internal (true)
    const newIsInternal = !currentIsInternal
    
    try {
      const result = await updateDocumentVisibility(documentId, newIsInternal, documentType)
      
      if (result.success) {
        const targetSection = newIsInternal ? 'internal' : 'external'
        toastSuccess(`Document moved to ${targetSection} section`)
        // Reload documents to reflect the change
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult, richDocsResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath),
          getCompanyRichDocuments(activeSpace, folderPath)
        ])
        if (docsResult.success) setDocuments(docsResult.documents || [])
        if (foldersResult.success) setFolders(foldersResult.folders || [])
        if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
      } else {
        toastError(result.error || 'Failed to move document')
      }
    } catch (error) {
      console.error('Error moving document:', error)
      toastError('Failed to move document', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    }
  }

  const handleEditFolder = (folder: DocumentFolder) => {
    setEditingFolder(folder)
    setEditingFolderName(folder.name)
    setShowEditFolderModal(true)
  }

  const handleUpdateFolder = async () => {
    if (!editingFolder || !editingFolderName.trim() || !activeSpace) return

    const folderName = editingFolderName.trim()
    if (folderName.length === 0) {
      toastError('Folder name cannot be empty')
      return
    }
    
    if (folderName.length > 255) {
      toastError('Folder name is too long', {
        description: 'Maximum 255 characters allowed'
      })
      return
    }
    
    if (/[<>:"/\\|?*]/.test(folderName)) {
      toastError('Folder name contains invalid characters', {
        description: 'Cannot use: < > : " / \\ | ? *'
      })
      return
    }

    setUpdatingFolder(true)
    
    try {
      const result = await updateFolder(editingFolder.id, folderName)

      if (result.success) {
        toastSuccess('Folder renamed successfully')
        setEditingFolderName("")
        setShowEditFolderModal(false)
        setEditingFolder(null)
        // Reload data
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult, richDocsResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath),
          getCompanyRichDocuments(activeSpace, folderPath)
        ])
        if (docsResult.success) setDocuments(docsResult.documents || [])
        if (foldersResult.success) setFolders(foldersResult.folders || [])
        if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
      } else {
        toastError(result.error || 'Failed to rename folder')
      }
    } catch (error) {
      console.error('Error updating folder:', error)
      toastError('Failed to rename folder', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setUpdatingFolder(false)
    }
  }

  const handleDocumentDragStart = (e: React.DragEvent, documentId: string, documentType: 'document' | 'rich') => {
    setDraggedDocumentId(documentId)
    setDraggedDocumentType(documentType)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', '') // Required for Firefox
  }

  const handleDocumentDragEnd = () => {
    setDraggedDocumentId(null)
    setDraggedDocumentType(null)
    setDragOverFolderId(null)
  }

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Only allow drop if we're dragging a document (not files from file system)
    if (draggedDocumentId && draggedDocumentType) {
      e.dataTransfer.dropEffect = 'move'
      setDragOverFolderId(folderId)
    } else if (e.dataTransfer.types.includes('Files')) {
      // Allow file drops
      e.dataTransfer.dropEffect = 'copy'
      setDragOverFolderId(folderId)
    }
  }

  const handleFolderDragLeave = () => {
    setDragOverFolderId(null)
  }

  const handleDocumentDrop = async (e: React.DragEvent, targetFolder: DocumentFolder) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverFolderId(null)

    if (!activeSpace) return

    // Check if we're dropping files from the file system
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Handle file upload to folder
      const files = e.dataTransfer.files
      
      // Upload files to the target folder
      await handleFileUpload(null, false, currentSection === 'internal', files, true, targetFolder.path)
      return
    }

    // Handle document move
    if (!draggedDocumentId || !draggedDocumentType) return

    try {
      const result = await moveDocumentToFolder(
        draggedDocumentId,
        draggedDocumentType,
        targetFolder.path,
        session?.user?.id
      )

      if (result.success) {
        toastSuccess('Document moved successfully')
        // Reload data
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult, richDocsResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath),
          getCompanyRichDocuments(activeSpace, folderPath)
        ])
        if (docsResult.success) setDocuments(docsResult.documents || [])
        if (foldersResult.success) setFolders(foldersResult.folders || [])
        if (richDocsResult.success) setRichDocuments(richDocsResult.documents || [])
      } else {
        toastError(result.error || 'Failed to move document')
      }
    } catch (error) {
      console.error('Error moving document:', error)
      toastError('Failed to move document', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setDraggedDocumentId(null)
      setDraggedDocumentType(null)
    }
  }

  // If editing a document, show inline editor
  if (editingDocumentId) {
    const spaceId = activeSpace || session?.user?.company_id || null
    return (
      <div className="h-full flex flex-col -mx-6 -my-6">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCloseEditor}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Documents
          </Button>
        </div>
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          }>
            <DocumentEditorPage 
              documentId={editingDocumentId} 
              inline={true} 
              spaceId={spaceId}
              isInternal={editingDocumentIsInternal}
            />
          </Suspense>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Documents & Spreadsheets</h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="bg-foreground text-background hover:bg-foreground/90">
              <Plus className="w-4 h-4 mr-2" />
              New
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowCreateFolderModal(true)}>
              <Folder className="w-4 h-4 mr-2" />
              Create new folder
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              documentInputRef.current?.click()
            }}>
              <Upload className="w-4 h-4 mr-2" />
              Upload document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              spreadsheetInputRef.current?.click()
            }}>
              <Grid3x3 className="w-4 h-4 mr-2" />
              Upload spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={(e) => {
                e.preventDefault()
                handleCreateDocument(currentSection === 'internal')
              }}
            >
              <FileEdit className="w-4 h-4 mr-2" />
              Create new document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Section Toggle - Only for users with internal access */}
      {canAccessInternal && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-1">
            <button
              onClick={() => setCurrentSection('internal')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentSection === 'internal'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Internal
            </button>
            <button
              onClick={() => setCurrentSection('external')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentSection === 'external'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              External
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {currentSection === 'internal' 
              ? 'Only visible to admins, managers, and internal users'
              : 'Visible to all users'}
          </span>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={documentInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.rtf"
        onChange={(e) => handleFileUpload(e, false, currentSection === 'internal')}
        className="hidden"
      />
      <input
        ref={spreadsheetInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        onChange={(e) => handleFileUpload(e, true, currentSection === 'internal')}
        className="hidden"
      />

      {/* Create Folder Modal */}
      <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in {currentFolder === '/' ? 'the root directory' : `"${currentFolder}"`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Folder Name</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolderModal(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || creatingFolder}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Filter Tabs */}
      <div className="flex items-center gap-6 border-b border-border/50">
        <button
          onClick={() => setFilter("all")}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            filter === "all"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("documents")}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            filter === "documents"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Documents
        </button>
        <button
          onClick={() => setFilter("spreadsheets")}
          className={`pb-3 px-1 text-sm font-medium transition-colors ${
            filter === "spreadsheets"
              ? "text-foreground border-b-2 border-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Spreadsheets
        </button>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm py-2 border-b border-border/50">
        {currentPath.map((pathItem, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <button
              onClick={() => handleBreadcrumbClick(index)}
              className={`px-2 py-1 rounded-md transition-colors ${
                index === currentPath.length - 1
                  ? "text-foreground font-medium cursor-default"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 cursor-pointer"
              }`}
              disabled={index === currentPath.length - 1}
            >
              {pathItem}
            </button>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents and spreadsheets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Documents Section - Show based on current selection */}
      <div className="space-y-0">
        {(() => {
          // For users without internal access, always show external
          const section = canAccessInternal ? currentSection : 'external'
          const itemsToShow = section === 'internal' ? filteredInternalItems : filteredExternalItems
          const sectionName = section === 'internal' ? 'internal' : 'external'
          
          if (itemsToShow.length === 0) {
            return (
              <div className="py-12 text-center text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="text-sm">
                  No {sectionName} documents found
                </p>
              </div>
            )
          }
          
          return itemsToShow.map((item) => {
            return renderDocumentItem(item)
          })
        })()}
      </div>

      {/* External Upload Warning Modal */}
      <Dialog open={showExternalWarning} onOpenChange={setShowExternalWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              External Section Warning
            </DialogTitle>
            <DialogDescription>
              This is the external section. Files uploaded here can be seen by all users of the space.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowExternalWarning(false)
                setPendingAction(null)
                setPendingFiles(null)
                // Clear file inputs
                if (documentInputRef.current) documentInputRef.current.value = ''
                if (spreadsheetInputRef.current) spreadsheetInputRef.current.value = ''
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (pendingAction) {
                  // Execute the pending action (which will trigger the upload)
                  pendingAction()
                }
                // Close modal and clear state
                setShowExternalWarning(false)
                setPendingAction(null)
                setPendingFiles(null)
              }}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDocument}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          setPreviewDocument(null)
        }}
      />

      {/* Edit Folder Modal */}
      <Dialog open={showEditFolderModal} onOpenChange={setShowEditFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for "{editingFolder?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-folder-name">Folder Name</Label>
              <Input
                id="edit-folder-name"
                value={editingFolderName}
                onChange={(e) => setEditingFolderName(e.target.value)}
                placeholder="Enter folder name"
                onKeyPress={(e) => e.key === 'Enter' && handleUpdateFolder()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowEditFolderModal(false)
              setEditingFolder(null)
              setEditingFolderName("")
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateFolder} 
              disabled={!editingFolderName.trim() || updatingFolder}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {updatingFolder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type === 'folder' ? 'Folder' : 'Document'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
              {deleteTarget?.type === 'folder' && ' All contents inside this folder will also be deleted.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowDeleteModal(false)
                setDeleteTarget(null)
              }}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )

  function renderDocumentItem(item: typeof internalItems[0]) {
    if (item.type === 'folder') {
      const folder = item as DocumentFolder & { type: 'folder' }
      const isReadonly = folder.is_system_folder && folder.is_readonly
      const isDragOver = dragOverFolderId === folder.id
      
      return (
        <div
          key={folder.id}
          className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group ${
            isDragOver ? 'bg-muted border-2 border-dashed border-foreground/50' : ''
          }`}
          onDragOver={(e) => handleFolderDragOver(e, folder.id)}
          onDragLeave={handleFolderDragLeave}
          onDrop={(e) => handleDocumentDrop(e, folder)}
        >
          <button
            onClick={() => handleFolderClick(folder)}
            className="flex-1 flex items-center gap-3 text-left min-w-0"
          >
            <Folder className="w-5 h-5 text-muted-foreground flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground truncate">{folder.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Updated {formatUpdateDate(folder.updated_at || folder.created_at)} · {getUserName(folder.created_by)}
              </div>
            </div>
          </button>
          {!isReadonly && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  handleEditFolder(folder)
                }}>
                  <FileEdit className="h-4 w-4 mr-2" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTarget({ 
                      type: 'folder', 
                      id: folder.id, 
                      name: folder.name 
                    })
                    setShowDeleteModal(true)
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )
    }

    const doc = item.type === 'rich' 
      ? (item as RichDocument & { type: 'rich'; name: string })
      : (item as Document & { type: 'document' })
    
    const isSpreadsheetDoc = item.type === 'document' && isSpreadsheet(doc.name, (doc as Document).file_type)
    const updateDate = doc.updated_at || doc.created_at
    const authorId = item.type === 'rich' ? (doc as RichDocument).created_by : (doc as Document).uploaded_by

    const isDragging = draggedDocumentId === doc.id

    return (
      <div
        key={doc.id}
        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group ${
          isDragging ? 'opacity-50' : ''
        }`}
        draggable
        onDragStart={(e) => handleDocumentDragStart(e, doc.id, item.type === 'rich' ? 'rich' : 'document')}
        onDragEnd={handleDocumentDragEnd}
      >
        <button
          onClick={() => {
            if (item.type === 'rich') {
              const richDoc = doc as RichDocument
              handleEditDocument(doc.id, richDoc.is_internal === true)
            } else {
              // Open preview modal for regular documents
              setPreviewDocument(doc as Document)
              setShowPreview(true)
            }
          }}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          {isSpreadsheetDoc ? (
            <Grid3x3 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          ) : (
            <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">{doc.name}</span>
              {(doc as any).is_favorite && (
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Updated {formatUpdateDate(updateDate)} · {getUserName(authorId)}
            </div>
          </div>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {item.type === 'rich' ? (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                const richDoc = doc as RichDocument
                handleEditDocument(doc.id, richDoc.is_internal === true)
              }}>
                <FileEdit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation()
                setPreviewDocument(doc as Document)
                setShowPreview(true)
              }}>
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </DropdownMenuItem>
            )}
            {canAccessInternal && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation()
                  // Check if document is currently internal (handle null/undefined as false/external)
                  const isInternal = item.type === 'rich' 
                    ? (doc as RichDocument).is_internal === true
                    : (doc as Document).is_internal === true
                  handleMoveDocument(doc.id, item.type === 'rich' ? 'rich' : 'document', isInternal)
                }}>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  {(() => {
                    const isInternal = item.type === 'rich' 
                      ? (doc as RichDocument).is_internal === true
                      : (doc as Document).is_internal === true
                    return isInternal ? 'Move to External' : 'Move to Internal'
                  })()}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation()
                setDeleteTarget({ 
                  type: item.type === 'rich' ? 'rich' : 'document', 
                  id: doc.id, 
                  name: doc.name 
                })
                setShowDeleteModal(true)
              }}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    )
  }
}
