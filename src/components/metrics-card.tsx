"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { TrendingUp, TrendingDown } from "lucide-react"

interface MetricsDataPoint {
  date: string
  spent: number
  revenue: number
  mer: number
  roas: number
}

const mockDataBySpace: Record<string, MetricsDataPoint[]> = {
  "1": [
    { date: "Nov 1", spent: 4200, revenue: 12600, mer: 3.0, roas: 3.0 },
    { date: "Nov 2", spent: 3800, revenue: 13300, mer: 3.5, roas: 3.5 },
    { date: "Nov 3", spent: 4500, revenue: 15750, mer: 3.5, roas: 3.5 },
    { date: "Nov 4", spent: 4100, revenue: 14350, mer: 3.5, roas: 3.5 },
    { date: "Nov 5", spent: 5200, revenue: 18200, mer: 3.5, roas: 3.5 },
    { date: "Nov 6", spent: 4800, revenue: 16800, mer: 3.5, roas: 3.5 },
    { date: "Nov 7", spent: 5100, revenue: 20400, mer: 4.0, roas: 4.0 },
  ],
  "default": [
    { date: "Nov 1", spent: 4200, revenue: 12600, mer: 3.0, roas: 3.0 },
    { date: "Nov 2", spent: 3800, revenue: 13300, mer: 3.5, roas: 3.5 },
    { date: "Nov 3", spent: 4500, revenue: 15750, mer: 3.5, roas: 3.5 },
    { date: "Nov 4", spent: 4100, revenue: 14350, mer: 3.5, roas: 3.5 },
    { date: "Nov 5", spent: 5200, revenue: 18200, mer: 3.5, roas: 3.5 },
    { date: "Nov 6", spent: 4800, revenue: 16800, mer: 3.5, roas: 3.5 },
    { date: "Nov 7", spent: 5100, revenue: 20400, mer: 4.0, roas: 4.0 },
  ],
}

type MetricType = "revenue" | "spent" | "mer" | "roas"

interface MetricsCardProps {
  activeSpace: string
}

export function MetricsCard({ activeSpace }: MetricsCardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>("revenue")
  const [timeRange, setTimeRange] = useState("7d")

  const mockData = mockDataBySpace[activeSpace] || mockDataBySpace["default"]
  const totalSpent = mockData.reduce((sum, d) => sum + d.spent, 0)
  const totalRevenue = mockData.reduce((sum, d) => sum + d.revenue, 0)
  const avgMER = totalRevenue / totalSpent
  const avgROAS = avgMER

  const metrics = [
    { 
      id: "spent" as MetricType, 
      label: "Ad Spend", 
      value: `$${(totalSpent / 1000).toFixed(1)}k`, 
      change: "+12%",
      isPositive: false,
      color: "#ef4444"
    },
    { 
      id: "revenue" as MetricType, 
      label: "Revenue", 
      value: `$${(totalRevenue / 1000).toFixed(1)}k`, 
      change: "+24%",
      isPositive: true,
      color: "#8b5cf6"
    },
    { 
      id: "mer" as MetricType, 
      label: "MER", 
      value: avgMER.toFixed(2), 
      change: "+8%",
      isPositive: true,
      color: "#10b981"
    },
    { 
      id: "roas" as MetricType, 
      label: "Blended ROAS", 
      value: avgROAS.toFixed(2), 
      change: "+8%",
      isPositive: true,
      color: "#3b82f6"
    },
  ]

  const getChartData = () => {
    if (activeMetric === "revenue") {
      return { dataKey: "revenue", color: "#8b5cf6", formatter: (value: number) => `$${value.toLocaleString()}` }
    } else if (activeMetric === "spent") {
      return { dataKey: "spent", color: "#ef4444", formatter: (value: number) => `$${value.toLocaleString()}` }
    } else if (activeMetric === "mer") {
      return { dataKey: "mer", color: "#10b981", formatter: (value: number) => value.toFixed(2) }
    } else {
      return { dataKey: "roas", color: "#3b82f6", formatter: (value: number) => value.toFixed(2) }
    }
  }

  const chartConfig = getChartData()

  return (
    <Card className="p-4 border-border/60">
      <div className="flex items-center justify-between mb-3">
        <h3>Performance Metrics</h3>
        <div className="flex items-center gap-2">
          <select 
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="text-sm px-3 py-1.5 border border-border rounded-md bg-background"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
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
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData}>
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
              tickFormatter={chartConfig.formatter}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '12px'
              }}
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
    </Card>
  )
}

