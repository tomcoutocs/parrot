"use client"

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { trackPageView } from '@/lib/analytics-tracking'

/**
 * Tracking Provider Component
 * 
 * This component ensures page views are tracked correctly in Next.js App Router.
 * It uses the usePathname hook to detect route changes and track them.
 * 
 * This works alongside the global tracking setup in analytics-tracking.ts
 * to ensure all navigation is captured, including:
 * - Initial page loads
 * - Client-side navigation (Next.js router)
 * - Browser back/forward navigation
 * - All apps (Dashboard, CRM, Analytics, User Management, etc.)
 * - All users (authenticated and anonymous)
 */
export function TrackingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Track page view whenever pathname changes (Next.js App Router)
    if (pathname) {
      trackPageView(pathname, document.title)
    }
  }, [pathname])

  return <>{children}</>
}

