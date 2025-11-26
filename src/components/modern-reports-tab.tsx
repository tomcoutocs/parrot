"use client"

import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { TrendingUp, TrendingDown, Download, Calendar, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PerformanceDataPoint {
  date: string
  metaSpend: number
  googleSpend: number
  revenue: number
  metaRev: number
  googleRev: number
}

const performanceDataBySpace: Record<string, PerformanceDataPoint[]> = {
  "1": [
    { date: "Oct 1", metaSpend: 2100, googleSpend: 1800, revenue: 14200, metaRev: 7800, googleRev: 6400 },
    { date: "Oct 8", metaSpend: 2300, googleSpend: 1900, revenue: 15800, metaRev: 8600, googleRev: 7200 },
    { date: "Oct 15", metaSpend: 2500, googleSpend: 2000, revenue: 17200, metaRev: 9400, googleRev: 7800 },
    { date: "Oct 22", metaSpend: 2400, googleSpend: 2100, revenue: 16800, metaRev: 9100, googleRev: 7700 },
    { date: "Oct 29", metaSpend: 2600, googleSpend: 2200, revenue: 18500, metaRev: 10200, googleRev: 8300 },
    { date: "Nov 5", metaSpend: 2700, googleSpend: 2300, revenue: 19400, metaRev: 10800, googleRev: 8600 },
  ],
  "default": [
    { date: "Oct 1", metaSpend: 2100, googleSpend: 1800, revenue: 14200, metaRev: 7800, googleRev: 6400 },
    { date: "Oct 8", metaSpend: 2300, googleSpend: 1900, revenue: 15800, metaRev: 8600, googleRev: 7200 },
    { date: "Oct 15", metaSpend: 2500, googleSpend: 2000, revenue: 17200, metaRev: 9400, googleRev: 7800 },
    { date: "Oct 22", metaSpend: 2400, googleSpend: 2100, revenue: 16800, metaRev: 9100, googleRev: 7700 },
    { date: "Oct 29", metaSpend: 2600, googleSpend: 2200, revenue: 18500, metaRev: 10200, googleRev: 8300 },
    { date: "Nov 5", metaSpend: 2700, googleSpend: 2300, revenue: 19400, metaRev: 10800, googleRev: 8600 },
  ],
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

const channelDataBySpace: Record<string, ChannelDataPoint[]> = {
  "1": [
    { 
      channel: "Meta Ads",
      spend: 15600,
      revenue: 56000,
      roas: 3.59,
      conversions: 234,
      cpa: 66.67,
      change: "+18%",
      isPositive: true
    },
    { 
      channel: "Google Ads",
      spend: 13300,
      revenue: 46200,
      roas: 3.47,
      conversions: 198,
      cpa: 67.17,
      change: "+12%",
      isPositive: true
    },
  ],
  "default": [
    { 
      channel: "Meta Ads",
      spend: 15600,
      revenue: 56000,
      roas: 3.59,
      conversions: 234,
      cpa: 66.67,
      change: "+18%",
      isPositive: true
    },
    { 
      channel: "Google Ads",
      spend: 13300,
      revenue: 46200,
      roas: 3.47,
      conversions: 198,
      cpa: 67.17,
      change: "+12%",
      isPositive: true
    },
  ],
}

interface ModernReportsTabProps {
  activeSpace: string | null
}

export function ModernReportsTab({ activeSpace }: ModernReportsTabProps) {
  const performanceData = performanceDataBySpace[activeSpace || "default"] || performanceDataBySpace["default"]
  const channelData = channelDataBySpace[activeSpace || "default"] || channelDataBySpace["default"]
  
  const totalSpend = channelData.reduce((sum, c) => sum + c.spend, 0)
  const totalRevenue = channelData.reduce((sum, c) => sum + c.revenue, 0)
  const totalConversions = channelData.reduce((sum, c) => sum + c.conversions, 0)
  const blendedROAS = totalRevenue / totalSpend
  const avgCPA = totalSpend / totalConversions

  const summaryMetrics = [
    {
      label: "Total Revenue",
      value: `$${(totalRevenue / 1000).toFixed(1)}k`,
      change: "+16%",
      isPositive: true
    },
    {
      label: "Total Ad Spend",
      value: `$${(totalSpend / 1000).toFixed(1)}k`,
      change: "+15%",
      isPositive: false
    },
    {
      label: "Blended ROAS",
      value: blendedROAS.toFixed(2),
      change: "+8%",
      isPositive: true
    },
    {
      label: "Avg CPA",
      value: `$${avgCPA.toFixed(2)}`,
      change: "-5%",
      isPositive: true
    },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium">Performance Reports</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Last 30 days
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Last 30 days
            <ChevronDown className="w-3.5 h-3.5" />
          </Button>
          <Button size="sm" className="gap-2">
            <Download className="w-3.5 h-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-4 gap-4">
        {summaryMetrics.map((metric) => (
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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                formatter={(value: number) => `$${value.toLocaleString()}`}
              />
              <Line 
                type="monotone" 
                dataKey="revenue" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey={(data) => (data.metaSpend || 0) + (data.googleSpend || 0)} 
                stroke="#ef4444" 
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
                name="Total Spend"
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
                <div className="text-sm text-center">{channel.conversions}</div>
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

