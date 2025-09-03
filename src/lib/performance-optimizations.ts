// Performance Optimizations for Client Portal
// This module implements various performance improvements to handle multiple concurrent users

import { supabase } from './supabase'

// Cache configuration
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 100 // Maximum number of cached items

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

// Activity tracking for timeline visualization
interface ActivityEvent {
  id: string
  timestamp: number
  type: 'database_query' | 'cache_hit' | 'cache_miss' | 'subscription' | 'error' | 'user_action'
  description: string
  duration?: number
  metadata?: Record<string, unknown>
}

class ActivityTracker {
  private events: ActivityEvent[] = []
  private maxEvents = 1000 // Keep last 1000 events

  addEvent(event: Omit<ActivityEvent, 'id' | 'timestamp'>) {
    const newEvent: ActivityEvent = {
      ...event,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now()
    }

    this.events.push(newEvent)

    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents)
    }
  }

  getEventsInTimeRange(startTime: number, endTime: number): ActivityEvent[] {
    return this.events.filter(event => 
      event.timestamp >= startTime && event.timestamp <= endTime
    )
  }

  getLastHourEvents(): ActivityEvent[] {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    return this.getEventsInTimeRange(oneHourAgo, Date.now())
  }

  getEventStats(): {
    totalEvents: number
    eventTypeBreakdown: Record<string, number>
    avgDuration: number
    errorCount: number
  } {
    const lastHourEvents = this.getLastHourEvents()
    const eventsByType: Record<string, number> = {}
    let totalDuration = 0
    let durationCount = 0
    let errorCount = 0

    lastHourEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1
      if (event.duration) {
        totalDuration += event.duration
        durationCount++
      }
      if (event.type === 'error') {
        errorCount++
      }
    })

    return {
      totalEvents: lastHourEvents.length,
      eventTypeBreakdown: eventsByType,
      avgDuration: durationCount > 0 ? totalDuration / durationCount : 0,
      errorCount
    }
  }

  clear(): void {
    this.events = []
  }
}

// Global activity tracker
export const activityTracker = new ActivityTracker()

class LRUCache<K, V> {
  private cache = new Map<K, V>()
  private maxSize: number

  constructor(maxSize: number) {
    this.maxSize = maxSize
  }

  get(key: K): V | undefined {
    if (this.cache.has(key)) {
      const value = this.cache.get(key)!
      this.cache.delete(key)
      this.cache.set(key, value)
      return value
    }
    return undefined
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      if (firstKey !== undefined) {
        this.cache.delete(firstKey)
      }
    }
    this.cache.set(key, value)
  }

  clear(): void {
    this.cache.clear()
  }

  size(): number {
    return this.cache.size
  }
}

// Global cache instances
const dataCache = new LRUCache<string, CacheItem<unknown>>(MAX_CACHE_SIZE)
const requestCache = new LRUCache<string, Promise<unknown>>(50)

// Request deduplication
const pendingRequests = new Map<string, Promise<unknown>>()

// Performance monitoring
const performanceMetrics = {
  cacheHits: 0,
  cacheMisses: 0,
  requestDeduplications: 0,
  averageResponseTime: 0,
  totalRequests: 0
}

// Cache utilities
export function getCacheKey(operation: string, params: Record<string, unknown>): string {
  return `${operation}:${JSON.stringify(params)}`
}

export function isCacheValid(item: CacheItem<unknown>): boolean {
  return Date.now() - item.timestamp < item.ttl
}

export function getCachedData<T>(key: string): T | null {
  const item = dataCache.get(key)
  if (item && isCacheValid(item)) {
    performanceMetrics.cacheHits++
    activityTracker.addEvent({
      type: 'cache_hit',
      description: `Cache hit for key: ${key}`,
      metadata: { key }
    })
    return item.data as T
  }
  performanceMetrics.cacheMisses++
  activityTracker.addEvent({
    type: 'cache_miss',
    description: `Cache miss for key: ${key}`,
    metadata: { key }
  })
  return null
}

export function setCachedData<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  })
}

// Request deduplication
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Check if there's already a pending request
  if (pendingRequests.has(key)) {
    performanceMetrics.requestDeduplications++
    activityTracker.addEvent({
      type: 'database_query',
      description: `Request deduplicated: ${key}`,
      metadata: { key }
    })
    return pendingRequests.get(key)! as Promise<T>
  }

  // Create new request
  const request = requestFn()
  pendingRequests.set(key, request)

  try {
    const result = await request
    return result
  } finally {
    pendingRequests.delete(key)
  }
}

// Optimized database functions with caching and deduplication
export async function optimizedFetch<T>(
  operation: string,
  params: Record<string, unknown>,
  fetchFn: () => Promise<T>,
  cacheKey?: string,
  ttl?: number
): Promise<T> {
  const startTime = Date.now()
  performanceMetrics.totalRequests++

  // Generate cache key if not provided
  const key = cacheKey || getCacheKey(operation, params)

  // Check cache first
  const cachedData = getCachedData<T>(key)
  if (cachedData !== null) {
    return cachedData
  }

  // Use request deduplication
  const result = await deduplicateRequest(key, async () => {
    const data = await fetchFn()
    setCachedData(key, data, ttl)
    return data
  })

  // Update performance metrics
  const responseTime = Date.now() - startTime
  performanceMetrics.averageResponseTime = 
    (performanceMetrics.averageResponseTime * (performanceMetrics.totalRequests - 1) + responseTime) / 
    performanceMetrics.totalRequests

  // Track database query activity
  activityTracker.addEvent({
    type: 'database_query',
    description: `Database query: ${operation}`,
    duration: responseTime,
    metadata: { operation, params, responseTime }
  })

  return result
}

// Batch operations for multiple requests
export async function batchFetch<T>(
  operations: Array<{
    operation: string
    params: Record<string, unknown>
    fetchFn: () => Promise<T>
    cacheKey?: string
    ttl?: number
  }>
): Promise<T[]> {
  const promises = operations.map(op => 
    optimizedFetch(op.operation, op.params, op.fetchFn, op.cacheKey, op.ttl)
  )
  
  return Promise.all(promises)
}

// Cache invalidation
export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    dataCache.clear()
    return
  }

  // Clear cache entries matching pattern
  const keysToDelete: string[] = []
  for (const key of dataCache['cache'].keys()) {
    if (key.includes(pattern)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => dataCache['cache'].delete(key))
}

// Performance monitoring
export function getPerformanceMetrics() {
  return {
    activeSubscriptions: subscriptionManager.getActiveSubscriptions(),
    subscriptionCount: subscriptionManager.getActiveSubscriptions().length,
    cacheStats: {
      cacheSize: dataCache.size(),
      cacheHits: performanceMetrics.cacheHits,
      cacheMisses: performanceMetrics.cacheMisses,
      totalRequests: performanceMetrics.totalRequests,
      averageResponseTime: performanceMetrics.averageResponseTime,
      requestDeduplications: performanceMetrics.requestDeduplications
    }
  }
}

// Activity timeline functions
export function getActivityTimeline() {
  return activityTracker.getLastHourEvents()
}

export function getActivityStats() {
  return activityTracker.getEventStats()
}

// Connection pooling simulation (since Supabase handles this)
export function getOptimizedSupabaseClient() {
  return supabase
}

// Debounced function for search operations
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttled function for frequent operations
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

// Subscription interface
export interface Subscription {
  unsubscribe: () => void
}

// Optimized subscription management
export class OptimizedSubscriptionManager {
  private subscriptions = new Map<string, { unsubscribe: () => void }>()
  private maxSubscriptions = 10

  subscribe(channel: string, callback: (data: unknown) => void): Subscription {
    // Clean up old subscriptions if we're at the limit
    if (this.subscriptions.size >= this.maxSubscriptions) {
      const firstKey = this.subscriptions.keys().next().value
      if (firstKey !== undefined) {
        this.unsubscribe(firstKey)
      }
    }

    if (!supabase) {
      // Return a dummy subscription object if supabase is not available
      return {
        unsubscribe: () => {}
      }
    }

    const subscription = supabase
      .channel(channel)
      .on('postgres_changes', { event: '*', schema: 'public' }, callback)
      .subscribe()

    this.subscriptions.set(channel, subscription)
    
    // Track subscription activity
    activityTracker.addEvent({
      type: 'subscription',
      description: `Subscription created: ${channel}`,
      metadata: { channel }
    })
    
    // Return an object with unsubscribe method that removes from our map
    return {
      unsubscribe: () => {
        if (subscription && typeof subscription.unsubscribe === 'function') {
          subscription.unsubscribe()
        }
        this.subscriptions.delete(channel)
        
        // Track subscription cleanup
        activityTracker.addEvent({
          type: 'subscription',
          description: `Subscription removed: ${channel}`,
          metadata: { channel }
        })
      }
    }
  }

  unsubscribe(channel: string): void {
    const subscription = this.subscriptions.get(channel)
    if (subscription && typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe()
    }
    this.subscriptions.delete(channel)
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription, channel) => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe()
      }
    })
    this.subscriptions.clear()
  }

  getActiveSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys())
  }
}

// Global subscription manager
export const subscriptionManager = new OptimizedSubscriptionManager()

// Memory management
export function cleanupMemory(): void {
  // Clear old cache entries
  const now = Date.now()
  const keysToDelete: string[] = []
  
  for (const [key, item] of dataCache['cache'].entries()) {
    if (!isCacheValid(item)) {
      keysToDelete.push(key)
    }
  }
  
  keysToDelete.forEach(key => dataCache['cache'].delete(key))
}

// Auto-cleanup every 5 minutes
setInterval(cleanupMemory, 5 * 60 * 1000)

// Export performance utilities
export {
  dataCache,
  requestCache,
  pendingRequests,
  performanceMetrics
}
