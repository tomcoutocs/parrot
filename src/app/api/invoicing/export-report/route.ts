import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { getInvoices } from '@/lib/invoicing-functions'
import { getExpenses, getCashFlow } from '@/lib/expense-functions'
import PDFDocument from 'pdfkit'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'pdf'
    const spaceId = currentUser.companyId || undefined

    // Load data
    const invoicesResult = await getInvoices(spaceId)
    const invoices = invoicesResult.success ? invoicesResult.data || [] : []

    const expensesResult = await getExpenses(spaceId)
    const expenses = expensesResult.success ? expensesResult.data || [] : []

    const cashFlowResult = await getCashFlow(spaceId)
    const cashFlow = cashFlowResult.success ? cashFlowResult.data : null

    // Calculate summary
    const totalRevenue = invoices
      .filter(inv => inv.status === 'paid')
      .reduce((sum, inv) => sum + inv.total_amount, 0)

    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonth = invoices
      .filter(inv => {
        if (inv.status !== 'paid' || !inv.paid_at) return false
        const paidDate = new Date(inv.paid_at)
        return paidDate >= thisMonthStart
      })
      .reduce((sum, inv) => sum + inv.total_amount, 0)

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = invoices
      .filter(inv => {
        if (inv.status !== 'paid' || !inv.paid_at) return false
        const paidDate = new Date(inv.paid_at)
        return paidDate >= lastMonthStart && paidDate < thisMonthStart
      })
      .reduce((sum, inv) => sum + inv.total_amount, 0)

    const growthRate = lastMonth > 0 ? ((thisMonth - lastMonth) / lastMonth) * 100 : 0
    const outstanding = invoices
      .filter(inv => inv.status === 'sent' || inv.status === 'viewed')
      .reduce((sum, inv) => sum + (inv.total_amount - (inv.paid_amount || 0)), 0)

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const netProfit = totalRevenue - totalExpenses

    if (format === 'csv') {
      // Generate CSV
      const csvRows = [
        ['Report Type', 'Value'],
        ['Total Revenue', `$${totalRevenue.toFixed(2)}`],
        ['This Month Revenue', `$${thisMonth.toFixed(2)}`],
        ['Outstanding', `$${outstanding.toFixed(2)}`],
        ['Growth Rate', `${growthRate.toFixed(2)}%`],
        ['Total Expenses', `$${totalExpenses.toFixed(2)}`],
        ['Net Profit', `$${netProfit.toFixed(2)}`],
        [],
        ['Invoice Number', 'Client', 'Amount', 'Status', 'Issue Date', 'Due Date'],
        ...invoices.map(inv => [
          inv.invoice_number,
          inv.client_name,
          `$${inv.total_amount.toFixed(2)}`,
          inv.status,
          new Date(inv.issue_date).toLocaleDateString(),
          new Date(inv.due_date).toLocaleDateString()
        ]),
        [],
        ['Expense', 'Category', 'Amount', 'Date'],
        ...expenses.map(exp => [
          exp.description || 'N/A',
          exp.category || 'Uncategorized',
          `$${exp.amount.toFixed(2)}`,
          new Date(exp.expense_date).toLocaleDateString()
        ])
      ]

      const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
      const csvBuffer = Buffer.from(csvContent, 'utf-8')

      return new NextResponse(csvBuffer, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="invoicing-report-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // Generate PDF
      const doc = new PDFDocument({ margin: 50, size: 'LETTER' })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('Invoicing Report', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica').text(`Generated: ${new Date().toLocaleDateString()}`, { align: 'center' })
      doc.moveDown(2)

      // Summary Section
      doc.fontSize(16).font('Helvetica-Bold').text('Summary', 50, doc.y)
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')
      doc.text(`Total Revenue: $${totalRevenue.toLocaleString()}`, 50, doc.y)
      doc.text(`This Month: $${thisMonth.toLocaleString()}`, 50, doc.y)
      doc.text(`Outstanding: $${outstanding.toLocaleString()}`, 50, doc.y)
      doc.text(`Growth Rate: ${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(2)}%`, 50, doc.y)
      doc.text(`Total Expenses: $${totalExpenses.toLocaleString()}`, 50, doc.y)
      doc.text(`Net Profit: $${netProfit.toLocaleString()}`, 50, doc.y)
      doc.moveDown(2)

      // Invoices Section
      if (invoices.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Recent Invoices', 50, doc.y)
        doc.moveDown(0.5)
        doc.fontSize(10).font('Helvetica')
        
        invoices.slice(0, 20).forEach((inv, index) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage()
          }
          doc.text(`${inv.invoice_number} - ${inv.client_name} - $${inv.total_amount.toFixed(2)} (${inv.status})`, 50, doc.y)
          doc.moveDown(0.3)
        })
        doc.moveDown(1)
      }

      // Expenses Section
      if (expenses.length > 0) {
        doc.fontSize(16).font('Helvetica-Bold').text('Recent Expenses', 50, doc.y)
        doc.moveDown(0.5)
        doc.fontSize(10).font('Helvetica')
        
        expenses.slice(0, 20).forEach((exp) => {
          if (doc.y > doc.page.height - 100) {
            doc.addPage()
          }
          const expenseDate = exp.expense_date ? new Date(exp.expense_date).toLocaleDateString() : 'N/A'
          doc.text(`${exp.description || 'N/A'} - ${exp.category || 'Uncategorized'} - $${exp.amount.toFixed(2)} (${expenseDate})`, 50, doc.y)
          doc.moveDown(0.3)
        })
      }

      doc.end()

      return new Promise<NextResponse>((resolve) => {
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks)
          resolve(
            new NextResponse(pdfBuffer, {
              headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `attachment; filename="invoicing-report-${new Date().toISOString().split('T')[0]}.pdf"`
              }
            })
          )
        })
      })
    }
  } catch (error) {
    console.error('Error exporting report:', error)
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    )
  }
}

