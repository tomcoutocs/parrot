"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  FileText, 
  MessageSquare,
  DollarSign,
  Activity
} from 'lucide-react'

// Mock data - in a real app, this would come from your database
const monthlyData = [
  { month: 'Jan', value: 4000, target: 4500 },
  { month: 'Feb', value: 3000, target: 4500 },
  { month: 'Mar', value: 5000, target: 4500 },
  { month: 'Apr', value: 4500, target: 4500 },
  { month: 'May', value: 6000, target: 4500 },
  { month: 'Jun', value: 5500, target: 4500 },
]

const serviceUsageData = [
  { name: 'Consultations', value: 400, color: '#8884d8' },
  { name: 'Documents', value: 300, color: '#82ca9d' },
  { name: 'Appointments', value: 200, color: '#ffc658' },
  { name: 'Support', value: 100, color: '#ff7c7c' },
]

const recentActivity = [
  { id: 1, type: 'appointment', message: 'New appointment scheduled for tomorrow', time: '2 hours ago', status: 'success' },
  { id: 2, type: 'document', message: 'Contract signed and uploaded', time: '4 hours ago', status: 'success' },
  { id: 3, type: 'message', message: 'New message from support team', time: '1 day ago', status: 'info' },
  { id: 4, type: 'form', message: 'Client information form completed', time: '2 days ago', status: 'success' },
]

interface KPICardProps {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  description: string
}

function KPICard({ title, value, change, icon, description }: KPICardProps) {
  const isPositive = change >= 0
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          {isPositive ? (
            <TrendingUp className="h-3 w-3 text-green-500" />
          ) : (
            <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <span className={isPositive ? 'text-green-500' : 'text-red-500'}>
            {isPositive ? '+' : ''}{change}%
          </span>
          <span>{description}</span>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AnalyticsTab() {
  const [dateRange, setDateRange] = useState('30d')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Analytics Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            Track your business performance and key metrics
          </p>
        </div>
        <div className="flex space-x-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <Badge
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setDateRange(range)}
            >
              {range}
            </Badge>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value="$45,231"
          change={12.5}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          description="from last month"
        />
        <KPICard
          title="Active Clients"
          value="2,350"
          change={-2.1}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
          description="from last month"
        />
        <KPICard
          title="Appointments"
          value="156"
          change={8.3}
          icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
          description="this month"
        />
        <KPICard
          title="Documents"
          value="89"
          change={15.2}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
          description="processed"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8" name="Actual" />
                <Bar dataKey="target" fill="#82ca9d" name="Target" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Usage Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Service Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={serviceUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {serviceUsageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Recent Activity</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg border">
                <div className={`w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' : 
                  activity.status === 'info' ? 'bg-blue-500' : 'bg-gray-500'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.message}</p>
                  <p className="text-xs text-muted-foreground">{activity.time}</p>
                </div>
                <Badge variant={activity.status === 'success' ? 'default' : 'secondary'}>
                  {activity.type}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 