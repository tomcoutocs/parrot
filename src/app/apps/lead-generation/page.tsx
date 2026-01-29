"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { LeadGenerationLayout } from '@/components/lead-generation/lead-generation-layout'
import { Loader2 } from 'lucide-react'
import { isInternalUser, canAccessApp } from '@/lib/role-helpers'
import { toastError } from '@/lib/toast'

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

    // Check if user is internal user and has permission
    if (session) {
      const userRole = session.user.role
      const tabPermissions = session.user.tab_permissions || []
      
      // Regular users (clients) cannot access this app
      if (userRole === 'user') {
        toastError('Access denied: This app is only available to internal users')
        router.push('/apps')
        return
      }
      
      // Internal users need explicit permission
      if (!isInternalUser(userRole) || !canAccessApp('lead-generation', userRole, tabPermissions)) {
        toastError('Access denied: You do not have permission to access this app')
        router.push('/apps')
        return
      }
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

  // Double-check access before rendering
  const userRole = session.user.role
  const tabPermissions = session.user.tab_permissions || []
  
  if (userRole === 'user' || !isInternalUser(userRole) || !canAccessApp('lead-generation', userRole, tabPermissions)) {
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
