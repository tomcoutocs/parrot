"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts'

interface LineChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>
  dataKey?: string
  color?: string
  showArea?: boolean
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

export function AnalyticsLineChart({ 
  data, 
  dataKey = 'value', 
  color = '#3b82f6', 
  showArea = false,
  xAxisLabel,
  yAxisLabel
}: LineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center text-muted-foreground">
        <p>No data available</p>
      </div>
    )
  }

  const ChartComponent = showArea ? AreaChart : LineChart
  const DataComponent = showArea ? Area : Line

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent 
          data={data} 
          margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
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
            tick={{ fill: 'oklch(var(--foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'oklch(var(--border))' }}
            tickLine={{ stroke: 'oklch(var(--border))' }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: 'oklch(var(--foreground))', fontSize: 12 } : undefined}
          />
          <YAxis 
            tick={{ fill: 'oklch(var(--foreground))', fontSize: 12 }}
            axisLine={{ stroke: 'oklch(var(--border))' }}
            tickLine={{ stroke: 'oklch(var(--border))' }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'oklch(var(--foreground))', fontSize: 12 } : undefined}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            wrapperStyle={{ paddingTop: '20px', color: 'oklch(var(--foreground))' }}
            iconType="line"
            formatter={(value) => <span style={{ color: 'oklch(var(--foreground))' }}>{value}</span>}
          />
          {showArea ? (
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              fill="url(#lineGradient)"
              animationDuration={800}
              animationEasing="ease-out"
            />
          ) : (
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, r: 4, strokeWidth: 2, stroke: 'oklch(var(--background))' }}
              activeDot={{ r: 6, strokeWidth: 2 }}
              animationDuration={800}
              animationEasing="ease-out"
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  )
}
