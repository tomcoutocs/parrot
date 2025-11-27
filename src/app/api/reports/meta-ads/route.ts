import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credentials, dateRange } = body

    // Always request 30 days for historical data (regardless of dateRange filter)
    // The dateRange filter is applied client-side for summary metrics
    const endDate = new Date()
    endDate.setHours(0, 0, 0, 0) // Start of today
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 29) // 30 days total (including today)
    startDate.setHours(0, 0, 0, 0) // Start of day

    // Format dates for Meta API (YYYY-MM-DD)
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const formattedStartDate = formatDate(startDate)
    const formattedEndDate = formatDate(endDate)
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    console.log(`Meta Ads API: Requesting data from ${formattedStartDate} to ${formattedEndDate} (${daysDiff} days)`)

    // Clean ad account ID (remove 'act_' prefix if present)
    const accountId = credentials.ad_account_id.replace(/^act_/, '')

    // Query Meta Ads API with daily breakdown
    const fields = 'spend,actions,impressions,clicks'
    const level = 'account'
    const timeRange = `{"since":"${formattedStartDate}","until":"${formattedEndDate}"}`
    // Use "all_days" for daily breakdown (returns one row per day with activity)
    const timeIncrement = 'all_days'

    const apiUrl = `https://graph.facebook.com/v18.0/act_${accountId}/insights?fields=${fields}&level=${level}&time_range=${encodeURIComponent(timeRange)}&time_increment=${timeIncrement}&access_token=${credentials.access_token}`
    console.log(`Meta Ads API URL: ${apiUrl.replace(/access_token=[^&]+/, 'access_token=***')}`)

    const apiResponse = await fetch(apiUrl, {
      method: 'GET',
    })

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      return NextResponse.json(
        { error: `Meta Ads API error: ${errorText}` },
        { status: apiResponse.status }
      )
    }

    // Handle pagination - Meta Ads API may paginate results
    let allInsights: any[] = []
    let currentData = await apiResponse.json()
    
    // Log full response for debugging
    console.log(`Meta Ads API response status: ${apiResponse.status}`)
    console.log(`Meta Ads API response keys:`, Object.keys(currentData))
    if (currentData.error) {
      console.error('Meta Ads API error:', JSON.stringify(currentData.error, null, 2))
    }

    // Collect all insights from paginated responses
    while (currentData.data && currentData.data.length > 0) {
      allInsights = allInsights.concat(currentData.data)
      
      // Check for pagination
      if (currentData.paging && currentData.paging.next) {
        console.log('Fetching next page of Meta Ads insights...')
        const nextResponse = await fetch(currentData.paging.next)
        if (nextResponse.ok) {
          currentData = await nextResponse.json()
        } else {
          break
        }
      } else {
        break
      }
    }
    
    console.log(`Meta Ads API returned ${allInsights.length} total insights (after pagination)`)
    if (allInsights.length > 0) {
      console.log('Sample insight structure:', JSON.stringify(allInsights[0], null, 2))
      console.log('All insight date ranges:', allInsights.map((i: any) => ({
        date_start: i.date_start,
        date_stop: i.date_stop,
        isSingleDay: i.date_start === i.date_stop
      })))
      
      // Check if we're getting aggregated data instead of daily breakdowns
      const singleDayInsights = allInsights.filter((i: any) => i.date_start === i.date_stop)
      const aggregatedInsights = allInsights.filter((i: any) => i.date_start !== i.date_stop)
      console.log(`Single-day insights: ${singleDayInsights.length}, Aggregated insights: ${aggregatedInsights.length}`)
      
      if (aggregatedInsights.length > 0 && singleDayInsights.length === 0) {
        console.warn('Meta Ads API returned aggregated data instead of daily breakdowns. This suggests time_increment=all_days may not be working.')
      }
    } else {
      console.warn('Meta Ads API returned empty insights array. Full response:', JSON.stringify(currentData, null, 2))
    }
    
    const insights = allInsights
    
    // Aggregate totals and create daily breakdown
    let totalSpend = 0
    let totalConversions = 0
    let totalImpressions = 0
    let totalClicks = 0
    
    const dailyData: Record<string, { spend: number; conversions: number; impressions: number; clicks: number }> = {}

    insights.forEach((insight: any) => {
      const dateStart = insight.date_start || insight.date || ''
      const dateStop = insight.date_stop || dateStart
      const spend = parseFloat(insight.spend || 0)
      const impressions = parseFloat(insight.impressions || 0)
      const clicks = parseFloat(insight.clicks || 0)
      
      // Extract conversions from actions array
      let conversions = 0
      if (insight.actions) {
        const purchaseAction = insight.actions.find((action: any) => action.action_type === 'purchase')
        conversions = purchaseAction ? parseFloat(purchaseAction.value || 0) : 0
      }

      // Check if this is aggregated data (date range) or single day
      if (dateStart === dateStop) {
        // Single day - use directly
        if (dateStart) {
          dailyData[dateStart] = { spend, conversions, impressions, clicks }
        }
      } else {
        // Aggregated data - distribute evenly across all days in the range
        console.log(`Meta Ads: Distributing aggregated data from ${dateStart} to ${dateStop}`)
        const start = new Date(dateStart)
        const stop = new Date(dateStop)
        const daysInRange = Math.ceil((stop.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
        
        if (daysInRange > 0) {
          const dailySpend = spend / daysInRange
          const dailyConversions = conversions / daysInRange
          const dailyImpressions = impressions / daysInRange
          const dailyClicks = clicks / daysInRange
          
          // Generate all dates in the range
          for (let d = new Date(start); d <= stop; d.setDate(d.getDate() + 1)) {
            const dateKey = formatDate(d)
            if (!dailyData[dateKey]) {
              dailyData[dateKey] = { spend: 0, conversions: 0, impressions: 0, clicks: 0 }
            }
            dailyData[dateKey].spend += dailySpend
            dailyData[dateKey].conversions += dailyConversions
            dailyData[dateKey].impressions += dailyImpressions
            dailyData[dateKey].clicks += dailyClicks
          }
        }
      }

      totalSpend += spend
      totalConversions += conversions
      totalImpressions += impressions
      totalClicks += clicks
    })
    
    console.log(`Meta Ads dailyData keys (${Object.keys(dailyData).length} days):`, Object.keys(dailyData).sort())

    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const cpc = totalClicks > 0 ? totalSpend / totalClicks : 0
    const cpa = totalConversions > 0 ? totalSpend / totalConversions : 0

    return NextResponse.json({
      spend: totalSpend,
      conversions: totalConversions,
      impressions: totalImpressions,
      clicks: totalClicks,
      ctr,
      cpc,
      cpa,
      dailyData, // Include daily breakdown
    })
  } catch (error) {
    console.error('Error fetching Meta Ads data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Meta Ads data' },
      { status: 500 }
    )
  }
}

