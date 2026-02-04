"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Download, Calendar, ChevronDown, Loader2, AlertCircle } from "lucide-react"
import { useTheme } from "@/components/providers/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { fetchCompanyReportsData } from "@/lib/api-integrations"
import { Company } from "@/lib/supabase"
import { LoadingSpinner } from "@/components/ui/loading-states"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PerformanceDataPoint {
  date: string
  metaSpend: number
  googleSpend: number
  revenue: number
  metaRev: number
  googleRev: number
}

interface ChannelDataPoint {
  channel: string
  spend: number
  revenue: number
  roas: number
  conversions: number
  cpa: number
  change: string
  isPositive: boolean
}

interface ModernReportsTabProps {
  activeSpace: string | null
}

type DateRange = "1" | "7" | "30"

const dateRangeLabels: Record<DateRange, string> = {
  "1": "Last 24 hours",
  "7": "Last 7 days",
  "30": "Last 30 days",
}

export function ModernReportsTab({ activeSpace }: ModernReportsTabProps) {
  const { resolvedTheme } = useTheme()
  const [dateRange, setDateRange] = useState<DateRange>("30")
  
  // Get computed foreground color - use useMemo to ensure it updates with theme
  const foregroundColor = resolvedTheme === 'dark' ? 'oklch(0.8074 0.0142 93.0137)' : 'oklch(0.15 0 0)'
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [channelData, setChannelData] = useState<ChannelDataPoint[]>([])
  const [summaryMetrics, setSummaryMetrics] = useState<{
    totalRevenue: number
    totalSpend: number
    blendedROAS: number
    avgCPA: number
  }>({
    totalRevenue: 0,
    totalSpend: 0,
    blendedROAS: 0,
    avgCPA: 0,
  })
  const [company, setCompany] = useState<Company | null>(null)

  // Load company data and fetch reports
  useEffect(() => {
    const loadReportsData = async () => {
      if (!activeSpace) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Fetch company data with decrypted credentials
        const companies = await fetchCompaniesOptimized()
        const spaceCompany = companies.find(c => c.id === activeSpace)

        if (!spaceCompany) {
          setError("Company not found")
          setLoading(false)
          return
        }

        setCompany(spaceCompany)

        // Check if any API credentials are configured
        const hasGoogleAds = !!(
          spaceCompany.google_ads_developer_token &&
          spaceCompany.google_ads_client_id &&
          spaceCompany.google_ads_refresh_token &&
          spaceCompany.google_ads_customer_id
        )
        const hasMetaAds = !!(
          spaceCompany.meta_ads_app_id &&
          spaceCompany.meta_ads_access_token &&
          spaceCompany.meta_ads_ad_account_id
        )
        const hasShopify = !!(
          spaceCompany.shopify_store_domain &&
          spaceCompany.shopify_access_token
        )

        if (!hasGoogleAds && !hasMetaAds && !hasShopify) {
          setError("No API credentials configured. Please configure at least one API in Settings.")
          setLoading(false)
          return
        }

        // Fetch real data from APIs
        const reportsData = await fetchCompanyReportsData(spaceCompany, dateRange)
        
        console.log('Reports data received:', {
          performanceDataPoints: reportsData.performanceData.length,
          channelDataCount: reportsData.channelData.length,
          samplePerformanceData: reportsData.performanceData.slice(0, 5)
        })
        
        setPerformanceData(reportsData.performanceData)
        setChannelData(reportsData.channelData)
        setSummaryMetrics(reportsData.summaryMetrics)
      } catch (err) {
        console.error("Error loading reports data:", err)
        setError(err instanceof Error ? err.message : "Failed to load reports data")
      } finally {
        setLoading(false)
      }
    }

    loadReportsData()
  }, [activeSpace, dateRange])

  const summaryMetricsDisplay = [
    {
      label: "Total Revenue",
      value: `$${(summaryMetrics.totalRevenue / 1000).toFixed(1)}k`,
      change: "+0%", // Would need historical data to calculate
      isPositive: true
    },
    {
      label: "Total Ad Spend",
      value: `$${(summaryMetrics.totalSpend / 1000).toFixed(1)}k`,
      change: "+0%", // Would need historical data to calculate
      isPositive: false
    },
    {
      label: "Blended ROAS",
      value: summaryMetrics.blendedROAS.toFixed(2),
      change: "+0%", // Would need historical data to calculate
      isPositive: true
    },
    {
      label: "Avg CPA",
      value: `$${summaryMetrics.avgCPA.toFixed(2)}`,
      change: "+0%", // Would need historical data to calculate
      isPositive: true
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (channelData.length === 0 && performanceData.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium">Performance Reports</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {dateRangeLabels[dateRange]}
            </p>
          </div>
        </div>
        <Card className="p-8 border-border/60">
          <div className="text-center text-muted-foreground">
            <p className="text-sm">No data available for the selected date range.</p>
            <p className="text-xs mt-2">Make sure your API credentials are configured correctly in Settings.</p>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-6 h-6 text-foreground" />
          <h1 className="text-2xl font-semibold text-foreground">Performance Reports</h1>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-3.5 h-3.5" />
                {dateRangeLabels[dateRange]}
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setDateRange("1")}>
                Last 24 hours
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("7")}>
                Last 7 days
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDateRange("30")}>
                Last 30 days
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {summaryMetricsDisplay.map((metric) => (
          <Card key={metric.label} className="p-4 border-border/60">
            <div className="text-xs text-muted-foreground mb-1">{metric.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl">{metric.value}</span>
              <span className={`text-xs flex items-center gap-0.5 ${
                metric.isPositive ? "text-green-600" : "text-red-600"
              }`}>
                {metric.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.change}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Revenue & Spend Trend */}
      <Card className="p-4 border-border/60">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium">Revenue vs Spend</h3>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#8b5cf6]" />
              <span className="text-muted-foreground">Revenue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-[#ef4444]" />
              <span className="text-muted-foreground">Spend</span>
            </div>
          </div>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <LineChart 
              data={performanceData}
              margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" opacity={0.2} vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
                interval="preserveStartEnd"
                minTickGap={30}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                domain={[0, 'auto']}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'oklch(var(--background))', 
                  border: '1px solid oklch(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'oklch(var(--foreground))' }}
                itemStyle={{ color: 'oklch(var(--foreground))' }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls={false}
              />
              <Line 
                type="monotone" 
                dataKey={(data) => (data.metaSpend || 0) + (data.googleSpend || 0)} 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Total Spend"
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Channel Performance */}
      <div className="grid grid-cols-2 gap-4">
        {/* Channel Breakdown Table */}
        <Card className="p-4 border-border/60">
          <h3 className="mb-3 text-sm font-medium">Channel Performance</h3>
          
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-3 px-3 py-2 text-xs text-muted-foreground border-b border-border/40 mb-0.5">
            <div className="col-span-2">Channel</div>
            <div>Spend</div>
            <div>Revenue</div>
            <div>ROAS</div>
            <div>Change</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-0">
            {channelData.map((channel) => (
              <div 
                key={channel.channel}
                className="grid grid-cols-6 gap-3 px-3 py-2.5 hover:bg-muted/30 transition-colors items-center rounded-md"
              >
                <div className="col-span-2 text-sm">{channel.channel}</div>
                <div className="text-sm">${(channel.spend / 1000).toFixed(1)}k</div>
                <div className="text-sm">${(channel.revenue / 1000).toFixed(1)}k</div>
                <div className="text-sm">{channel.roas.toFixed(2)}</div>
                <div className={`text-xs flex items-center gap-0.5 ${
                  channel.isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {channel.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {channel.change}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Conversion Metrics */}
        <Card className="p-4 border-border/60">
          <h3 className="mb-3 text-sm font-medium">Conversion Metrics</h3>
          
          {/* Table Header */}
          <div className="grid grid-cols-6 gap-4 px-3 py-2 text-xs text-muted-foreground border-b border-border/40 mb-0.5">
            <div className="col-span-2">Channel</div>
            <div className="text-center">Conversions</div>
            <div className="text-center">Conv. Rate</div>
            <div className="text-center">CPA</div>
            <div className="text-center">Trend</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-0">
            {channelData.map((channel) => (
              <div 
                key={channel.channel}
                className="grid grid-cols-6 gap-4 px-3 py-2.5 hover:bg-muted/30 transition-colors items-center rounded-md"
              >
                <div className="col-span-2 text-sm">{channel.channel}</div>
                <div className="text-sm text-center">{channel.conversions.toFixed(2)}</div>
                <div className="text-sm text-center">3.2%</div>
                <div className="text-sm text-center">${channel.cpa.toFixed(2)}</div>
                <div className={`text-xs flex items-center justify-center gap-0.5 ${
                  channel.isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {channel.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {channel.change}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

