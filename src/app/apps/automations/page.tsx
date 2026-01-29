"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { AutomationsLayout } from '@/components/automations/automations-layout'
import { Loader2 } from 'lucide-react'
import { isInternalUser, canAccessApp } from '@/lib/role-helpers'
import { toastError } from '@/lib/toast'

function AutomationsContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('builder')

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
      if (!isInternalUser(userRole) || !canAccessApp('automations', userRole, tabPermissions)) {
        toastError('Access denied: You do not have permission to access this app')
        router.push('/apps')
        return
      }
    }
  }, [session, status, router])

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Double-check access before rendering
  const userRole = session.user.role
  const tabPermissions = session.user.tab_permissions || []
  
  if (userRole === 'user' || !isInternalUser(userRole) || !canAccessApp('automations', userRole, tabPermissions)) {
    return null
  }

  return (
    <AutomationsLayout activeTab={activeTab} onTabChange={setActiveTab} />
  )
}

export default function AutomationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <AutomationsContent />
    </Suspense>
  )
}

