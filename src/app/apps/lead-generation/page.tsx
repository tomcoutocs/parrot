"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { LeadGenerationLayout } from '@/components/lead-generation/lead-generation-layout'
import { Loader2 } from 'lucide-react'

function LeadGenerationContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin
    if (session && session.user.role !== 'admin') {
      router.push('/apps')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Double-check admin role before rendering
  if (session.user.role !== 'admin') {
    return null
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/apps/lead-generation?tab=${tab}`)
  }

  return (
    <LeadGenerationLayout activeTab={activeTab} onTabChange={handleTabChange} />
  )
}

export default function LeadGenerationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    }>
      <LeadGenerationContent />
    </Suspense>
  )
}
