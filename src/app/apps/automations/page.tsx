"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AutomationsLayout } from '@/components/automations/automations-layout'
import { Loader2 } from 'lucide-react'

function AutomationsContent() {
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState('builder')

  useEffect(() => {
    const tab = searchParams?.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [searchParams])

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

