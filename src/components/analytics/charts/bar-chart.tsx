"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { useTheme } from '@/components/providers/theme-provider'

interface BarChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>
  dataKey?: string
  color?: string
  colors?: string[]
  xAxisLabel?: string
  yAxisLabel?: string
  onLabelChange?: (index: number, newLabel: string) => void
}

const DEFAULT_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
]

const MODERN_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
]

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 z-50">
        <p className="font-medium mb-1 text-foreground">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm text-foreground">
            <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: entry.color }} />
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

export function AnalyticsBarChart({ 
  data, 
  dataKey = 'value', 
  color, 
  colors,
  xAxisLabel,
  yAxisLabel,
  onLabelChange
}: BarChartProps) {

  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        <p>No data available</p>
      </div>
    )
  }

  const chartColors = colors || (color ? [color] : MODERN_COLORS)
  const useGradient = !colors && !color
  const { resolvedTheme } = useTheme()
  
  // Get computed foreground color - use useMemo to ensure it updates with theme
  const foregroundColor = resolvedTheme === 'dark' ? 'oklch(0.8074 0.0142 93.0137)' : 'oklch(0.15 0 0)'

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%" key={resolvedTheme}>
        <BarChart 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          barCategoryGap="20%"
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.4} />
            </linearGradient>
            {chartColors.map((col, idx) => (
              <linearGradient key={idx} id={`barGradient${idx}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={col} stopOpacity={0.9} />
                <stop offset="100%" stopColor={col} stopOpacity={0.5} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="oklch(var(--border))" 
            opacity={0.2}
            vertical={false}
          />
          <XAxis 
            dataKey="name" 
            tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
            axisLine={{ stroke: 'oklch(var(--border))' }}
            tickLine={{ stroke: 'oklch(var(--border))' }}
            label={xAxisLabel ? { 
              value: xAxisLabel, 
              position: 'insideBottom', 
              offset: -5, 
              fill: foregroundColor, 
              fontSize: 12,
              style: { fill: foregroundColor, color: foregroundColor }
            } : undefined}
            tickFormatter={(value, index) => {
              if (onLabelChange) {
                return value
              }
              return value
            }}
            style={{ fill: foregroundColor }}
          />
          <YAxis 
            tick={{ fill: foregroundColor, fontSize: 12, fontWeight: 400 }}
            axisLine={{ stroke: 'oklch(var(--border))' }}
            tickLine={{ stroke: 'oklch(var(--border))' }}
            label={yAxisLabel ? { 
              value: yAxisLabel, 
              angle: -90, 
              position: 'insideLeft', 
              fill: foregroundColor, 
              fontSize: 12,
              style: { fill: foregroundColor, color: foregroundColor }
            } : undefined}
            tickFormatter={(value) => value.toLocaleString()}
            style={{ fill: foregroundColor }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
          <Bar 
            dataKey={dataKey} 
            radius={[8, 8, 0, 0]}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {useGradient ? (
              <Cell fill="url(#barGradient)" />
            ) : (
              data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={chartColors[index % chartColors.length]}
                />
              ))
            )}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
