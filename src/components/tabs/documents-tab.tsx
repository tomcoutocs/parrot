'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { 
  Folder, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  ArrowLeft,
  HardDrive
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { 
  getCompanyDocuments, 
  getCompanyFolders, 
  createFolder, 
  deleteDocument, 
  deleteFolder,
  searchDocuments,
  getCompanyStorageUsage,
  type Document,
  type DocumentFolder
} from '@/lib/database-functions'
import { supabase } from '@/lib/supabase'
import { formatBytes, formatDate } from '@/lib/utils'
import type { Company } from '@/lib/supabase'

interface BreadcrumbItem {
  id: string
  name: string
  path: string
}

export default function DocumentsTab() {
  const { data: session } = useSession()
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [currentFolder, setCurrentFolder] = useState<string>('/')
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([{ id: 'root', name: 'Home', path: '/' }])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'file' | 'folder'; id: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [storageUsage, setStorageUsage] = useState<number>(0)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = session?.user?.role === 'admin'
  const userCompanyId = session?.user?.company_id

  // Load companies for admin
  useEffect(() => {
    if (isAdmin) {
      loadCompanies()
    }
  }, [isAdmin])

  // Set initial company
  useEffect(() => {
    if (isAdmin && companies.length > 0 && !selectedCompany) {
      setSelectedCompany(companies[0].id)
    } else if (!isAdmin && userCompanyId) {
      setSelectedCompany(userCompanyId)
    } else if (!isAdmin && !userCompanyId) {
      // Try to get company from user_companies table
      loadUserCompany()
    }
  }, [isAdmin, companies, userCompanyId, selectedCompany, loadUserCompany])

  const loadUserCompany = useCallback(async () => {
    if (!session?.user?.id) return
    
    try {
      const { data: userCompanyData, error } = await supabase
        .from('internal_user_companies')
        .select('company_id')
        .eq('user_id', session.user.id)
        .eq('is_primary', true)
        .single()

      if (!error && userCompanyData) {
        setSelectedCompany(userCompanyData.company_id)
      }
    } catch (error) {
      console.error('Error loading user company:', error)
    }
  }, [session?.user?.id])

  // Load documents and folders when company or folder changes
  useEffect(() => {
    if (selectedCompany) {
      loadDocumentsAndFolders()
      loadStorageUsage()
    }
  }, [selectedCompany, currentFolder, loadDocumentsAndFolders, loadStorageUsage])

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setCompanies(data || [])
    } catch (error) {
      console.error('Error loading companies:', error)
      setError('Failed to load companies')
    }
  }

  const loadDocumentsAndFolders = useCallback(async () => {
    if (!selectedCompany) return

    setIsLoading(true)
    try {
      const [docsResult, foldersResult] = await Promise.all([
        getCompanyDocuments(selectedCompany, currentFolder),
        getCompanyFolders(selectedCompany, currentFolder)
      ])

      if (docsResult.success) {
        setDocuments(docsResult.documents || [])
      } else {
        setError(docsResult.error || 'Failed to load documents')
      }

      if (foldersResult.success) {
        setFolders(foldersResult.folders || [])
      } else {
        setError(foldersResult.error || 'Failed to load folders')
      }
    } catch (error) {
      console.error('Error loading documents and folders:', error)
      setError('Failed to load documents and folders')
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany, currentFolder])

  const loadStorageUsage = useCallback(async () => {
    if (!selectedCompany) return

    try {
      const result = await getCompanyStorageUsage(selectedCompany)
      if (result.success) {
        setStorageUsage(result.usage || 0)
      }
    } catch (error) {
      console.error('Error loading storage usage:', error)
    }
  }, [selectedCompany])

  const handleFolderClick = (folder: DocumentFolder) => {
    const newPath = folder.path
    setCurrentFolder(newPath)
    
    // Update breadcrumbs - add the new folder to the breadcrumb trail
    const newBreadcrumbs = [...breadcrumbs, { id: folder.id, name: folder.name, path: newPath }]
    setBreadcrumbs(newBreadcrumbs)
  }

  const handleBreadcrumbClick = (breadcrumb: BreadcrumbItem) => {
    setCurrentFolder(breadcrumb.path)
    
    // Update breadcrumbs to show only up to this point
    const breadcrumbIndex = breadcrumbs.findIndex(b => b.id === breadcrumb.id)
    if (breadcrumbIndex !== -1) {
      setBreadcrumbs(breadcrumbs.slice(0, breadcrumbIndex + 1))
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !selectedCompany) return

    setCreatingFolder(true)
    try {
      const result = await createFolder(
        newFolderName.trim(),
        selectedCompany,
        session?.user?.id || '',
        currentFolder === '/' ? undefined : currentFolder
      )

      if (result.success) {
        setSuccess('Folder created successfully')
        setNewFolderName('')
        setShowCreateFolderModal(false)
        loadDocumentsAndFolders()
      } else {
        setError(result.error || 'Failed to create folder')
      }
    } catch (error) {
      console.error('Error creating folder:', error)
      setError('Failed to create folder')
    } finally {
      setCreatingFolder(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0 || !selectedCompany) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = `${Date.now()}-${file.name}`
        const filePath = `${selectedCompany}/${currentFolder === '/' ? '' : currentFolder}/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file, {
            onUploadProgress: (progress) => {
              const percent = (progress.loaded / progress.total) * 100
              setUploadProgress(percent)
            }
          })

        if (uploadError) {
          throw uploadError
        }

        // Create document record
        const { error: recordError } = await supabase
          .from('documents')
          .insert({
            name: file.name,
            file_path: filePath,
            file_size: file.size,
            file_type: file.type,
            company_id: selectedCompany,
            uploaded_by: session?.user?.id || '',
            folder_path: currentFolder
          })

        if (recordError) {
          throw recordError
        }
      }

      setSuccess('Files uploaded successfully')
      loadDocumentsAndFolders()
      loadStorageUsage()
    } catch (error) {
      console.error('Error uploading files:', error)
      setError('Failed to upload files')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleDownload = async (fileDocument: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(fileDocument.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = fileDocument.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      setError('Failed to download file')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    setDeleting(true)
    try {
      let result
      if (deleteTarget.type === 'file') {
        result = await deleteDocument(deleteTarget.id)
      } else {
        result = await deleteFolder(deleteTarget.id)
      }

      if (result.success) {
        setSuccess(`${deleteTarget.type === 'file' ? 'File' : 'Folder'} deleted successfully`)
        loadDocumentsAndFolders()
        loadStorageUsage()
      } else {
        setError(result.error || `Failed to delete ${deleteTarget.type}`)
      }
    } catch (error) {
      console.error('Error deleting:', error)
      setError(`Failed to delete ${deleteTarget.type}`)
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
      setDeleteTarget(null)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim() || !selectedCompany) return

    try {
      const result = await searchDocuments(selectedCompany, searchTerm.trim())
      if (result.success) {
        setDocuments(result.documents || [])
        setFolders([]) // Clear folders when searching
      } else {
        setError(result.error || 'Search failed')
      }
    } catch (error) {
      console.error('Error searching documents:', error)
      setError('Search failed')
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
    loadDocumentsAndFolders()
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📊'
    if (fileType.includes('zip') || fileType.includes('archive')) return '📦'
    return '📄'
  }

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Please sign in to access documents</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Document Management</h2>
          <p className="text-gray-600">Manage and organize your company documents</p>
        </div>
        
        {/* Company Selector (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center space-x-4">
            <Label htmlFor="company-select">Company:</Label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Storage Usage */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center">
            <HardDrive className="h-5 w-5 mr-2" />
            Storage Usage
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${Math.min((storageUsage / (100 * 1024 * 1024)) * 100, 100)}%` }}
                />
              </div>
              <span className="text-sm text-gray-600">
                {formatBytes(storageUsage)} / 100 MB
              </span>
            </div>
            <Badge variant="outline">
              {Math.round((storageUsage / (100 * 1024 * 1024)) * 100)}% used
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <Button variant="outline" onClick={clearSearch}>
              Clear
            </Button>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowCreateFolderModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </div>
      </div>

             {/* Improved Navigation */}
       <div className="flex items-center justify-between">
         {/* Breadcrumbs */}
         <div className="flex items-center space-x-2 text-sm">
           {breadcrumbs.map((breadcrumb, index) => (
             <div key={breadcrumb.id} className="flex items-center">
               {index > 0 && <span className="text-gray-400 mx-2">/</span>}
               <button
                 onClick={() => handleBreadcrumbClick(breadcrumb)}
                 className={`hover:underline ${
                   index === breadcrumbs.length - 1 
                     ? 'text-gray-900 font-medium' 
                     : 'text-blue-600 hover:text-blue-800'
                 }`}
               >
                 {breadcrumb.name}
               </button>
             </div>
           ))}
         </div>
         
         {/* Navigation Buttons */}
         <div className="flex items-center space-x-2">
           {/* Home Button */}
           {breadcrumbs.length > 1 && (
             <Button
               variant="outline"
               size="sm"
               onClick={() => {
                 setCurrentFolder('/')
                 setBreadcrumbs([{ id: 'root', name: 'Home', path: '/' }])
               }}
               className="flex items-center space-x-1"
             >
               <Folder className="h-4 w-4" />
               <span>Home</span>
             </Button>
           )}
           
           {/* Back Button */}
           {breadcrumbs.length > 1 && (
             <Button
               variant="outline"
               size="sm"
               onClick={() => {
                 const parentBreadcrumb = breadcrumbs[breadcrumbs.length - 2]
                 handleBreadcrumbClick(parentBreadcrumb)
               }}
               className="flex items-center space-x-1"
             >
               <ArrowLeft className="h-4 w-4" />
               <span>Back</span>
             </Button>
           )}
         </div>
       </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* Upload Progress */}
      {uploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <Loader2 className="h-5 w-5 animate-spin" />
              <div className="flex-1">
                <div className="text-sm text-gray-600 mb-2">Uploading files...</div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-gray-600">{Math.round(uploadProgress)}%</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                     {/* Folders */}
           {folders.map((folder) => (
             <Card key={folder.id} className="hover:shadow-md transition-shadow relative">
               <CardContent className="pt-6">
                 <div 
                   className="text-center cursor-pointer"
                   onClick={() => handleFolderClick(folder)}
                 >
                   <Folder className="h-16 w-16 text-blue-500 mx-auto mb-3" />
                   <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                   <p className="text-sm text-gray-500">Folder</p>
                 </div>
                 
                 <div className="absolute bottom-2 right-2">
                   <Button
                     size="sm"
                     variant="outline"
                     onClick={(e) => {
                       e.stopPropagation() // Prevent folder navigation
                       setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })
                       setShowDeleteModal(true)
                     }}
                   >
                     <Trash2 className="h-3 w-3" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
           ))}

          {/* Documents */}
          {documents.map((document) => (
            <Card key={document.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">{getFileIcon(document.file_type)}</div>
                  <h3 className="font-medium text-gray-900 truncate text-sm">{document.name}</h3>
                  <p className="text-xs text-gray-500">{formatBytes(document.file_size)}</p>
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{formatDate(document.created_at)}</span>
                  <span>{document.file_type}</span>
                </div>

                <div className="flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(document)}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setDeleteTarget({ type: 'file', id: document.id, name: document.name })
                      setShowDeleteModal(true)
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Empty State */}
          {folders.length === 0 && documents.length === 0 && !searchTerm && (
            <div className="col-span-full text-center py-12">
              <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents or folders</h3>
              <p className="text-gray-600">Get started by uploading files or creating folders</p>
            </div>
          )}
        </div>
      )}

      {/* Create Folder Modal */}
      <Dialog open={showCreateFolderModal} onOpenChange={setShowCreateFolderModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Create a new folder in the current location
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
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || creatingFolder}>
              {creatingFolder ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget?.type}</DialogTitle>
                         <DialogDescription>
               Are you sure you want to delete &quot;{deleteTarget?.name}&quot;? This action cannot be undone.
             </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
