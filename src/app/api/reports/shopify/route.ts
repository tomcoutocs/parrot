import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { credentials, dateRange } = body

    // Always request 30 days for historical data (regardless of dateRange filter)
    // The dateRange filter is applied client-side for summary metrics
    // Format dates for Shopify API (ISO 8601)
    const formatDate = (date: Date) => {
      return date.toISOString()
    }

    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999) // End of today
    const startDate = new Date(endDate)
    startDate.setDate(startDate.getDate() - 29) // 30 days total (including today)
    startDate.setHours(0, 0, 0, 0) // Start of day
    
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
    console.log(`Shopify API: Requesting data from ${formatDate(startDate)} to ${formatDate(endDate)} (${daysDiff} days)`)

    // Clean store domain (remove protocol if present)
    const storeDomain = credentials.store_domain.replace(/^https?:\/\//, '').replace(/\/$/, '')

    // Query Shopify API for orders with pagination to get all orders
    let allOrders: any[] = []
    let hasMore = true
    let pageInfo = null

    while (hasMore) {
      let url = `https://${storeDomain}/admin/api/2024-01/orders.json?status=any&created_at_min=${formatDate(startDate)}&created_at_max=${formatDate(endDate)}&limit=250`
      if (pageInfo) {
        url += `&page_info=${pageInfo}`
      }

      const apiResponse = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': credentials.access_token,
          'Content-Type': 'application/json',
        },
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text()
        return NextResponse.json(
          { error: `Shopify API error: ${errorText}` },
          { status: apiResponse.status }
        )
      }

      const data = await apiResponse.json()
      allOrders = allOrders.concat(data.orders || [])

      // Check for pagination
      const linkHeader = apiResponse.headers.get('link')
      if (linkHeader && linkHeader.includes('rel="next"')) {
        const nextMatch = linkHeader.match(/<[^>]+page_info=([^>]+)>; rel="next"/)
        pageInfo = nextMatch ? nextMatch[1] : null
        hasMore = !!pageInfo
      } else {
        hasMore = false
      }
    }

    // Calculate metrics and create daily breakdown
    const dailyData: Record<string, { revenue: number; orders: number }> = {}
    let totalRevenue = 0

    console.log(`Shopify API returned ${allOrders.length} orders`)
    if (allOrders.length > 0) {
      console.log('Sample order structure:', JSON.stringify({
        created_at: allOrders[0].created_at,
        total_price: allOrders[0].total_price
      }, null, 2))
    }

    allOrders.forEach((order: any) => {
      const orderDate = order.created_at ? order.created_at.split('T')[0] : ''
      const revenue = parseFloat(order.total_price || 0)

      if (orderDate) {
        if (!dailyData[orderDate]) {
          dailyData[orderDate] = { revenue: 0, orders: 0 }
        }
        dailyData[orderDate].revenue += revenue
        dailyData[orderDate].orders += 1
      } else {
        console.warn('Shopify order missing created_at:', order.id)
      }

      totalRevenue += revenue
    })
    
    console.log(`Shopify dailyData keys (${Object.keys(dailyData).length} days):`, Object.keys(dailyData).sort())

    const averageOrderValue = allOrders.length > 0 ? totalRevenue / allOrders.length : 0

    return NextResponse.json({
      revenue: totalRevenue,
      orders: allOrders.length,
      averageOrderValue,
      dailyData, // Include daily breakdown
    })
  } catch (error) {
    console.error('Error fetching Shopify data:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch Shopify data' },
      { status: 500 }
    )
  }
}

