"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const sourceData = [
  { source: 'Website', leads: 450, conversions: 120 },
  { source: 'LinkedIn', leads: 320, conversions: 95 },
  { source: 'Email', leads: 280, conversions: 85 },
  { source: 'Referral', leads: 150, conversions: 60 },
  { source: 'Social Media', leads: 120, conversions: 35 },
]

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444']

export function LeadSourceChart({ dateRange }: { dateRange: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Lead Sources</CardTitle>
        <CardDescription>Performance by source</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={sourceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="source" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="leads" fill="#3b82f6" name="Leads" />
            <Bar dataKey="conversions" fill="#10b981" name="Conversions" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

