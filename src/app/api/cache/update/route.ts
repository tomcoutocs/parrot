import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { decrypt } from '@/lib/encryption'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Helper to get Google Ads credentials
async function getGoogleAdsCredentials(companyId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('companies')
    .select('google_ads_developer_token, google_ads_client_id, google_ads_client_secret, google_ads_refresh_token, google_ads_customer_id')
    .eq('id', companyId)
    .single()

  if (error || !data) return null

  return {
    developer_token: data.google_ads_developer_token ? await decrypt(data.google_ads_developer_token) : undefined,
    client_id: data.google_ads_client_id || undefined,
    client_secret: data.google_ads_client_secret ? await decrypt(data.google_ads_client_secret) : undefined,
    refresh_token: data.google_ads_refresh_token ? await decrypt(data.google_ads_refresh_token) : undefined,
    customer_id: data.google_ads_customer_id || undefined,
  }
}

// Helper to get Meta Ads credentials
async function getMetaAdsCredentials(companyId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('companies')
    .select('meta_ads_app_id, meta_ads_app_secret, meta_ads_access_token, meta_ads_ad_account_id')
    .eq('id', companyId)
    .single()

  if (error || !data) return null

  return {
    app_id: data.meta_ads_app_id || undefined,
    app_secret: data.meta_ads_app_secret ? await decrypt(data.meta_ads_app_secret) : undefined,
    access_token: data.meta_ads_access_token ? await decrypt(data.meta_ads_access_token) : undefined,
    ad_account_id: data.meta_ads_ad_account_id || undefined,
  }
}

// Helper to get Shopify credentials
async function getShopifyCredentials(companyId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const { data, error } = await supabase
    .from('companies')
    .select('shopify_store_domain, shopify_access_token')
    .eq('id', companyId)
    .single()

  if (error || !data) {
    console.warn('Failed to fetch Shopify credentials:', {
      error,
      hasData: !!data,
      companyId,
    })
    return null
  }

  // Log what we found
  console.log('Shopify credentials fetched from DB:', {
    has_store_domain: !!data.shopify_store_domain,
    has_access_token: !!data.shopify_access_token,
    store_domain: data.shopify_store_domain,
  })

  const storeDomain = data.shopify_store_domain || undefined
  let accessToken: string | undefined = undefined

  if (data.shopify_access_token) {
    try {
      // Try to decrypt - decrypt is async, so we need to await it
      const decrypted = await decrypt(data.shopify_access_token)
      // Ensure we have a string value
      accessToken = typeof decrypted === 'string' && decrypted ? decrypted : undefined
      
      if (!accessToken) {
        // If decryption returned null/empty, try using the value as-is (might be unencrypted)
        accessToken = typeof data.shopify_access_token === 'string' 
          ? data.shopify_access_token 
          : String(data.shopify_access_token || '')
      }
      
      // Check if decryption returned the same value (meaning it wasn't encrypted)
      if (accessToken === data.shopify_access_token && accessToken.length > 50) {
        // If it's the same and looks like a token, it might not have been encrypted
        // But let's use it anyway
        console.log('Shopify access token appears to be unencrypted')
      }
    } catch (decryptError) {
      // If decryption fails, try using the value as-is (might be unencrypted)
      console.warn('Failed to decrypt Shopify access token, using as-is:', decryptError)
      accessToken = typeof data.shopify_access_token === 'string' 
        ? data.shopify_access_token 
        : String(data.shopify_access_token || '')
    }
  }

  // Ensure we return strings or undefined, never null or other types
  return {
    store_domain: typeof storeDomain === 'string' ? storeDomain : undefined,
    access_token: typeof accessToken === 'string' && accessToken.length > 0 ? accessToken : undefined,
  }
}

// Update cache for a specific date (yesterday by default, or today if forceToday=true)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { companyId, date, forceToday = false } = body

    if (!companyId) {
      return NextResponse.json({ error: 'companyId is required' }, { status: 400 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results: any = {
      googleAds: { success: false, error: null },
      metaAds: { success: false, error: null },
      shopify: { success: false, error: null },
    }

    // Update Google Ads cache
    const googleCreds = await getGoogleAdsCredentials(companyId)
    if (googleCreds?.developer_token && googleCreds?.client_id && googleCreds?.refresh_token && googleCreds?.customer_id) {
      try {
        const googleResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/reports/google-ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credentials: googleCreds,
            dateRange: '30',
          }),
        })

        if (googleResponse.ok) {
          const googleData = await googleResponse.json()
          const dailyData = googleData.dailyData || {}
          
          // Store all daily data from the API response
          const cacheEntries = Object.entries(dailyData).map(([date, dayData]: [string, any]) => ({
            company_id: companyId,
            date,
            spend: dayData.spend || 0,
            conversions: dayData.conversions || 0,
            impressions: dayData.impressions || 0,
            clicks: dayData.clicks || 0,
            revenue: dayData.revenue || 0,
            ctr: dayData.ctr || 0,
            cpc: dayData.cpc || 0,
            cpa: dayData.cpa || 0,
            roas: dayData.roas || 0,
          }))

          if (cacheEntries.length > 0) {
            await supabase
              .from('google_ads_metrics_cache')
              .upsert(cacheEntries, {
                onConflict: 'company_id,date',
              })
          }

          results.googleAds.success = true
        } else {
          const errorText = await googleResponse.text()
          let errorMessage = errorText
          
          // Try to parse JSON error for better error messages
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error) {
              errorMessage = errorJson.error
            }
          } catch {
            // If parsing fails, use the original error text
          }
          
          results.googleAds.error = errorMessage
          console.warn('Google Ads API error:', errorMessage)
        }
      } catch (error: any) {
        results.googleAds.error = error.message || 'Failed to connect to Google Ads API'
        console.error('Google Ads cache update error:', error)
      }
    }

    // Update Meta Ads cache
    const metaCreds = await getMetaAdsCredentials(companyId)
    if (metaCreds?.app_id && metaCreds?.access_token && metaCreds?.ad_account_id) {
      try {
        const metaResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/reports/meta-ads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            credentials: metaCreds,
            dateRange: '30',
          }),
        })

        if (metaResponse.ok) {
          const metaData = await metaResponse.json()
          const dailyData = metaData.dailyData || {}
          
          // Store all daily data from the API response
          const cacheEntries = Object.entries(dailyData).map(([date, dayData]: [string, any]) => ({
            company_id: companyId,
            date,
            spend: dayData.spend || 0,
            conversions: dayData.conversions || 0,
            impressions: dayData.impressions || 0,
            clicks: dayData.clicks || 0,
            revenue: dayData.revenue || 0,
            ctr: dayData.ctr || 0,
            cpc: dayData.cpc || 0,
            cpa: dayData.cpa || 0,
            roas: dayData.roas || 0,
          }))

          if (cacheEntries.length > 0) {
            await supabase
              .from('meta_ads_metrics_cache')
              .upsert(cacheEntries, {
                onConflict: 'company_id,date',
              })
          }

          results.metaAds.success = true
        } else {
          const errorText = await metaResponse.text()
          let errorMessage = errorText
          
          // Try to parse JSON error for better error messages
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error) {
              errorMessage = errorJson.error
            }
          } catch {
            // If parsing fails, use the original error text
          }
          
          results.metaAds.error = errorMessage
          console.warn('Meta Ads API error:', errorMessage)
        }
      } catch (error: any) {
        results.metaAds.error = error.message || 'Failed to connect to Meta Ads API'
        console.error('Meta Ads cache update error:', error)
      }
    }

    // Update Shopify cache
    const shopifyCreds = await getShopifyCredentials(companyId)
    if (shopifyCreds?.store_domain && shopifyCreds?.access_token) {
      // Validate credentials before making API call
      const storeDomain = typeof shopifyCreds.store_domain === 'string' 
        ? shopifyCreds.store_domain.trim() 
        : String(shopifyCreds.store_domain || '').trim()
      const accessToken = typeof shopifyCreds.access_token === 'string'
        ? shopifyCreds.access_token.trim()
        : String(shopifyCreds.access_token || '').trim()
      
      if (!storeDomain || !accessToken) {
        results.shopify.error = 'Shopify credentials are empty. Please update your Shopify credentials.'
        console.warn('Shopify credentials validation failed: empty values', {
          store_domain_type: typeof shopifyCreds.store_domain,
          access_token_type: typeof shopifyCreds.access_token,
        })
      } else {
        try {
          // Debug: Log credential details (without exposing full token)
          console.log('Shopify credentials retrieved:', {
            store_domain: storeDomain,
            access_token_length: accessToken.length,
            access_token_prefix: accessToken.substring(0, 10),
          })
          
          const shopifyResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/reports/shopify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              credentials: {
                store_domain: storeDomain,
                access_token: accessToken,
              },
              dateRange: '30',
            }),
          })

        if (shopifyResponse.ok) {
          const shopifyData = await shopifyResponse.json()
          const dailyData = shopifyData.dailyData || {}
          
          // Store all daily data from the API response
          const cacheEntries = Object.entries(dailyData).map(([date, dayData]: [string, any]) => ({
            company_id: companyId,
            date,
            revenue: dayData.revenue || 0,
            orders: dayData.orders || 0,
            average_order_value: shopifyData.averageOrderValue || 0,
          }))

          if (cacheEntries.length > 0) {
            await supabase
              .from('shopify_metrics_cache')
              .upsert(cacheEntries, {
                onConflict: 'company_id,date',
              })
          }

          results.shopify.success = true
        } else {
          const errorText = await shopifyResponse.text()
          let errorMessage = errorText
          
          // Try to parse JSON error for better error messages
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error) {
              errorMessage = errorJson.error
            } else if (errorJson.errors) {
              // Handle Shopify API error format
              if (typeof errorJson.errors === 'string') {
                errorMessage = errorJson.errors
              } else if (Array.isArray(errorJson.errors)) {
                errorMessage = errorJson.errors.join(', ')
              } else if (typeof errorJson.errors === 'object') {
                errorMessage = JSON.stringify(errorJson.errors)
              }
            }
          } catch {
            // If parsing fails, use the original error text
          }
          
          // Check for common error patterns and provide user-friendly messages
          if (errorMessage.includes('Invalid API key') || errorMessage.includes('unrecognized login')) {
            errorMessage = 'Invalid Shopify API credentials. Please update your Shopify credentials in Settings.'
          } else if (errorMessage.includes('access token')) {
            errorMessage = 'Shopify access token is invalid or expired. Please update your Shopify credentials.'
          }
          
          results.shopify.error = errorMessage
          console.warn('Shopify API error:', errorMessage)
        }
        } catch (error: any) {
          results.shopify.error = error.message || 'Failed to connect to Shopify API'
          console.error('Shopify cache update error:', error)
        }
      }
      // If validation failed, error was already set above
    } else {
      results.shopify.error = 'Shopify credentials not configured'
      console.warn('Shopify credentials not found for company:', companyId)
    }

    // Clean up old data (remove data older than 31 days)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 31)
    const cutoffDateString = cutoffDate.toISOString().split('T')[0]

    await supabase
      .from('google_ads_metrics_cache')
      .delete()
      .lt('date', cutoffDateString)
      .eq('company_id', companyId)

    await supabase
      .from('meta_ads_metrics_cache')
      .delete()
      .lt('date', cutoffDateString)
      .eq('company_id', companyId)

    await supabase
      .from('shopify_metrics_cache')
      .delete()
      .lt('date', cutoffDateString)
      .eq('company_id', companyId)

    return NextResponse.json({ success: true, results })
  } catch (error: any) {
    console.error('Error updating cache:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update cache' },
      { status: 500 }
    )
  }
}

