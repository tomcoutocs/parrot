"use client"

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from '@/components/providers/theme-provider'

interface AreaChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>
  dataKey?: string
  color?: string
  xAxisLabel?: string
  yAxisLabel?: string
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
        <p className="font-medium mb-2 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm flex items-center gap-2 text-foreground" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}: <span className="font-semibold">{entry.value.toLocaleString()}</span>
          </p>
        ))}
      </div>
    )
  }
  return null
}

const CustomLegend = ({ payload }: any) => {
  if (!payload || !payload.length) return null
  
  return (
    <div className="flex items-center justify-center gap-4 pt-5">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2" style={{ color: 'oklch(var(--foreground))' }}>
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span style={{ color: 'oklch(var(--foreground))' }}>{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

export function AnalyticsAreaChart({ 
  data, 
  dataKey = 'value', 
  color = '#8b5cf6',
  xAxisLabel,
  yAxisLabel
}: AreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        <p>No data available</p>
      </div>
    )
  }

  const { resolvedTheme } = useTheme()
  
  // Get computed foreground color - use useMemo to ensure it updates with theme
  const foregroundColor = resolvedTheme === 'dark' ? 'oklch(0.8074 0.0142 93.0137)' : 'oklch(0.15 0 0)'

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
        <AreaChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.8} />
              <stop offset="100%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="oklch(var(--border))" 
            opacity={0.2}
            vertical={false}
          />
          <XAxis 
            dataKey="name" 
            tick={{ fill: foregroundColor, fontSize: 12 }}
            axisLine={{ stroke: 'oklch(var(--border))' }}
            tickLine={{ stroke: 'oklch(var(--border))' }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: foregroundColor, fontSize: 12, style: { fill: foregroundColor } } : undefined}
          />
          <YAxis 
            tick={{ fill: foregroundColor, fontSize: 12 }}
            axisLine={{ stroke: 'oklch(var(--border))' }}
            tickLine={{ stroke: 'oklch(var(--border))' }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: foregroundColor, fontSize: 12, style: { fill: foregroundColor } } : undefined}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            fill="url(#areaGradient)"
            animationDuration={800}
            animationEasing="ease-out"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
