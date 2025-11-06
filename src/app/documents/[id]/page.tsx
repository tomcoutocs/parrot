'use client'

import { Suspense, use } from 'react'
import DocumentEditorPage from '@/components/document-editor-page'

export default function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense fallback={<DocumentEditorLoading />}>
      <DocumentEditorPageWrapper documentId={id} />
    </Suspense>
  )
}

function DocumentEditorPageWrapper({ documentId }: { documentId: string }) {
  return <DocumentEditorPage documentId={documentId} />
}

function DocumentEditorLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
    </div>
  )
}

