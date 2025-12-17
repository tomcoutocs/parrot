"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  AlertCircle,
  Receipt
} from 'lucide-react'

export function InvoicingDashboard() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    outstandingInvoices: 0,
    overdueAmount: 0,
    paidThisMonth: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
  })

  useEffect(() => {
    // TODO: Fetch real data from database
    setStats({
      totalRevenue: 245000,
      outstandingInvoices: 125000,
      overdueAmount: 35000,
      paidThisMonth: 85000,
      totalInvoices: 156,
      paidInvoices: 98,
      pendingInvoices: 45,
      overdueInvoices: 13,
    })
  }, [])

  const statCards = [
    {
      title: 'Total Revenue',
      value: `$${(stats.totalRevenue / 1000).toFixed(0)}K`,
      description: '+18% from last month',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'text-emerald-600',
    },
    {
      title: 'Outstanding',
      value: `$${(stats.outstandingInvoices / 1000).toFixed(0)}K`,
      description: 'Invoices pending payment',
      trend: 'neutral' as const,
      icon: Clock,
      color: 'text-amber-600',
    },
    {
      title: 'Overdue',
      value: `$${(stats.overdueAmount / 1000).toFixed(0)}K`,
      description: 'Requires attention',
      trend: 'down' as const,
      icon: AlertCircle,
      color: 'text-red-600',
    },
    {
      title: 'Paid This Month',
      value: `$${(stats.paidThisMonth / 1000).toFixed(0)}K`,
      description: '+12% from last month',
      trend: 'up' as const,
      icon: CheckCircle,
      color: 'text-blue-600',
    },
  ]

  const invoiceStats = [
    { label: 'Total Invoices', value: stats.totalInvoices, icon: FileText, color: 'text-blue-600' },
    { label: 'Paid', value: stats.paidInvoices, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending', value: stats.pendingInvoices, icon: Clock, color: 'text-amber-600' },
    { label: 'Overdue', value: stats.overdueInvoices, icon: XCircle, color: 'text-red-600' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-end">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {stat.trend === 'up' && <ArrowUpRight className="w-3 h-3 text-green-600 mr-1" />}
                  {stat.trend === 'down' && <ArrowDownRight className="w-3 h-3 text-red-600 mr-1" />}
                  {stat.description}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Invoice Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Invoice Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {invoiceStats.map((stat) => {
              const Icon = stat.icon
              const percentage = stats.totalInvoices > 0 
                ? ((stat.value / stats.totalInvoices) * 100).toFixed(1)
                : '0'
              return (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Icon className={`w-5 h-5 ${stat.color}`} />
                    <div className="text-2xl font-bold">{stat.value}</div>
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{percentage}%</div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start">
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <FileText className="w-4 h-4 mr-2" />
              View All Invoices
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <DollarSign className="w-4 h-4 mr-2" />
              Record Payment
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Receipt className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Payment received</p>
                  <p className="text-xs text-muted-foreground">Invoice #INV-2024-001 - $5,000</p>
                  <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Invoice created</p>
                  <p className="text-xs text-muted-foreground">Invoice #INV-2024-045 - Acme Corp</p>
                  <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Invoice overdue</p>
                  <p className="text-xs text-muted-foreground">Invoice #INV-2024-032 - $3,500</p>
                  <p className="text-xs text-muted-foreground mt-1">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Payment timeline chart will be displayed here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

