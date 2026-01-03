"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { SystemAdminLayout } from '@/components/system-admin/system-admin-layout'
import { Loader2 } from 'lucide-react'
import { hasSystemAdminPrivileges } from '@/lib/role-helpers'

function SystemAdminContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('analytics')

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is system admin
    if (session && !hasSystemAdminPrivileges(session.user.role)) {
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Double-check system admin role before rendering
  if (!hasSystemAdminPrivileges(session.user.role)) {
    return null
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/apps/system-admin?tab=${tab}`)
  }

  return (
    <SystemAdminLayout activeTab={activeTab} onTabChange={handleTabChange} />
  )
}

export default function SystemAdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    }>
      <SystemAdminContent />
    </Suspense>
  )
}

