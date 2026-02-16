import { NextRequest, NextResponse } from 'next/server'

/**
 * Lead enrichment API - uses Hunter.io Email Enrichment
 * Set HUNTER_API_KEY in .env to enable. Get a free key at https://hunter.io
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, leadId } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.HUNTER_API_KEY
    if (!apiKey || apiKey === 'test-api-key') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Enrichment is not configured. Add HUNTER_API_KEY to your environment variables. Get a free key at hunter.io',
        },
        { status: 503 }
      )
    }

    const params = new URLSearchParams({
      email: email.trim(),
      api_key: apiKey,
    })

    const response = await fetch(
      `https://api.hunter.io/v2/email-enrichment?${params.toString()}`
    )

    if (!response.ok) {
      if (response.status === 404) {
        return NextResponse.json(
          { success: false, error: 'No enrichment data found for this email' },
          { status: 404 }
        )
      }
      if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Enrichment rate limit reached. Try again later.' },
          { status: 429 }
        )
      }
      const errData = await response.json().catch(() => ({}))
      return NextResponse.json(
        {
          success: false,
          error: (errData as any)?.errors?.[0]?.details || response.statusText || 'Enrichment failed',
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const enriched = (data as any).data

    if (!enriched) {
      return NextResponse.json(
        { success: false, error: 'No enrichment data returned' },
        { status: 404 }
      )
    }

    // Map Hunter response to our schema (enriched_data, social_profiles)
    const enrichedData: Record<string, unknown> = {
      first_name: enriched.first_name,
      last_name: enriched.last_name,
      position: enriched.position,
      company: enriched.company,
      organization: enriched.organization,
      linkedin_url: enriched.linkedin_url,
      twitter: enriched.twitter,
      phone_number: enriched.phone_number,
      verified: enriched.verification?.status === 'valid',
      sources: enriched.sources,
      enriched_at: new Date().toISOString(),
    }

    const socialProfiles: Record<string, unknown> = {}
    if (enriched.linkedin_url) socialProfiles.linkedin = enriched.linkedin_url
    if (enriched.twitter) socialProfiles.twitter = enriched.twitter

    return NextResponse.json({
      success: true,
      enriched_data: enrichedData,
      social_profiles: socialProfiles,
      leadId,
    })
  } catch (error: any) {
    console.error('Enrichment error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Enrichment failed' },
      { status: 500 }
    )
  }
}
