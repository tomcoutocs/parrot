'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Download, Eye, FileText, Image as ImageIcon, File, FileVideo, FileAudio, FileSpreadsheet } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { supabase } from '@/lib/supabase'
import type { Document } from '@/lib/database-functions'

interface DocumentPreviewModalProps {
  document: Document | null
  isOpen: boolean
  onClose: () => void
}

interface PreviewContent {
  type: 'image' | 'pdf' | 'text' | 'video' | 'audio' | 'unsupported'
  url: string
  content?: string
}

export default function DocumentPreviewModal({ document: doc, isOpen, onClose }: DocumentPreviewModalProps) {
  const [previewContent, setPreviewContent] = useState<PreviewContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (doc && isOpen) {
      loadPreview()
    }
  }, [doc, isOpen])

  const getFileType = (fileName: string, mimeType: string): PreviewContent['type'] => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    // Image files
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(extension || '')) {
      return 'image'
    }
    
    // PDF files
    if (mimeType === 'application/pdf' || extension === 'pdf') {
      return 'pdf'
    }
    
    // Text files
    if (mimeType.startsWith('text/') || ['txt', 'md', 'json', 'xml', 'csv', 'log'].includes(extension || '')) {
      return 'text'
    }
    
    // Video files
    if (mimeType.startsWith('video/') || ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm'].includes(extension || '')) {
      return 'video'
    }
    
    // Audio files
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'aac', 'flac'].includes(extension || '')) {
      return 'audio'
    }
    
    return 'unsupported'
  }

  const loadPreview = async () => {
    if (!doc || !supabase) return

    setLoading(true)
    setError('')

    try {
      const fileType = getFileType(doc.name, doc.file_type)
      
      if (fileType === 'unsupported') {
        setError('Preview not available for this file type')
        setLoading(false)
        return
      }

      console.log('Loading preview for document:', {
        id: doc.id,
        name: doc.name,
        file_path: doc.file_path,
        file_type: doc.file_type
      })

      // Get the file URL from Supabase Storage
      const { data, error: downloadError } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.file_path, 3600) // 1 hour expiry

      if (downloadError) {
        console.error('Storage error:', downloadError)
        if (downloadError.message.includes('Object not found')) {
          setError('Document file not found in storage. The file may have been moved or deleted.')
        } else {
          setError(`Storage error: ${downloadError.message}`)
        }
        setLoading(false)
        return
      }

      if (!data?.signedUrl) {
        throw new Error('Failed to generate preview URL')
      }

      console.log('Generated signed URL:', data.signedUrl)

      // For text files, fetch the content
      if (fileType === 'text') {
        try {
          const response = await fetch(data.signedUrl)
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }
          const content = await response.text()
          setPreviewContent({
            type: 'text',
            url: data.signedUrl,
            content: content
          })
        } catch (textError) {
          console.warn('Could not load text content, showing URL instead:', textError)
          setPreviewContent({
            type: 'text',
            url: data.signedUrl
          })
        }
      } else {
        setPreviewContent({
          type: fileType,
          url: data.signedUrl
        })
      }
    } catch (err) {
      console.error('Error loading preview:', err)
      setError('Failed to load document preview. Please try downloading the file instead.')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!doc || !supabase) return

    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(doc.file_path)

      if (error) throw error

      // Create download link
      const url = URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.download = doc.name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Download error:', err)
      setError('Failed to download document')
    }
  }

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image': return <ImageIcon className="h-6 w-6" />
      case 'pdf': return <FileText className="h-6 w-6" />
      case 'text': return <FileText className="h-6 w-6" />
      case 'video': return <FileVideo className="h-6 w-6" />
      case 'audio': return <FileAudio className="h-6 w-6" />
      default: return <File className="h-6 w-6" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!doc) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {getFileIcon(getFileType(doc.name, doc.file_type))}
            <div>
              <DialogTitle className="text-lg font-semibold">{doc.name}</DialogTitle>
              <div className="flex items-center space-x-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {formatFileSize(doc.file_size)}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {doc.file_type}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading preview...</p>
              </div>
            </div>
          )}

          {error && (
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {previewContent && !loading && !error && (
            <div className="space-y-4">
              {previewContent.type === 'image' && (
                <div className="flex justify-center">
                  <Image
                    src={previewContent.url}
                    alt={doc.name}
                    width={800}
                    height={600}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg shadow-lg"
                    onError={() => setError('Failed to load image preview')}
                  />
                </div>
              )}

              {previewContent.type === 'pdf' && (
                <div className="w-full h-[60vh]">
                  <iframe
                    src={previewContent.url}
                    className="w-full h-full border rounded-lg"
                    title={doc.name}
                    onError={() => setError('Failed to load PDF preview')}
                  />
                </div>
              )}

              {previewContent.type === 'text' && (
                <div className="bg-gray-50 rounded-lg p-4 max-h-[60vh] overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm font-mono">
                    {previewContent.content || 'Text content could not be loaded. Click download to view the file.'}
                  </pre>
                </div>
              )}

              {previewContent.type === 'video' && (
                <div className="flex justify-center">
                  <video
                    src={previewContent.url}
                    controls
                    className="max-w-full max-h-[60vh] rounded-lg shadow-lg"
                    onError={() => setError('Failed to load video preview')}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              )}

              {previewContent.type === 'audio' && (
                <div className="flex justify-center">
                  <audio
                    src={previewContent.url}
                    controls
                    className="w-full max-w-md"
                    onError={() => setError('Failed to load audio preview')}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
