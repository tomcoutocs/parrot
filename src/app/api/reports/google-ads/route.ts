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

    // Format dates for Google Ads API (YYYYMMDD)
    const formatDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}${month}${day}`
    }
    
    const formattedStartDate = formatDate(startDate)
    const formattedEndDate = formatDate(endDate)
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    console.log(`Google Ads API: Requesting data from ${formattedStartDate} to ${formattedEndDate} (${daysDiff} days)`)

    // Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        refresh_token: credentials.refresh_token,
        grant_type: 'refresh_token',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      return NextResponse.json(
        { error: `Failed to refresh Google Ads access token: ${errorText}` },
        { status: 401 }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Query Google Ads API with daily breakdown
    const query = `
      SELECT
        segments.date,
        metrics.cost_micros / 1000000.0 AS spend,
        metrics.conversions,
        metrics.impressions,
        metrics.clicks
      FROM campaign
      WHERE segments.date >= '${formattedStartDate}' 
        AND segments.date <= '${formattedEndDate}'
      ORDER BY segments.date
    `

    const customerId = credentials.customer_id.replace(/-/g, '')
    const apiResponse = await fetch(
      `https://googleads.googleapis.com/v16/customers/${customerId}/googleAds:searchStream`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'developer-token': credentials.developer_token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query,
        }),
      }
    )

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text()
      return NextResponse.json(
        { error: `Google Ads API error: ${errorText}` },
        { status: apiResponse.status }
      )
    }

    // Google Ads searchStream returns newline-delimited JSON (NDJSON)
    // Each line is a separate JSON object
    const responseText = await apiResponse.text()
    const lines = responseText.split('\n').filter(line => line.trim())
    
    let allResults: any[] = []
    
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        // searchStream returns results in format: { results: [...] }
        if (parsed.results && Array.isArray(parsed.results)) {
          allResults = allResults.concat(parsed.results)
        } else if (parsed.segments || parsed.metrics) {
          // Or individual result objects
          allResults.push(parsed)
        }
      } catch (e) {
        // Skip invalid JSON lines
        console.warn('Failed to parse Google Ads response line:', line.substring(0, 100))
      }
    }
    
    console.log(`Google Ads API returned ${allResults.length} total results`)
    if (allResults.length > 0) {
      console.log('Sample result structure:', JSON.stringify(allResults[0], null, 2))
    }
    
    // Aggregate results and create daily breakdown
    let totalSpend = 0
    let totalConversions = 0
    let totalImpressions = 0
    let totalClicks = 0
    
    // Group by date for daily breakdown
    const dailyData: Record<string, { spend: number; conversions: number; impressions: number; clicks: number }> = {}

    allResults.forEach((result: any) => {
      // Google Ads API returns: { segments: { date: "YYYYMMDD" }, metrics: { cost_micros: ..., conversions: ... } }
      const date = result.segments?.date || ''
      const metrics = result.metrics || {}
      
      // cost_micros is in micros (1/1,000,000 of currency unit), convert to dollars
      const spend = metrics.cost_micros ? parseFloat(metrics.cost_micros) / 1000000.0 : 0
      const conversions = parseFloat(metrics.conversions || 0)
      const impressions = parseFloat(metrics.impressions || 0)
      const clicks = parseFloat(metrics.clicks || 0)

      if (date) {
        if (!dailyData[date]) {
          dailyData[date] = { spend: 0, conversions: 0, impressions: 0, clicks: 0 }
        }
        dailyData[date].spend += spend
        dailyData[date].conversions += conversions
        dailyData[date].impressions += impressions
        dailyData[date].clicks += clicks
      } else {
        console.warn('Google Ads result missing date:', JSON.stringify(result).substring(0, 200))
      }

      totalSpend += spend
      totalConversions += conversions
      totalImpressions += impressions
      totalClicks += clicks
    })
    
    console.log(`Google Ads dailyData keys (${Object.keys(dailyData).length} days):`, Object.keys(dailyData).sort())

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
    console.error('Error fetching Google Ads data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Google Ads data' },
      { status: 500 }
    )
  }
}

