"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { PlatformCustomizationLayout } from '@/components/platform-customization/platform-customization-layout'
import { Loader2 } from 'lucide-react'
import { hasAdminPrivileges } from '@/lib/role-helpers'

function PlatformCustomizationContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<string>('dashboard')

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is admin or system admin
    if (session && !hasAdminPrivileges(session.user.role)) {
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
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-fuchsia-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Double-check admin role before rendering
  if (!hasAdminPrivileges(session.user.role)) {
    return null
  }

  const handleTabChange = (tab: string) => {
    setActiveTab(tab)
    router.push(`/apps/platform-customization?tab=${tab}`)
  }

  return (
    <PlatformCustomizationLayout activeTab={activeTab} onTabChange={handleTabChange} />
  )
}

export default function PlatformCustomizationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-fuchsia-600" />
      </div>
    }>
      <PlatformCustomizationContent />
    </Suspense>
  )
}

