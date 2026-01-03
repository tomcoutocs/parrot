import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import PDFDocument from 'pdfkit'
import { getInvoice } from '@/lib/invoicing-functions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params

    if (!invoiceId) {
      return new NextResponse('Invoice ID is required', { status: 400 })
    }

    // Get invoice data
    const result = await getInvoice(invoiceId)
    if (!result.success || !result.data) {
      return new NextResponse(result.error || 'Invoice not found', { status: 404 })
    }

    const invoice = result.data

    // Create PDF with proper stream handling
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
    const chunks: Buffer[] = []

    doc.on('data', (chunk: Buffer) => chunks.push(chunk))

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'right' })
    doc.moveDown(0.5)
    doc.fontSize(12).font('Helvetica').text(`Invoice #: ${invoice.invoice_number}`, { align: 'right' })
    doc.text(`Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, { align: 'right' })
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, { align: 'right' })
    
    doc.moveDown(2)

    // Bill To section
    doc.fontSize(14).font('Helvetica-Bold').text('Bill To:', 50, doc.y)
    doc.moveDown(0.5)
    doc.fontSize(11).font('Helvetica').text(invoice.client_name)
    if (invoice.client_email) {
      doc.text(invoice.client_email)
    }
    if (invoice.client_address) {
      doc.text(invoice.client_address.split('\n').join(', '))
    }

    doc.moveDown(2)

    // Line items table
    const tableTop = doc.y
    const itemHeight = 20
    const pageWidth = doc.page.width - 100
    const colWidths = {
      description: pageWidth * 0.5,
      quantity: pageWidth * 0.15,
      price: pageWidth * 0.15,
      total: pageWidth * 0.2
    }

    // Table header
    doc.fontSize(10).font('Helvetica-Bold')
    doc.text('Description', 50, tableTop)
    doc.text('Qty', 50 + colWidths.description, tableTop)
    doc.text('Price', 50 + colWidths.description + colWidths.quantity, tableTop)
    doc.text('Total', 50 + colWidths.description + colWidths.quantity + colWidths.price, tableTop)
    
    doc.moveTo(50, tableTop + 15)
    doc.lineTo(50 + pageWidth, tableTop + 15)
    doc.stroke()

    // Table rows
    let currentY = tableTop + 25
    doc.fontSize(10).font('Helvetica')
    
    invoice.line_items.forEach((item) => {
      if (currentY > doc.page.height - 150) {
        doc.addPage()
        currentY = 50
      }

      doc.text(item.description || '', 50, currentY, { width: colWidths.description })
      doc.text(item.quantity.toString(), 50 + colWidths.description, currentY)
      doc.text(`${invoice.currency} ${item.unit_price.toFixed(2)}`, 50 + colWidths.description + colWidths.quantity, currentY)
      doc.text(`${invoice.currency} ${item.line_total.toFixed(2)}`, 50 + colWidths.description + colWidths.quantity + colWidths.price, currentY)
      
      currentY += itemHeight
    })

    // Totals section
    const totalsY = Math.max(currentY + 20, doc.page.height - 200)
    const totalsX = 50 + colWidths.description + colWidths.quantity

    doc.fontSize(10).font('Helvetica')
    doc.text('Subtotal:', totalsX, totalsY)
    doc.text(`${invoice.currency} ${invoice.subtotal.toFixed(2)}`, totalsX + colWidths.price, totalsY, { align: 'right' })

    if (invoice.discount > 0) {
      doc.text('Discount:', totalsX, totalsY + 20)
      doc.text(`-${invoice.currency} ${invoice.discount.toFixed(2)}`, totalsX + colWidths.price, totalsY + 20, { align: 'right' })
    }

    if (invoice.tax_rate > 0) {
      doc.text(`Tax (${invoice.tax_rate}%):`, totalsX, totalsY + (invoice.discount > 0 ? 40 : 20))
      doc.text(`${invoice.currency} ${invoice.tax_amount.toFixed(2)}`, totalsX + colWidths.price, totalsY + (invoice.discount > 0 ? 40 : 20), { align: 'right' })
    }

    doc.moveTo(totalsX, totalsY + (invoice.discount > 0 ? 60 : 40))
    doc.lineTo(totalsX + colWidths.price + colWidths.total, totalsY + (invoice.discount > 0 ? 60 : 40))
    doc.stroke()

    doc.fontSize(14).font('Helvetica-Bold')
    const totalLabelY = totalsY + (invoice.discount > 0 ? 80 : 60)
    doc.text('Total:', totalsX, totalLabelY)
    doc.text(`${invoice.currency} ${invoice.total_amount.toFixed(2)}`, totalsX + colWidths.price, totalLabelY, { align: 'right' })

    // Notes and Terms
    if (invoice.notes || invoice.terms) {
      doc.moveDown(3)
      const notesY = doc.y
      
      if (invoice.notes) {
        doc.fontSize(10).font('Helvetica-Bold').text('Notes:', 50, notesY)
        doc.font('Helvetica').text(invoice.notes, 50, notesY + 15, { width: pageWidth })
      }

      if (invoice.terms) {
        doc.moveDown(1)
        doc.fontSize(10).font('Helvetica-Bold').text('Terms & Conditions:', 50, doc.y)
        doc.font('Helvetica').text(invoice.terms, 50, doc.y + 15, { width: pageWidth })
      }
    }

    // Footer
    doc.fontSize(8).font('Helvetica')
    doc.text(
      `Generated on ${new Date().toLocaleDateString()}`,
      50,
      doc.page.height - 50,
      { align: 'center' }
    )

    // End the document and wait for completion
    doc.end()

    // Wait for PDF to finish generating
    const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      doc.on('error', reject)
    })

    // Upload to Supabase Storage
    if (supabase) {
      const fileName = `invoice-${invoice.invoice_number}.pdf`
      const filePath = `${invoice.space_id || 'invoices'}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (!uploadError) {
        // Update invoice with PDF URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath)

        await supabase
          .from('invoices')
          .update({ pdf_url: publicUrl })
          .eq('id', invoiceId)
      }
    }

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoice_number}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return new NextResponse(
      'Failed to generate PDF',
      { status: 500 }
    )
  }
}

