"use client"

import { useState, useEffect, useRef, Suspense } from "react"
import dynamic from "next/dynamic"
import { FileText, Folder, Star, Plus, Search, Grid3x3, Upload, FileEdit, ArrowLeft, ChevronRight, Eye, Trash2, MoreVertical } from "lucide-react"
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
import { Loader2 } from "lucide-react"
import DocumentPreviewModal from "@/components/modals/document-preview-modal"

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
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'document' | 'rich'; id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const spreadsheetInputRef = useRef<HTMLInputElement>(null)

  const currentFolder = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'

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
          setFolders(foldersResult.folders || [])
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
      
      const result = await createFolder(
        folderName,
        activeSpace,
        session.user.id,
        currentFolderId
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

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, isSpreadsheetInput: boolean = false) => {
    const files = event.target.files
    if (!files || files.length === 0 || !activeSpace || !supabase || !session?.user?.id) return

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
        const folderPath = currentFolder === '/' ? '' : currentFolder.replace(/^\//, '')
        const filePath = `${activeSpace}/${folderPath}/${fileName}`.replace(/\/+/g, '/').replace(/\/$/, '')

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

        if (uploadError) {
          throw uploadError
        }

        // Create document record
        const documentData = {
          name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          company_id: activeSpace,
          uploaded_by: session.user.id,
          folder_path: currentFolder
        }

        const { error: recordError } = await supabase
          .from('documents')
          .insert(documentData)

        if (recordError) {
          throw recordError
        }
      }

      toastSuccess('Files uploaded successfully')
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

  const handleCreateDocument = () => {
    // Use activeSpace if available, otherwise fall back to user's company_id
    const spaceId = activeSpace || session?.user?.company_id
    if (!spaceId) {
      toastError('Please select a space first')
      return
    }
    // Open inline editor for new document
    setEditingDocumentId('new')
  }

  const handleEditDocument = (documentId: string) => {
    setEditingDocumentId(documentId)
  }

  const handleCloseEditor = () => {
    setEditingDocumentId(null)
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

  const allItems = [
    ...folders.map(f => ({ ...f, type: 'folder' as const })),
    ...documents.map(d => ({ ...d, type: 'document' as const })),
    ...richDocuments.map(d => ({ ...d, type: 'rich' as const, name: d.title }))
  ]

  const filteredItems = allItems.filter(item => {
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
      } else {
        result = await deleteRichDocument(deleteTarget.id)
      }

      if (result.success) {
        toastSuccess('Document deleted successfully')
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
        toastError(result.error || 'Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toastError('Failed to delete document', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeleteTarget(null)
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
            <DocumentEditorPage documentId={editingDocumentId} inline={true} spaceId={spaceId} />
          </Suspense>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
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
            <DropdownMenuItem onClick={() => documentInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              Upload document
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => spreadsheetInputRef.current?.click()}>
              <Grid3x3 className="w-4 h-4 mr-2" />
              Upload spreadsheet
            </DropdownMenuItem>
            <DropdownMenuItem 
              onSelect={(e) => {
                console.log('DropdownMenuItem onSelect triggered', e)
                e.preventDefault()
                handleCreateDocument()
              }}
            >
              <FileEdit className="w-4 h-4 mr-2" />
              Create new document
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={documentInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.rtf"
        onChange={(e) => handleFileUpload(e, false)}
        className="hidden"
      />
      <input
        ref={spreadsheetInputRef}
        type="file"
        multiple
        accept=".xlsx,.xls,.csv"
        onChange={(e) => handleFileUpload(e, true)}
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

      {/* Documents List */}
      <div className="space-y-0">
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No documents found</p>
          </div>
        ) : (
          filteredItems.map((item) => {
            if (item.type === 'folder') {
              const folder = item as DocumentFolder & { type: 'folder' }
              return (
                <button
                  key={folder.id}
                  onClick={() => handleFolderClick(folder)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left group"
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
              )
            }

            const doc = item.type === 'rich' 
              ? (item as RichDocument & { type: 'rich'; name: string })
              : (item as Document & { type: 'document' })
            
            const isSpreadsheetDoc = item.type === 'document' && isSpreadsheet(doc.name, (doc as Document).file_type)
            const updateDate = doc.updated_at || doc.created_at
            const authorId = item.type === 'rich' ? (doc as RichDocument).created_by : (doc as Document).uploaded_by

            return (
              <div
                key={doc.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
              >
                <button
                  onClick={() => {
                    if (item.type === 'rich') {
                      handleEditDocument(doc.id)
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
                        handleEditDocument(doc.id)
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
          })
        )}
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDocument}
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false)
          setPreviewDocument(null)
        }}
      />

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.
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
}
