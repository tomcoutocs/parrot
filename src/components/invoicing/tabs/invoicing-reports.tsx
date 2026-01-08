"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { getInvoices } from '@/lib/invoicing-functions'
import { getExpenses, getCashFlow } from '@/lib/expense-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Download,
  Filter,
  TrendingUp,
  BarChart3,
  PieChart,
  FileText,
  Loader2
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell, Legend } from 'recharts'

export function InvoicingReports() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [expenseData, setExpenseData] = useState<any[]>([])
  const [summary, setSummary] = useState({
    totalRevenue: 0,
    thisMonth: 0,
    outstanding: 0,
    growthRate: 0,
    totalExpenses: 0,
    netProfit: 0,
  })

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadReportData()
  }, [spaceId])

  const loadReportData = async () => {
    setLoading(true)
    try {
      // Load invoices
      const invoicesResult = await getInvoices(spaceId || undefined)
      const invoices = invoicesResult.success ? invoicesResult.data || [] : []

      // Load expenses
      const expensesResult = await getExpenses(spaceId || undefined)
      const expenses = expensesResult.success ? expensesResult.data || [] : []

      // Load cash flow
      const cashFlowResult = await getCashFlow(spaceId || undefined)
      const cashFlow = cashFlowResult.success ? cashFlowResult.data : null

      // Calculate revenue by month
      const revenueByMonth: Record<string, number> = {}
      invoices
        .filter(inv => inv.status === 'paid' && inv.paid_at)
        .forEach(inv => {
          const date = new Date(inv.paid_at!)
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + inv.total_amount
        })

      const revenueChartData = Object.entries(revenueByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-6) // Last 6 months
        .map(([month, amount]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          revenue: amount,
        }))

      setRevenueData(revenueChartData)

      // Expense breakdown by category
      if (cashFlow?.expensesByCategory) {
        const expenseChartData = Object.entries(cashFlow.expensesByCategory)
          .map(([category, amount]) => ({
            name: category,
            value: amount,
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5) // Top 5 categories

        setExpenseData(expenseChartData)
      }

      // Summary stats
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

      setSummary({
        totalRevenue,
        thisMonth,
        outstanding,
        growthRate,
        totalExpenses,
        netProfit,
      })
    } catch (error) {
      console.error('Error loading report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8']

  const handleExport = async (format: 'pdf' | 'csv' = 'pdf') => {
    try {
      const url = `/api/invoicing/export-report?format=${format}`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `invoicing-report-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(downloadUrl)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Error exporting report:', error)
      alert('Failed to export report. Please try again.')
    }
  }
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end gap-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Customize Report
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>

      <Tabs defaultValue="revenue" className="w-full">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="profit">Profit & Loss</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-6 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Revenue Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {revenueData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="revenue" fill="#0088FE" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                        <div className="text-center">
                          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No revenue data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Expense Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {expenseData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={250}>
                        <RechartsPieChart>
                          <Pie
                            data={expenseData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expenseData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">No expense data available</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">${(summary.totalRevenue / 1000).toFixed(0)}K</div>
                      <div className="text-sm text-muted-foreground mt-1">Total Revenue</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">${(summary.thisMonth / 1000).toFixed(0)}K</div>
                      <div className="text-sm text-muted-foreground mt-1">This Month</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl font-bold">${(summary.outstanding / 1000).toFixed(0)}K</div>
                      <div className="text-sm text-muted-foreground mt-1">Outstanding</div>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className={`text-2xl font-bold ${summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {summary.growthRate >= 0 ? '+' : ''}{summary.growthRate.toFixed(1)}%
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">Growth Rate</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Invoice performance chart will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Expense Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
                <div className="text-center">
                  <PieChart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Expense breakdown chart will be displayed here</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profit" className="space-y-6 mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Statement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between p-4 border rounded-lg">
                    <span className="font-medium">Total Revenue</span>
                    <span className="font-bold text-green-600">${summary.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-4 border rounded-lg">
                    <span className="font-medium">Total Expenses</span>
                    <span className="font-bold text-red-600">${summary.totalExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between p-4 border-2 rounded-lg bg-muted">
                    <span className="font-bold text-lg">Net Profit</span>
                    <span className={`font-bold text-lg ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${summary.netProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

