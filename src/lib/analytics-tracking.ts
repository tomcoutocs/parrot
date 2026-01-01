"use client"

import { supabase } from './supabase'
import { getAnalyticsSettings } from './database-functions'
import { getCurrentUser } from './auth'

// Session management
let currentSessionId: string | null = null
let sessionStartTime: Date | null = null
let pageFlow: Array<{ path: string; title: string; timestamp: string; timeSpent?: number }> = []
let pageStartTime: Date | null = null
let lastPagePath: string | null = null
let sessionMetrics = {
  clicks: 0,
  scrolls: 0,
  formSubmits: 0,
}

// Initialize session
export function initTrackingSession(): string {
  if (!currentSessionId) {
    currentSessionId = crypto.randomUUID()
    sessionStartTime = new Date()
  }
  return currentSessionId
}

// Get current session ID
export function getCurrentSessionId(): string | null {
  return currentSessionId || initTrackingSession()
}

// Track page view
export async function trackPageView(pagePath: string, pageTitle?: string) {
  try {
    const settings = await getAnalyticsSettings()
    if (!settings.success || !settings.data?.tracking.pageViewTracking) {
      return
    }

    const user = getCurrentUser()
    const sessionId = getCurrentSessionId()
    
    if (!supabase) return

    // Calculate time spent on previous page
    if (pageStartTime && lastPagePath) {
      const timeSpent = Math.floor((Date.now() - pageStartTime.getTime()) / 1000)
      const lastPageIndex = pageFlow.length - 1
      if (lastPageIndex >= 0) {
        pageFlow[lastPageIndex].timeSpent = timeSpent
      }
    }

    // Track this page view
    await supabase.from('analytics_page_views').insert({
      user_id: user?.id || null,
      page_path: pagePath,
      page_title: pageTitle || document.title,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent,
      session_id: sessionId,
      space_id: user?.companyId || null, // Use companyId as space_id (after migration, this will be spaceId)
    })

    // Add to page flow
    pageFlow.push({
      path: pagePath,
      title: pageTitle || document.title,
      timestamp: new Date().toISOString(),
    })

    // Update session with page flow
    if (currentSessionId) {
      await supabase
        .from('analytics_sessions')
        .update({
          page_flow: pageFlow,
          exit_page: pagePath, // Update exit page as user navigates
        })
        .eq('id', currentSessionId)
    }

    // Start timing for this page
    pageStartTime = new Date()
    lastPagePath = pagePath
  } catch (error) {
    console.error('Error tracking page view:', error)
  }
}

// Track user behavior (clicks, scrolls, interactions)
export async function trackUserBehavior(
  eventType: 'click' | 'scroll' | 'interaction' | 'form_submit' | 'download',
  elementType: string,
  elementId?: string,
  elementText?: string,
  coordinates?: { x: number; y: number },
  metadata?: Record<string, any>
) {
  try {
    const settings = await getAnalyticsSettings()
    if (!settings.success || !settings.data?.tracking.userBehaviorTracking) {
      return
    }

    const user = getCurrentUser()
    const sessionId = getCurrentSessionId()
    
    if (!supabase) return

    await supabase.from('analytics_user_behaviors').insert({
      user_id: user?.id || null,
      event_type: eventType,
      element_type: elementType,
      element_id: elementId || null,
      element_text: elementText || null,
      page_path: window.location.pathname,
      coordinates: coordinates || null,
      metadata: metadata || {},
      session_id: sessionId,
      space_id: user?.companyId || null, // Use companyId as space_id (after migration, this will be spaceId)
    })

    // Update session metrics
    if (eventType === 'click') sessionMetrics.clicks++
    if (eventType === 'scroll') sessionMetrics.scrolls++
    if (eventType === 'form_submit') sessionMetrics.formSubmits++
  } catch (error) {
    console.error('Error tracking user behavior:', error)
  }
}

// Track session start
export async function trackSessionStart() {
  try {
    const settings = await getAnalyticsSettings()
    if (!settings.success || !settings.data?.tracking.sessionRecording) {
      return
    }

    const user = getCurrentUser()
    const sessionId = getCurrentSessionId()
    
    if (!supabase) return

    const entryPage = window.location.pathname
    const browserInfo = getBrowserInfo()
    const osInfo = getOSInfo()

    const { data } = await supabase.from('analytics_sessions').insert({
      id: sessionId,
      user_id: user?.id || null,
      session_start: new Date().toISOString(),
      device_type: getDeviceType(),
      browser: browserInfo.name,
      browser_version: browserInfo.version,
      os: osInfo.name,
      os_version: osInfo.version,
      screen_resolution: `${window.screen.width}x${window.screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language || 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'unknown',
      referrer: document.referrer || null,
      entry_page: entryPage,
      exit_page: entryPage, // Will be updated as user navigates
      page_flow: [{ path: entryPage, title: document.title, timestamp: new Date().toISOString() }],
      space_id: user?.companyId || null, // Use companyId as space_id (after migration, this will be spaceId)
    }).select().single()

    if (data) {
      currentSessionId = data.id
      pageFlow = [{ path: entryPage, title: document.title, timestamp: new Date().toISOString() }]
      pageStartTime = new Date()
      lastPagePath = entryPage
      sessionMetrics = { clicks: 0, scrolls: 0, formSubmits: 0 }
    }
  } catch (error) {
    console.error('Error tracking session start:', error)
  }
}

// Track session end
export async function trackSessionEnd() {
  try {
    const settings = await getAnalyticsSettings()
    if (!settings.success || !settings.data?.tracking.sessionRecording) {
      return
    }

    if (!currentSessionId || !sessionStartTime) return
    if (!supabase) return

    // Calculate final time spent on last page
    if (pageStartTime && lastPagePath) {
      const timeSpent = Math.floor((Date.now() - pageStartTime.getTime()) / 1000)
      const lastPageIndex = pageFlow.length - 1
      if (lastPageIndex >= 0) {
        pageFlow[lastPageIndex].timeSpent = timeSpent
      }
    }

    const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000)

    // Get page and interaction counts for this session
    const { data: pageViews } = await supabase
      .from('analytics_page_views')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', currentSessionId)

    const { data: behaviors } = await supabase
      .from('analytics_user_behaviors')
      .select('id, event_type', { count: 'exact', head: false })
      .eq('session_id', currentSessionId)

    const pageCount = pageViews?.length || pageFlow.length || 0
    const interactionCount = behaviors?.length || 0

    // Calculate average time per page
    const totalPageTime = pageFlow.reduce((sum, page) => sum + (page.timeSpent || 0), 0)
    const avgTimePerPage = pageCount > 0 ? totalPageTime / pageCount : 0

    // Calculate engagement score (0-100)
    // Factors: duration, pages visited, interactions, clicks, scrolls
    const engagementScore = calculateEngagementScore({
      duration,
      pageCount,
      interactionCount,
      clicks: sessionMetrics.clicks,
      scrolls: sessionMetrics.scrolls,
      formSubmits: sessionMetrics.formSubmits,
    })

    // Determine if bounce (single page session with short duration)
    const isBounce = pageCount <= 1 && duration < 30

    await supabase
      .from('analytics_sessions')
      .update({
        session_end: new Date().toISOString(),
        duration_seconds: duration,
        page_count: pageCount,
        interaction_count: interactionCount,
        click_count: sessionMetrics.clicks,
        scroll_count: sessionMetrics.scrolls,
        form_submit_count: sessionMetrics.formSubmits,
        page_flow: pageFlow,
        exit_page: lastPagePath || window.location.pathname,
        avg_time_per_page: avgTimePerPage,
        is_bounce: isBounce,
        engagement_score: engagementScore,
      })
      .eq('id', currentSessionId)

    // Reset session tracking
    currentSessionId = null
    sessionStartTime = null
    pageFlow = []
    pageStartTime = null
    lastPagePath = null
    sessionMetrics = { clicks: 0, scrolls: 0, formSubmits: 0 }
  } catch (error) {
    console.error('Error tracking session end:', error)
  }
}

// Track IP address (with geolocation if available)
export async function trackIPAddress() {
  try {
    const settings = await getAnalyticsSettings()
    if (!settings.success || !settings.data?.tracking.ipAddressTracking) {
      return
    }

    const user = getCurrentUser()
    const sessionId = getCurrentSessionId()
    
    if (!supabase) return

    // Get IP address (this would typically come from your backend/API)
    // For now, we'll store a placeholder - in production, get this from your API
    const ipAddress = '0.0.0.0' // Placeholder - should come from backend

    await supabase.from('analytics_ip_tracking').insert({
      user_id: user?.id || null,
      ip_address: ipAddress,
      page_path: window.location.pathname,
      session_id: sessionId,
      space_id: user?.companyId || null, // Use companyId as space_id (after migration, this will be spaceId)
    })
  } catch (error) {
    console.error('Error tracking IP address:', error)
  }
}

// Helper functions
function getDeviceType(): string {
  const ua = navigator.userAgent.toLowerCase()
  if (/tablet|ipad|playbook|silk/i.test(ua)) return 'tablet'
  if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

function getBrowserInfo(): { name: string; version: string } {
  const ua = navigator.userAgent
  let name = 'Unknown'
  let version = 'Unknown'

  if (ua.includes('Firefox/')) {
    name = 'Firefox'
    const match = ua.match(/Firefox\/(\d+\.\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Chrome/') && !ua.includes('Edg')) {
    name = 'Chrome'
    const match = ua.match(/Chrome\/(\d+\.\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
    name = 'Safari'
    const match = ua.match(/Version\/(\d+\.\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Edg/')) {
    name = 'Edge'
    const match = ua.match(/Edg\/(\d+\.\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('Opera/') || ua.includes('OPR/')) {
    name = 'Opera'
    const match = ua.match(/(?:Opera|OPR)\/(\d+\.\d+)/)
    version = match ? match[1] : 'Unknown'
  }

  return { name, version }
}

function getOSInfo(): { name: string; version: string } {
  const ua = navigator.userAgent
  let name = 'Unknown'
  let version = 'Unknown'

  if (ua.includes('Windows NT')) {
    name = 'Windows'
    if (ua.includes('Windows NT 10.0')) version = '10/11'
    else if (ua.includes('Windows NT 6.3')) version = '8.1'
    else if (ua.includes('Windows NT 6.2')) version = '8'
    else if (ua.includes('Windows NT 6.1')) version = '7'
  } else if (ua.includes('Mac OS X')) {
    name = 'macOS'
    const match = ua.match(/Mac OS X (\d+[._]\d+)/)
    version = match ? match[1].replace('_', '.') : 'Unknown'
  } else if (ua.includes('Linux')) {
    name = 'Linux'
    version = 'Unknown'
  } else if (ua.includes('Android')) {
    name = 'Android'
    const match = ua.match(/Android (\d+\.\d+)/)
    version = match ? match[1] : 'Unknown'
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    name = 'iOS'
    const match = ua.match(/OS (\d+[._]\d+)/)
    version = match ? match[1].replace('_', '.') : 'Unknown'
  }

  return { name, version }
}

function calculateEngagementScore(metrics: {
  duration: number
  pageCount: number
  interactionCount: number
  clicks: number
  scrolls: number
  formSubmits: number
}): number {
  let score = 0

  // Duration score (max 30 points)
  // 0-30s: 0, 30-60s: 10, 1-5min: 20, 5+ min: 30
  if (metrics.duration >= 300) score += 30
  else if (metrics.duration >= 60) score += 20
  else if (metrics.duration >= 30) score += 10

  // Page count score (max 25 points)
  // 1 page: 5, 2-3 pages: 15, 4-6 pages: 20, 7+ pages: 25
  if (metrics.pageCount >= 7) score += 25
  else if (metrics.pageCount >= 4) score += 20
  else if (metrics.pageCount >= 2) score += 15
  else if (metrics.pageCount >= 1) score += 5

  // Interaction score (max 25 points)
  // 0 interactions: 0, 1-5: 10, 6-15: 20, 16+: 25
  if (metrics.interactionCount >= 16) score += 25
  else if (metrics.interactionCount >= 6) score += 20
  else if (metrics.interactionCount >= 1) score += 10

  // Click score (max 10 points)
  // 0 clicks: 0, 1-5: 5, 6-15: 8, 16+: 10
  if (metrics.clicks >= 16) score += 10
  else if (metrics.clicks >= 6) score += 8
  else if (metrics.clicks >= 1) score += 5

  // Scroll score (max 5 points)
  // Shows user is reading/engaging with content
  if (metrics.scrolls >= 5) score += 5
  else if (metrics.scrolls >= 2) score += 3
  else if (metrics.scrolls >= 1) score += 1

  // Form submit bonus (max 5 points)
  if (metrics.formSubmits >= 1) score += 5

  return Math.min(100, Math.max(0, score))
}

// Setup automatic tracking on page load
// This runs globally for all users across all apps
if (typeof window !== 'undefined') {
  // Initialize session
  initTrackingSession()
  
  // Track initial page view
  trackPageView(window.location.pathname, document.title)
  
  // Track IP on load
  trackIPAddress()
  
  // Track session start
  trackSessionStart()
  
  // Track page view on navigation (for Next.js SPA navigation)
  // Listen to popstate for browser back/forward
  let lastPath = window.location.pathname
  window.addEventListener('popstate', () => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname
      trackPageView(window.location.pathname, document.title)
    }
  })
  
  // Also use MutationObserver as fallback for client-side navigation
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname
      trackPageView(window.location.pathname, document.title)
    }
  })
  observer.observe(document.body, { childList: true, subtree: true })
  
  // Track clicks globally (all apps, all users)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    // Skip tracking clicks on tracking/analytics elements themselves
    if (target.closest('[data-no-track]')) return
    
    trackUserBehavior(
      'click',
      target.tagName.toLowerCase(),
      target.id || undefined,
      target.textContent?.trim().substring(0, 100) || undefined,
      { x: e.clientX, y: e.clientY }
    )
  }, { passive: true })
  
  // Track scrolls globally (throttled)
  let scrollTimeout: NodeJS.Timeout
  document.addEventListener('scroll', () => {
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(() => {
      trackUserBehavior(
        'scroll',
        'page',
        undefined,
        undefined,
        { x: window.scrollX, y: window.scrollY }
      )
    }, 1000) // Throttle to once per second
  }, { passive: true })
  
  // Track session end on page unload
  window.addEventListener('beforeunload', () => {
    trackSessionEnd()
  })
  
  // Track visibility changes (tab switch, minimize, etc.)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Tab switched away - could track as session pause
    } else {
      // Tab switched back - could track as session resume
      trackPageView(window.location.pathname, document.title)
    }
  })
}

