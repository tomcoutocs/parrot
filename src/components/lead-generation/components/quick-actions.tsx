"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Zap, BarChart3, Settings } from 'lucide-react'

const quickActions = [
  {
    title: 'Create Form',
    description: 'Build a new lead capture form',
    icon: FileText,
    action: () => console.log('Create form'),
  },
  {
    title: 'Start Workflow',
    description: 'Set up an automation workflow',
    icon: Zap,
    action: () => console.log('Start workflow'),
  },
  {
    title: 'View Analytics',
    description: 'Check performance metrics',
    icon: BarChart3,
    action: () => console.log('View analytics'),
  },
  {
    title: 'Configure Settings',
    description: 'Customize your setup',
    icon: Settings,
    action: () => console.log('Configure settings'),
  },
]

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Button
                key={action.title}
                variant="outline"
                className="h-auto flex-col items-start p-4"
                onClick={action.action}
              >
                <Icon className="w-5 h-5 mb-2" />
                <span className="font-semibold">{action.title}</span>
                <span className="text-xs text-muted-foreground mt-1">{action.description}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

