'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { 
  Folder, 
  Upload, 
  Download, 
  Trash2, 
  Plus, 
  Search, 
  ArrowLeft,
  HardDrive,
  MoreVertical,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Archive,
  Grid3X3,
  List,
  Star,
  Clock,
  User
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  getCompanyDocuments, 
  getCompanyFolders, 
  createFolder, 
  deleteDocument, 
  deleteFolder,
  searchDocuments,
  getCompanyStorageUsage,
  addToFavorites,
  removeFromFavorites,
  getUserFavorites,
  isFavorited,
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list')
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isAdmin = session?.user?.role === 'admin'
  const userCompanyId = session?.user?.company_id

  const loadUserCompany = useCallback(async () => {
    if (!session?.user?.id || !supabase) return
    
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

  const loadFavorites = useCallback(async () => {
    if (!selectedCompany || !session?.user?.id) return

    setFavoritesLoading(true)
    try {
      const result = await getUserFavorites(session.user.id, selectedCompany)
      if (result.success && result.favorites) {
        const favoritesSet = new Set(result.favorites.map(fav => fav.item_id))
        setFavorites(favoritesSet)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setFavoritesLoading(false)
    }
  }, [selectedCompany, session?.user?.id])

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

  // Load documents and folders when company or folder changes
  useEffect(() => {
    if (selectedCompany) {
      loadDocumentsAndFolders()
      loadStorageUsage()
      loadFavorites()
    }
  }, [selectedCompany, currentFolder, loadDocumentsAndFolders, loadStorageUsage, loadFavorites])

  const loadCompanies = async () => {
    if (!supabase) return
    
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

  const getCurrentFolderId = async (): Promise<string | undefined> => {
    if (currentFolder === '/') return undefined
    if (!supabase) return undefined
    
    try {
      const { data, error } = await supabase
        .from('document_folders')
        .select('id')
        .or(`company_id.eq.${selectedCompany},is_system_folder.eq.true`)
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
    if (!newFolderName.trim() || !selectedCompany) return

    // Validate folder name
    const folderName = newFolderName.trim()
    if (folderName.length === 0) {
      setError('Folder name cannot be empty')
      return
    }
    
    if (folderName.length > 255) {
      setError('Folder name is too long (maximum 255 characters)')
      return
    }
    
    // Check for invalid characters
    if (/[<>:"/\\|?*]/.test(folderName)) {
      setError('Folder name contains invalid characters')
      return
    }

    setCreatingFolder(true)
    setError('') // Clear any previous errors
    
    try {
      // Get the current folder's ID if we're not in the root
      const currentFolderId = await getCurrentFolderId()
      
      console.log('Creating folder:', {
        name: folderName,
        companyId: selectedCompany,
        userId: session?.user?.id,
        parentFolderId: currentFolderId,
        currentPath: currentFolder
      })
      
      const result = await createFolder(
        folderName,
        selectedCompany,
        session?.user?.id || '',
        currentFolderId
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
    if (!files || files.length === 0 || !selectedCompany || !supabase) return

    // Check if we're in a system folder
    if (currentFolder === '/Setup Instructions') {
      setError('Cannot upload files to system folders')
      return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileName = `${Date.now()}-${file.name}`
        // Construct the file path properly - remove leading slash from currentFolder if it exists
        const folderPath = currentFolder === '/' ? '' : currentFolder.replace(/^\//, '')
        const filePath = `${selectedCompany}/${folderPath}/${fileName}`.replace(/\/+/g, '/').replace(/\/$/, '')

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file)

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

        // Update progress for each file
        setUploadProgress(((i + 1) / files.length) * 100)
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
    if (!supabase) return
    
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
    if (fileType.startsWith('image/')) return '🖼️'
    if (fileType.startsWith('video/')) return '🎥'
    if (fileType.startsWith('audio/')) return '🎵'
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('word') || fileType.includes('document')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📈'
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return '📦'
    return '📄'
  }

  const getFileIconComponent = (fileType: string) => {
    if (fileType.startsWith('image/')) return <FileImage className="h-5 w-5 text-green-600" />
    if (fileType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-purple-600" />
    if (fileType.startsWith('audio/')) return <FileAudio className="h-5 w-5 text-orange-600" />
    if (fileType.includes('pdf')) return <FileText className="h-5 w-5 text-red-600" />
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="h-5 w-5 text-blue-600" />
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileText className="h-5 w-5 text-green-600" />
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return <FileText className="h-5 w-5 text-orange-600" />
    if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return <Archive className="h-5 w-5 text-gray-600" />
    return <File className="h-5 w-5 text-gray-600" />
  }

  const toggleItemSelection = (id: string) => {
    // Removed selection functionality
  }

  const clearSelection = () => {
    // Removed selection functionality
  }

  const toggleFavorite = async (itemId: string, itemType: 'folder' | 'document') => {
    if (!session?.user?.id || !selectedCompany) return

    try {
      const isCurrentlyFavorited = favorites.has(itemId)
      
      if (isCurrentlyFavorited) {
        const result = await removeFromFavorites(session.user.id, itemId, itemType)
        if (result.success) {
          const newFavorites = new Set(favorites)
          newFavorites.delete(itemId)
          setFavorites(newFavorites)
          setSuccess(`${itemType === 'folder' ? 'Folder' : 'Document'} removed from favorites`)
        } else {
          setError(result.error || 'Failed to remove from favorites')
        }
      } else {
        const result = await addToFavorites(session.user.id, itemId, itemType, selectedCompany)
        if (result.success) {
          const newFavorites = new Set(favorites)
          newFavorites.add(itemId)
          setFavorites(newFavorites)
          setSuccess(`${itemType === 'folder' ? 'Folder' : 'Document'} added to favorites`)
        } else {
          setError(result.error || 'Failed to add to favorites')
        }
      }
    } catch (error) {
      console.error('Error toggling favorite:', error)
      setError('Failed to update favorites')
    }
  }

  // Sort items to show favorites first
  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => {
      const aIsFavorited = favorites.has(a.id)
      const bIsFavorited = favorites.has(b.id)
      
      if (aIsFavorited && !bIsFavorited) return -1
      if (!aIsFavorited && bIsFavorited) return 1
      
      return a.name.localeCompare(b.name)
    })
  }, [folders, favorites])

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => {
      const aIsFavorited = favorites.has(a.id)
      const bIsFavorited = favorites.has(b.id)
      
      if (aIsFavorited && !bIsFavorited) return -1
      if (!aIsFavorited && bIsFavorited) return 1
      
      return a.name.localeCompare(b.name)
    })
  }, [documents, favorites])

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

      {/* Storage Usage - Hidden from view but still tracked in backend */}
      {/* <Card>
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
      </Card> */}

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
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-r-none"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-l-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>

                     {/* Selection Actions */}
           {/* Removed selection functionality */}

          <Button 
            onClick={() => setShowCreateFolderModal(true)}
            disabled={currentFolder === '/Setup Instructions'}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Folder
          </Button>
          <Button 
            onClick={() => fileInputRef.current?.click()}
            disabled={currentFolder === '/Setup Instructions'}
          >
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
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg border">
          {/* List Header */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b bg-gray-50 text-sm font-medium text-gray-600">
            <div className="col-span-6">Name</div>
            <div className="col-span-2">Owner</div>
            <div className="col-span-2">Modified</div>
            <div className="col-span-1">Size</div>
            <div className="col-span-1"></div>
          </div>

          {/* Folders */}
          {sortedFolders.map((folder) => (
            <div
              key={folder.id}
                             className={`grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-gray-50 cursor-pointer ${
                 folder.is_system_folder ? 'bg-yellow-50' : ''
               } ${favorites.has(folder.id) ? 'bg-yellow-50' : ''}`}
              onClick={() => handleFolderClick(folder)}
            >
                             <div className="col-span-6 flex items-center space-x-3">
                 <Folder className={`h-5 w-5 ${folder.is_system_folder ? 'text-yellow-600' : 'text-blue-500'}`} />
                 <span className="font-medium text-gray-900">{folder.name}</span>
                {folder.is_system_folder && (
                  <Badge variant="outline" className="text-xs">
                    System
                  </Badge>
                )}
                {favorites.has(folder.id) && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                {session.user.name}
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {formatDate(folder.created_at)}
              </div>
              <div className="col-span-1 text-sm text-gray-600">-</div>
              <div className="col-span-1 flex justify-end space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleFavorite(folder.id, 'folder')
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Star className={`h-4 w-4 ${favorites.has(folder.id) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                </Button>
                {!folder.is_system_folder && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation()
                        setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })
                        setShowDeleteModal(true)
                      }}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}

          {/* Documents */}
          {sortedDocuments.map((document) => (
            <div
              key={document.id}
                             className={`grid grid-cols-12 gap-4 px-6 py-3 border-b hover:bg-gray-50 ${
                 favorites.has(document.id) ? 'bg-yellow-50' : ''
               }`}
            >
                             <div className="col-span-6 flex items-center space-x-3">
                 {getFileIconComponent(document.file_type)}
                 <span className="font-medium text-gray-900">{document.name}</span>
                {favorites.has(document.id) && (
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                )}
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-600">
                <User className="h-4 w-4 mr-1" />
                {session.user.name}
              </div>
              <div className="col-span-2 flex items-center text-sm text-gray-600">
                <Clock className="h-4 w-4 mr-1" />
                {formatDate(document.created_at)}
              </div>
              <div className="col-span-1 text-sm text-gray-600">
                {formatBytes(document.file_size)}
              </div>
              <div className="col-span-1 flex justify-end space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleFavorite(document.id, 'document')}
                  className="h-8 w-8 p-0"
                >
                  <Star className={`h-4 w-4 ${favorites.has(document.id) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload(document)}>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      setDeleteTarget({ type: 'file', id: document.id, name: document.name })
                      setShowDeleteModal(true)
                    }}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}

          {/* Empty State */}
          {folders.length === 0 && documents.length === 0 && !searchTerm && (
            <div className="text-center py-12">
              <Folder className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents or folders</h3>
              <p className="text-gray-600">Get started by uploading files or creating folders</p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {/* Folders */}
          {sortedFolders.map((folder) => (
            <Card key={folder.id} className={`hover:shadow-md transition-shadow relative group ${
              folder.is_system_folder ? 'border-yellow-200 bg-yellow-50' : ''
            } ${favorites.has(folder.id) ? 'border-yellow-300 bg-yellow-50' : ''}`}>
              <CardContent className="pt-6">
                <div 
                  className="text-center cursor-pointer"
                  onClick={() => handleFolderClick(folder)}
                >
                  <Folder className={`h-16 w-16 mx-auto mb-3 ${
                    folder.is_system_folder ? 'text-yellow-600' : 'text-blue-500'
                  }`} />
                  <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                  <p className="text-sm text-gray-500">Folder</p>
                  {folder.is_system_folder && (
                    <Badge variant="outline" className="text-xs mt-1">
                      System
                    </Badge>
                  )}
                  {favorites.has(folder.id) && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current mx-auto mt-1" />
                  )}
                                 </div>
                 
                 <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity space-x-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(folder.id, 'folder')
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <Star className={`h-3 w-3 ${favorites.has(folder.id) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                  </Button>
                  {!folder.is_system_folder && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget({ type: 'folder', id: folder.id, name: folder.name })
                          setShowDeleteModal(true)
                        }}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Documents */}
          {sortedDocuments.map((document) => (
            <Card key={document.id} className={`hover:shadow-md transition-shadow group ${
              favorites.has(document.id) ? 'border-yellow-300 bg-yellow-50' : ''
            }`}>
              <CardContent className="pt-6">
                <div className="text-center mb-3">
                  <div className="text-3xl mb-2">{getFileIcon(document.file_type)}</div>
                  <h3 className="font-medium text-gray-900 truncate text-sm">{document.name}</h3>
                  <p className="text-xs text-gray-500">{formatBytes(document.file_size)}</p>
                  {favorites.has(document.id) && (
                    <Star className="h-4 w-4 text-yellow-500 fill-current mx-auto mt-1" />
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{formatDate(document.created_at)}</span>
                  <span>{document.file_type}</span>
                </div>

                <div className="flex items-center justify-between space-x-1">
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
                    onClick={() => toggleFavorite(document.id, 'document')}
                    className="h-8 w-8 p-0"
                  >
                    <Star className={`h-3 w-3 ${favorites.has(document.id) ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDownload(document)}>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        setDeleteTarget({ type: 'file', id: document.id, name: document.name })
                        setShowDeleteModal(true)
                      }}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
