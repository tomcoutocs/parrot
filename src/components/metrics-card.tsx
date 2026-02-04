"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"
import { fetchCompaniesOptimized } from "@/lib/simplified-database-functions"
import { fetchCompanyReportsData } from "@/lib/api-integrations"
import { LoadingSpinner } from "@/components/ui/loading-states"
import { useTheme } from "@/components/providers/theme-provider"

interface PerformanceDataPoint {
  date: string
  metaSpend: number
  googleSpend: number
  revenue: number
  metaRev: number
  googleRev: number
}

type DateRange = "1" | "7" | "30"

const dateRangeLabels: Record<DateRange, string> = {
  "1": "Last 24 hours",
  "7": "Last 7 days",
  "30": "Last 30 days",
}

type MetricType = "revenue" | "spent" | "roas" | "cpa"

interface MetricsCardProps {
  activeSpace: string
}

export function MetricsCard({ activeSpace }: MetricsCardProps) {
  const { resolvedTheme } = useTheme()
  const [activeMetric, setActiveMetric] = useState<MetricType>("revenue")
  const [dateRange, setDateRange] = useState<DateRange>("30")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
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
  
  // Get computed foreground color - use useMemo to ensure it updates with theme
  const foregroundColor = resolvedTheme === 'dark' ? 'oklch(0.8074 0.0142 93.0137)' : 'oklch(0.15 0 0)'

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
          setError("No API credentials configured")
          setLoading(false)
          return
        }

        // Fetch real data from APIs
        const reportsData = await fetchCompanyReportsData(spaceCompany, dateRange)
        
        setPerformanceData(reportsData.performanceData)
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

  const metrics = [
    { 
      id: "revenue" as MetricType, 
      label: "Total Revenue", 
      value: `$${(summaryMetrics.totalRevenue / 1000).toFixed(1)}k`, 
      change: "+0%",
      isPositive: true,
      color: "#8b5cf6"
    },
    { 
      id: "spent" as MetricType, 
      label: "Total Ad Spend", 
      value: `$${(summaryMetrics.totalSpend / 1000).toFixed(1)}k`, 
      change: "+0%",
      isPositive: false,
      color: "#ef4444"
    },
    { 
      id: "roas" as MetricType, 
      label: "Blended ROAS", 
      value: summaryMetrics.blendedROAS.toFixed(2), 
      change: "+0%",
      isPositive: true,
      color: "#3b82f6"
    },
    { 
      id: "cpa" as MetricType, 
      label: "Avg CPA", 
      value: `$${summaryMetrics.avgCPA.toFixed(2)}`, 
      change: "+0%",
      isPositive: true,
      color: "#10b981"
    },
  ]

  // Transform performanceData for chart
  const chartData = performanceData.map(d => ({
    date: d.date,
    revenue: d.revenue,
    spent: d.metaSpend + d.googleSpend,
    roas: (d.metaSpend + d.googleSpend) > 0 ? d.revenue / (d.metaSpend + d.googleSpend) : 0,
  }))

  const getChartData = () => {
    if (activeMetric === "revenue") {
      return { dataKey: "revenue", color: "#8b5cf6", formatter: (value: number) => `$${value.toLocaleString()}` }
    } else if (activeMetric === "spent") {
      return { dataKey: "spent", color: "#ef4444", formatter: (value: number) => `$${value.toLocaleString()}` }
    } else if (activeMetric === "roas") {
      return { dataKey: "roas", color: "#3b82f6", formatter: (value: number) => value.toFixed(2) }
    } else {
      // CPA - show revenue as placeholder since we don't have conversions in chart data
      return { dataKey: "revenue", color: "#10b981", formatter: (value: number) => `$${value.toLocaleString()}` }
    }
  }

  const chartConfig = getChartData()

  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center justify-between mb-3">
        <h3>Performance Metrics</h3>
        <div className="flex items-center gap-2">
          <select 
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRange)}
            className="text-sm px-3 py-1.5 border border-border rounded-md bg-background"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Metric Pills */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        {metrics.map((metric) => (
          <button
            key={metric.id}
            onClick={() => setActiveMetric(metric.id)}
            className={`p-3 border rounded-lg text-left transition-all ${
              activeMetric === metric.id 
                ? "border-foreground bg-muted/50" 
                : "border-border hover:border-muted-foreground/50"
            }`}
          >
            <div className="text-xs text-muted-foreground mb-0.5">{metric.label}</div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl">{metric.value}</span>
              <span className={`text-xs flex items-center gap-0.5 ${
                metric.isPositive ? "text-green-600" : "text-red-600"
              }`}>
                {metric.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.change}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          {error}
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
          No data available
        </div>
      ) : (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
            <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--border))" opacity={0.2} vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
              tickFormatter={chartConfig.formatter}
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
              formatter={chartConfig.formatter}
            />
            <Line 
              type="monotone" 
              dataKey={chartConfig.dataKey} 
              stroke={chartConfig.color} 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

