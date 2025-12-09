import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// This route should be called daily at 4am EST
// You can use Vercel Cron Jobs, GitHub Actions, or any external cron service
// To test manually, call: POST /api/cron/update-metrics-cache?secret=YOUR_SECRET
export async function GET(request: NextRequest) {
  try {
    // Verify secret to prevent unauthorized access
    const secret = request.nextUrl.searchParams.get('secret')
    const expectedSecret = process.env.CRON_SECRET || 'your-secret-key-change-this'

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get all companies/spaces
    // Try spaces table first (after migration), fallback to companies for backward compatibility
    let { data: companies, error: companiesError } = await supabase
      .from('spaces')
      .select('id')

    // If spaces table doesn't exist (migration not run), try companies table
    if (companiesError && (companiesError.message?.includes('does not exist') || companiesError.message?.includes('relation') || (companiesError as any).code === '42P01')) {
      const fallback = await supabase
        .from('companies')
        .select('id')
      
      if (!fallback.error) {
        companies = fallback.data
        companiesError = null
      } else {
        companiesError = fallback.error
      }
    }

    if (companiesError || !companies) {
      return NextResponse.json(
        { error: 'Failed to fetch companies', details: companiesError },
        { status: 500 }
      )
    }

    const results = {
      totalCompanies: companies.length,
      updated: [] as string[],
      failed: [] as Array<{ companyId: string; error: string }>,
    }

    // Update cache for each company
    for (const company of companies) {
      try {
        const updateResponse = await fetch(
          `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/cache/update`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              companyId: company.id,
              forceToday: false, // Update yesterday's data (default)
            }),
          }
        )

        if (updateResponse.ok) {
          results.updated.push(company.id)
        } else {
          const errorText = await updateResponse.text()
          results.failed.push({ companyId: company.id, error: errorText })
        }
      } catch (error: any) {
        results.failed.push({ companyId: company.id, error: error.message })
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    })
  } catch (error: any) {
    console.error('Error in cron job:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to run cron job' },
      { status: 500 }
    )
  }
}

// Also support POST for external cron services
export async function POST(request: NextRequest) {
  return GET(request)
}

