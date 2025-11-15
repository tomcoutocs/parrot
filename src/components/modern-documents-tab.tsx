"use client"

import { useState, useEffect } from "react"
import { FileText, Folder, ChevronRight, Star, MoreHorizontal, Clock } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import { 
  getCompanyDocuments, 
  getCompanyFolders,
  type Document,
  type DocumentFolder
} from "@/lib/database-functions"
import { formatDate } from "@/lib/utils"

interface ModernDocumentsTabProps {
  activeSpace: string | null
}

export function ModernDocumentsTab({ activeSpace }: ModernDocumentsTabProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [folders, setFolders] = useState<DocumentFolder[]>([])
  const [currentPath, setCurrentPath] = useState<string[]>(["Documents"])
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeSpace) {
      setLoading(false)
      return
    }

    const loadData = async () => {
      setLoading(true)
      try {
        const folderPath = currentPath.length > 1 ? `/${currentPath.slice(1).join('/')}` : '/'
        const [docsResult, foldersResult] = await Promise.all([
          getCompanyDocuments(activeSpace, folderPath),
          getCompanyFolders(activeSpace, folderPath)
        ])

        if (docsResult.success) {
          setDocuments(docsResult.documents || [])
        }
        if (foldersResult.success) {
          setFolders(foldersResult.folders || [])
        }
      } catch (error) {
        console.error("Error loading documents:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [activeSpace, currentPath])

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleFolderClick = (folder: DocumentFolder) => {
    setCurrentPath([...currentPath, folder.name])
  }

  const handleBreadcrumbClick = (index: number) => {
    setCurrentPath(currentPath.slice(0, index + 1))
  }

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase()
    return <FileText className="w-4 h-4 text-muted-foreground" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading documents...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-medium">
            {currentPath.length > 1 ? currentPath.join(" · ") : "Documents"}
          </h2>
        </div>
      </div>

      {/* Breadcrumb */}
      {currentPath.length > 1 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {currentPath.map((segment, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-3 h-3" />}
              <button
                onClick={() => handleBreadcrumbClick(index)}
                className="hover:text-foreground transition-colors"
              >
                {segment}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search documents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Folders and Documents */}
      <Card className="border-border/60">
        <div className="divide-y divide-border/40">
          {/* Folders */}
          {filteredFolders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
            >
              <Folder className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 text-left">
                <div className="text-sm">{folder.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(folder.created_at)}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}

          {/* Documents */}
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
            >
              {getFileIcon(doc.name)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm truncate">{doc.name}</span>
                  {(doc as { is_favorite?: boolean }).is_favorite && (
                    <Star className="w-3.5 h-3.5 text-yellow-600 fill-yellow-600 flex-shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span>{formatFileSize(doc.file_size || 0)}</span>
                  <span>·</span>
                  <span>{formatDate(doc.created_at)}</span>
                </div>
              </div>
              <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
                <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}

          {filteredFolders.length === 0 && filteredDocuments.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No documents or folders</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

