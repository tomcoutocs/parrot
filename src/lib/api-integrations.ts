// API Integration functions for fetching real data from Google Ads, Meta Ads, Shopify, and Klaviyo

import { Company } from './supabase'

// Types for API responses
export interface GoogleAdsMetrics {
  spend: number
  conversions: number
  revenue?: number
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  cpa?: number
  roas?: number
  dailyData?: Record<string, { spend: number; conversions: number; impressions: number; clicks: number }>
}

export interface MetaAdsMetrics {
  spend: number
  conversions: number
  revenue?: number
  impressions?: number
  clicks?: number
  ctr?: number
  cpc?: number
  cpa?: number
  roas?: number
  dailyData?: Record<string, { spend: number; conversions: number; impressions: number; clicks: number }>
}

export interface ShopifyMetrics {
  revenue: number
  orders: number
  averageOrderValue?: number
  dailyData?: Record<string, { revenue: number; orders: number }>
}

export interface KlaviyoMetrics {
  emailsSent?: number
  opens?: number
  clicks?: number
  revenue?: number
}

export interface PerformanceDataPoint {
  date: string
  metaSpend: number
  googleSpend: number
  revenue: number
  metaRev: number
  googleRev: number
}

export interface ChannelDataPoint {
  channel: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  cpa: number
  change: string
  isPositive: boolean
}

// Google Ads API Integration (calls API route)
export async function fetchGoogleAdsData(
  credentials: {
    developer_token: string
    client_id: string
    client_secret: string
    refresh_token: string
    customer_id: string
  },
  dateRange: '1' | '7' | '30'
): Promise<GoogleAdsMetrics> {
  const response = await fetch('/api/reports/google-ads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentials,
      dateRange,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch Google Ads data')
  }

  return await response.json()
}

// Meta Ads API Integration (calls API route)
export async function fetchMetaAdsData(
  credentials: {
    app_id: string
    app_secret: string
    access_token: string
    ad_account_id: string
  },
  dateRange: '1' | '7' | '30'
): Promise<MetaAdsMetrics> {
  const response = await fetch('/api/reports/meta-ads', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentials,
      dateRange,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch Meta Ads data')
  }

  return await response.json()
}

// Shopify API Integration (calls API route)
export async function fetchShopifyData(
  credentials: {
    store_domain: string
    access_token: string
  },
  dateRange: '1' | '7' | '30'
): Promise<ShopifyMetrics> {
  const response = await fetch('/api/reports/shopify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      credentials,
      dateRange,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch Shopify data')
  }

  return await response.json()
}

// Klaviyo API Integration
export async function fetchKlaviyoData(
  credentials: {
    private_api_key: string
  },
  dateRange: '1' | '7' | '30'
): Promise<KlaviyoMetrics> {
  try {
    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    const days = dateRange === '1' ? 1 : dateRange === '7' ? 7 : 30
    startDate.setDate(startDate.getDate() - days)

    // Format dates for Klaviyo API (ISO 8601)
    const formatDate = (date: Date) => {
      return date.toISOString()
    }

    // Query Klaviyo API for metrics
    // Note: Klaviyo API structure may vary, this is a basic implementation
    const apiResponse = await fetch(
      `https://a.klaviyo.com/api/metrics/?page_size=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Klaviyo-API-Key ${credentials.private_api_key}`,
          'revision': '2024-02-15',
          'Content-Type': 'application/json',
        },
      }
    )

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      throw new Error(`Klaviyo API error: ${errorText}`)
    }

    const data = await apiResponse.json()

    // For now, return basic metrics structure
    // You may need to query specific endpoints based on your needs
    return {
      emailsSent: 0, // Would need to query campaigns endpoint
      opens: 0,
      clicks: 0,
      revenue: 0, // Would need to query events endpoint
    }
  } catch (error) {
    console.error('Error fetching Klaviyo data:', error)
    throw error
  }
}

// Main function to fetch all available data for a company
// Always fetches last 30 days of historical data, then filters by dateRange for display
export async function fetchCompanyReportsData(
  company: Company,
  dateRange: '1' | '7' | '30'
): Promise<{
  performanceData: PerformanceDataPoint[]
  channelData: ChannelDataPoint[]
  summaryMetrics: {
    totalRevenue: number
    totalSpend: number
    blendedROAS: number
    avgCPA: number
  }
}> {
  const performanceData: PerformanceDataPoint[] = []
  const channelData: ChannelDataPoint[] = []

  let googleAdsMetrics: GoogleAdsMetrics | null = null
  let metaAdsMetrics: MetaAdsMetrics | null = null
  let shopifyMetrics: ShopifyMetrics | null = null

  // Always fetch last 30 days of historical data for better chart visualization
  // We'll filter it by dateRange later for summary metrics
  const historicalDateRange: '1' | '7' | '30' = '30'

  // Fetch Google Ads data if credentials are available
  if (
    company.google_ads_developer_token &&
    company.google_ads_client_id &&
    company.google_ads_client_secret &&
    company.google_ads_refresh_token &&
    company.google_ads_customer_id
  ) {
    try {
      googleAdsMetrics = await fetchGoogleAdsData(
        {
          developer_token: company.google_ads_developer_token,
          client_id: company.google_ads_client_id,
          client_secret: company.google_ads_client_secret,
          refresh_token: company.google_ads_refresh_token,
          customer_id: company.google_ads_customer_id,
        },
        historicalDateRange // Always fetch 30 days
      )
    } catch (error) {
      console.error('Failed to fetch Google Ads data:', error)
    }
  }

  // Fetch Meta Ads data if credentials are available
  if (
    company.meta_ads_app_id &&
    company.meta_ads_app_secret &&
    company.meta_ads_access_token &&
    company.meta_ads_ad_account_id
  ) {
    try {
      metaAdsMetrics = await fetchMetaAdsData(
        {
          app_id: company.meta_ads_app_id,
          app_secret: company.meta_ads_app_secret,
          access_token: company.meta_ads_access_token,
          ad_account_id: company.meta_ads_ad_account_id,
        },
        historicalDateRange // Always fetch 30 days
      )
    } catch (error) {
      console.error('Failed to fetch Meta Ads data:', error)
    }
  }

  // Fetch Shopify data if credentials are available
  if (company.shopify_store_domain && company.shopify_access_token) {
    try {
      shopifyMetrics = await fetchShopifyData(
        {
          store_domain: company.shopify_store_domain,
          access_token: company.shopify_access_token,
        },
        historicalDateRange // Always fetch 30 days
      )
    } catch (error) {
      console.error('Failed to fetch Shopify data:', error)
    }
  }

  // Build channel data
  if (metaAdsMetrics) {
    const revenue = shopifyMetrics?.revenue ? shopifyMetrics.revenue * 0.6 : metaAdsMetrics.spend * 3.5 // Estimate if no Shopify
    const roas = metaAdsMetrics.spend > 0 ? revenue / metaAdsMetrics.spend : 0
    channelData.push({
      channel: 'Meta Ads',
      spend: metaAdsMetrics.spend,
      revenue,
      roas,
      conversions: metaAdsMetrics.conversions,
      cpa: metaAdsMetrics.cpa || 0,
      change: '+0%', // Would need historical data to calculate
      isPositive: true,
    })
  }

  if (googleAdsMetrics) {
    const revenue = shopifyMetrics?.revenue ? shopifyMetrics.revenue * 0.4 : googleAdsMetrics.spend * 3.2 // Estimate if no Shopify
    const roas = googleAdsMetrics.spend > 0 ? revenue / googleAdsMetrics.spend : 0
    channelData.push({
      channel: 'Google Ads',
      spend: googleAdsMetrics.spend,
      revenue,
      roas,
      conversions: googleAdsMetrics.conversions,
      cpa: googleAdsMetrics.cpa || 0,
      change: '+0%', // Would need historical data to calculate
      isPositive: true,
    })
  }

  // Generate performance data points using actual daily data from APIs
  // Always show last 30 days in chart, but filter summary metrics by selected dateRange
  const chartDays = 30 // Always show 30 days in chart
  const filterDays = dateRange === '1' ? 1 : dateRange === '7' ? 7 : 30 // Filter for summary metrics
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day
  const dateMap: Record<string, PerformanceDataPoint> = {}

  // Helper to normalize date keys (YYYY-MM-DD format)
  const normalizeDateKey = (date: Date): string => {
    return date.toISOString().split('T')[0]
  }

  // Helper to convert Google Ads date format (YYYYMMDD) to normalized format
  const normalizeGoogleAdsDate = (dateStr: string): string => {
    if (dateStr.length === 8) {
      // Format: YYYYMMDD
      return `${dateStr.substring(0, 4)}-${dateStr.substring(4, 6)}-${dateStr.substring(6, 8)}`
    }
    return dateStr
  }

  // Helper to check if a date is within the filter range
  const isDateInRange = (dateKey: string, days: number): boolean => {
    const date = new Date(dateKey)
    const cutoffDate = new Date(today)
    cutoffDate.setDate(cutoffDate.getDate() - days)
    return date >= cutoffDate && date <= today
  }

  // Initialize all dates for chart (last 30 days) with zeros
  console.log(`Initializing dateMap for ${chartDays} days starting from:`, today.toISOString().split('T')[0])
  const dateKeysCreated: string[] = []
  
  for (let i = chartDays - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateKey = normalizeDateKey(date)
    const displayDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    
    dateMap[dateKey] = {
      date: displayDate,
      metaSpend: 0,
      googleSpend: 0,
      revenue: 0,
      metaRev: 0,
      googleRev: 0,
    }
    dateKeysCreated.push(dateKey)
  }
  
  console.log(`Created ${dateKeysCreated.length} dateMap entries`)
  console.log(`DateMap date range: ${dateKeysCreated[0]} to ${dateKeysCreated[dateKeysCreated.length - 1]}`)

  // Fill in Meta Ads daily data (already in YYYY-MM-DD format)
  if (metaAdsMetrics?.dailyData && Object.keys(metaAdsMetrics.dailyData).length > 0) {
    const dailyDataKeys = Object.keys(metaAdsMetrics.dailyData)
    console.log(`Meta Ads: Found ${dailyDataKeys.length} days of daily data`)
    console.log(`Meta Ads date keys:`, dailyDataKeys.sort())
    console.log(`DateMap keys (first 5):`, Object.keys(dateMap).sort().slice(0, 5))
    console.log(`DateMap keys (last 5):`, Object.keys(dateMap).sort().slice(-5))
    
    let matchedDates = 0
    let unmatchedDates: string[] = []
    
    Object.entries(metaAdsMetrics.dailyData).forEach(([dateKey, dayData]) => {
      if (dateMap[dateKey]) {
        dateMap[dateKey].metaSpend = dayData.spend
        // Estimate revenue based on ROAS (or use Shopify data if available)
        const estimatedRev = dayData.spend * 3.5
        dateMap[dateKey].metaRev = estimatedRev
        matchedDates++
      } else {
        unmatchedDates.push(dateKey)
        console.warn(`Meta Ads date ${dateKey} not found in dateMap. Available dates:`, Object.keys(dateMap).slice(0, 10))
      }
    })
    
    console.log(`Meta Ads: Matched ${matchedDates} dates, ${unmatchedDates.length} unmatched`)
    if (unmatchedDates.length > 0 && matchedDates === 0) {
      console.warn('Meta Ads: No dates matched! This suggests a date format mismatch.')
    }
  } else if (metaAdsMetrics) {
    // If no daily data, distribute totals evenly across all 30 days
    console.log(`Meta Ads: No daily data found, distributing ${metaAdsMetrics.spend} total spend across ${chartDays} days`)
    const dailySpend = metaAdsMetrics.spend / chartDays
    const dailyConversions = metaAdsMetrics.conversions / chartDays
    Object.keys(dateMap).forEach((dateKey) => {
      dateMap[dateKey].metaSpend = dailySpend
      dateMap[dateKey].metaRev = dailySpend * 3.5
    })
  }

  // Fill in Google Ads daily data (convert from YYYYMMDD to YYYY-MM-DD)
  if (googleAdsMetrics?.dailyData && Object.keys(googleAdsMetrics.dailyData).length > 0) {
    const dailyDataKeys = Object.keys(googleAdsMetrics.dailyData)
    console.log(`Google Ads: Found ${dailyDataKeys.length} days of daily data`)
    console.log(`Google Ads date keys (raw):`, dailyDataKeys.sort())
    
    let matchedDates = 0
    let unmatchedDates: string[] = []
    
    Object.entries(googleAdsMetrics.dailyData).forEach(([dateKey, dayData]) => {
      const normalizedKey = normalizeGoogleAdsDate(dateKey)
      if (dateMap[normalizedKey]) {
        dateMap[normalizedKey].googleSpend = dayData.spend
        // Estimate revenue based on ROAS (or use Shopify data if available)
        const estimatedRev = dayData.spend * 3.2
        dateMap[normalizedKey].googleRev = estimatedRev
        matchedDates++
      } else {
        unmatchedDates.push(`${dateKey} -> ${normalizedKey}`)
        console.warn(`Google Ads date ${dateKey} (normalized: ${normalizedKey}) not found in dateMap`)
      }
    })
    
    console.log(`Google Ads: Matched ${matchedDates} dates, ${unmatchedDates.length} unmatched`)
    if (unmatchedDates.length > 0 && matchedDates === 0) {
      console.warn('Google Ads: No dates matched! This suggests a date format mismatch.')
      console.warn('Unmatched dates:', unmatchedDates.slice(0, 5))
    }
  } else if (googleAdsMetrics) {
    // If no daily data, distribute totals evenly across all 30 days
    console.log(`Google Ads: No daily data found, distributing ${googleAdsMetrics.spend} total spend across ${chartDays} days`)
    const dailySpend = googleAdsMetrics.spend / chartDays
    const dailyConversions = googleAdsMetrics.conversions / chartDays
    Object.keys(dateMap).forEach((dateKey) => {
      dateMap[dateKey].googleSpend = dailySpend
      dateMap[dateKey].googleRev = dailySpend * 3.2
    })
  }

  // Fill in Shopify daily revenue data
  if (shopifyMetrics?.dailyData && Object.keys(shopifyMetrics.dailyData).length > 0) {
    const dailyDataKeys = Object.keys(shopifyMetrics.dailyData)
    console.log(`Shopify: Found ${dailyDataKeys.length} days of daily data`)
    console.log(`Shopify date keys:`, dailyDataKeys.sort())
    
    let matchedDates = 0
    let unmatchedDates: string[] = []
    
    Object.entries(shopifyMetrics.dailyData).forEach(([dateKey, dayData]) => {
      if (dateMap[dateKey]) {
        dateMap[dateKey].revenue = dayData.revenue
        // If we have Shopify revenue, distribute it between Meta and Google based on spend ratio
        const totalSpend = dateMap[dateKey].metaSpend + dateMap[dateKey].googleSpend
        if (totalSpend > 0) {
          const metaRatio = dateMap[dateKey].metaSpend / totalSpend
          const googleRatio = dateMap[dateKey].googleSpend / totalSpend
          dateMap[dateKey].metaRev = dayData.revenue * metaRatio
          dateMap[dateKey].googleRev = dayData.revenue * googleRatio
        } else {
          // If no spend data, distribute evenly or use estimates
          dateMap[dateKey].metaRev = dayData.revenue * 0.6
          dateMap[dateKey].googleRev = dayData.revenue * 0.4
        }
        matchedDates++
      } else {
        unmatchedDates.push(dateKey)
        console.warn(`Shopify date ${dateKey} not found in dateMap`)
      }
    })
    
    console.log(`Shopify: Matched ${matchedDates} dates, ${unmatchedDates.length} unmatched`)
    if (unmatchedDates.length > 0 && matchedDates === 0) {
      console.warn('Shopify: No dates matched! This suggests a date format mismatch.')
    }
  } else if (shopifyMetrics) {
    // If no daily data or only one day, distribute totals evenly across all 30 days
    const dailyDataKeys = shopifyMetrics.dailyData ? Object.keys(shopifyMetrics.dailyData).length : 0
    console.log(`Shopify: ${dailyDataKeys} days of daily data found, distributing ${shopifyMetrics.revenue} total revenue across ${chartDays} days`)
    const dailyRevenue = shopifyMetrics.revenue / chartDays
    Object.keys(dateMap).forEach((dateKey) => {
      dateMap[dateKey].revenue = dailyRevenue
      // Distribute revenue between Meta and Google based on spend ratio
      const totalSpend = dateMap[dateKey].metaSpend + dateMap[dateKey].googleSpend
      if (totalSpend > 0) {
        const metaRatio = dateMap[dateKey].metaSpend / totalSpend
        const googleRatio = dateMap[dateKey].googleSpend / totalSpend
        dateMap[dateKey].metaRev = dailyRevenue * metaRatio
        dateMap[dateKey].googleRev = dailyRevenue * googleRatio
      } else {
        // If no spend data, distribute evenly
        dateMap[dateKey].metaRev = dailyRevenue * 0.6
        dateMap[dateKey].googleRev = dailyRevenue * 0.4
      }
    })
  } else {
    // If no Shopify data at all, use estimated revenue from ad spend
    Object.values(dateMap).forEach((point) => {
      if (point.revenue === 0) {
        point.revenue = point.metaRev + point.googleRev
      }
    })
  }

  // Convert to array and sort by date (for chart display - shows all 30 days)
  const sortedPerformanceData = Object.entries(dateMap)
    .map(([dateKey, point]) => ({ dateKey, ...point }))
    .sort((a, b) => {
      const dateA = new Date(a.dateKey)
      const dateB = new Date(b.dateKey)
      return dateA.getTime() - dateB.getTime()
    })
    .map(({ dateKey, ...point }) => point) // Remove dateKey for final array
  
  console.log(`Generated ${sortedPerformanceData.length} performance data points for chart`)
  console.log('Date map keys count:', Object.keys(dateMap).length)
  console.log('Sample data points (first 5):', sortedPerformanceData.slice(0, 5))
  console.log('Sample data points (last 5):', sortedPerformanceData.slice(-5))
  console.log('Days with non-zero data:', sortedPerformanceData.filter(p => 
    (p.metaSpend + p.googleSpend + p.revenue) > 0
  ).length)
  
  // Clear and set performance data (don't push to avoid duplicates)
  performanceData.length = 0
  performanceData.push(...sortedPerformanceData)

  // Store date keys with performance data for filtering
  const performanceDataWithKeys = Object.entries(dateMap).map(([dateKey, point]) => ({
    dateKey,
    ...point,
  }))

  // Filter performance data by selected dateRange for summary calculations
  // Chart will show all 30 days, but summary metrics will be filtered
  const filteredPerformanceData = performanceDataWithKeys.filter(({ dateKey }) => 
    isDateInRange(dateKey, filterDays)
  )

  // Calculate summary metrics based on filtered date range
  // Filter channel data totals by date range
  let filteredTotalSpend = 0
  let filteredTotalRevenue = 0
  let filteredTotalConversions = 0

  // Calculate filtered totals from performance data
  filteredPerformanceData.forEach((point) => {
    filteredTotalSpend += point.metaSpend + point.googleSpend
    filteredTotalRevenue += point.revenue
  })

  // Recalculate channel data based on filtered range
  const filteredChannelData: ChannelDataPoint[] = []
  
  if (metaAdsMetrics) {
    // Calculate filtered spend and conversions for Meta Ads
    let filteredMetaSpend = 0
    let filteredMetaConversions = 0
    
    if (metaAdsMetrics.dailyData) {
      Object.entries(metaAdsMetrics.dailyData).forEach(([dateKey, dayData]) => {
        if (isDateInRange(dateKey, filterDays)) {
          filteredMetaSpend += dayData.spend
          filteredMetaConversions += dayData.conversions
        }
      })
    } else {
      // Fallback: distribute total spend/conversions proportionally
      filteredMetaSpend = metaAdsMetrics.spend * (filterDays / 30)
      filteredMetaConversions = metaAdsMetrics.conversions * (filterDays / 30)
    }

    const revenue = shopifyMetrics?.revenue 
      ? (shopifyMetrics.revenue * 0.6 * (filterDays / 30)) 
      : filteredMetaSpend * 3.5
    const roas = filteredMetaSpend > 0 ? revenue / filteredMetaSpend : 0
    const cpa = filteredMetaConversions > 0 ? filteredMetaSpend / filteredMetaConversions : 0

    filteredChannelData.push({
      channel: 'Meta Ads',
      spend: filteredMetaSpend,
      revenue,
      roas,
      conversions: filteredMetaConversions,
      cpa,
      change: '+0%',
      isPositive: true,
    })
  }

  if (googleAdsMetrics) {
    // Calculate filtered spend and conversions for Google Ads
    let filteredGoogleSpend = 0
    let filteredGoogleConversions = 0
    
    if (googleAdsMetrics.dailyData) {
      Object.entries(googleAdsMetrics.dailyData).forEach(([dateKey, dayData]) => {
        const normalizedKey = normalizeGoogleAdsDate(dateKey)
        if (isDateInRange(normalizedKey, filterDays)) {
          filteredGoogleSpend += dayData.spend
          filteredGoogleConversions += dayData.conversions
        }
      })
    } else {
      // Fallback: distribute total spend/conversions proportionally
      filteredGoogleSpend = googleAdsMetrics.spend * (filterDays / 30)
      filteredGoogleConversions = googleAdsMetrics.conversions * (filterDays / 30)
    }

    const revenue = shopifyMetrics?.revenue 
      ? (shopifyMetrics.revenue * 0.4 * (filterDays / 30)) 
      : filteredGoogleSpend * 3.2
    const roas = filteredGoogleSpend > 0 ? revenue / filteredGoogleSpend : 0
    const cpa = filteredGoogleConversions > 0 ? filteredGoogleSpend / filteredGoogleConversions : 0

    filteredChannelData.push({
      channel: 'Google Ads',
      spend: filteredGoogleSpend,
      revenue,
      roas,
      conversions: filteredGoogleConversions,
      cpa,
      change: '+0%',
      isPositive: true,
    })
  }

  // Calculate summary metrics from filtered channel data
  const totalSpend = filteredChannelData.reduce((sum, c) => sum + c.spend, 0)
  const totalRevenue = filteredChannelData.reduce((sum, c) => sum + c.revenue, 0)
  const totalConversions = filteredChannelData.reduce((sum, c) => sum + c.conversions, 0)
  const blendedROAS = totalSpend > 0 ? totalRevenue / totalSpend : 0
  const avgCPA = totalConversions > 0 ? totalSpend / totalConversions : 0

  return {
    performanceData, // Show all 30 days in chart
    channelData: filteredChannelData, // Filtered by dateRange
    summaryMetrics: {
      totalRevenue,
      totalSpend,
      blendedROAS,
      avgCPA,
    },
  }
}

