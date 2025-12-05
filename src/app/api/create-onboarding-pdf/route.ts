import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createDocumentRecord } from '@/lib/database-functions'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { companyId, userId } = await request.json()

    if (!companyId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Company ID and User ID are required' },
        { status: 400 }
      )
    }

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      )
    }

    // Check if onboarding document already exists
    const { data: existingDocs } = await supabase
      .from('documents')
      .select('id')
      .eq('company_id', companyId)
      .eq('name', 'Onboarding_Doc.pdf')
      .limit(1)

    if (existingDocs && existingDocs.length > 0) {
      // Document already exists, skip creation
      return NextResponse.json({ success: true })
    }

    // Read the PDF file from the assets directory
    // Place your PDF file at: public/assets/Onboarding_Doc.pdf
    const pdfPath = path.join(process.cwd(), 'public', 'assets', 'Onboarding_Doc.pdf')
    
    // Check if file exists
    if (!fs.existsSync(pdfPath)) {
      return NextResponse.json(
        { success: false, error: 'Onboarding PDF file not found. Please place Onboarding_Doc.pdf in the public/assets/ directory.' },
        { status: 404 }
      )
    }

    // Read the PDF file
    const pdfBuffer = fs.readFileSync(pdfPath)
    
    // Upload to Supabase Storage
    const fileName = `onboarding-${Date.now()}.pdf`
    const filePath = `${companyId}/${fileName}`
    
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Error uploading onboarding PDF:', uploadError)
      return NextResponse.json(
        { success: false, error: uploadError.message || 'Failed to upload PDF file' },
        { status: 500 }
      )
    }

    // Create document record
    const result = await createDocumentRecord(
      'Onboarding_Doc.pdf',
      filePath,
      pdfBuffer.length,
      'application/pdf',
      companyId,
      '/', // Root folder (external documents)
      userId,
      false // isInternal = false (external document)
    )

    if (!result.success) {
      // Try to clean up the uploaded file if document record creation fails
      await supabase.storage
        .from('documents')
        .remove([filePath])
      
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create document record' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating default onboarding document:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

