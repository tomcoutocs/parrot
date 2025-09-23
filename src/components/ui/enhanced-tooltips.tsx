'use client'

import React from 'react'
import { HelpCircle, Info, AlertCircle, CheckCircle, XCircle, Lightbulb } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Enhanced tooltip component with different variants
interface EnhancedTooltipProps {
  children: React.ReactNode
  content: string | React.ReactNode
  variant?: 'default' | 'info' | 'warning' | 'success' | 'error' | 'help'
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
}

export function EnhancedTooltip({
  children,
  content,
  variant = 'default',
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className = ''
}: EnhancedTooltipProps) {
  const getVariantIcon = () => {
    switch (variant) {
      case 'info':
        return <Info className="h-3 w-3" />
      case 'warning':
        return <AlertCircle className="h-3 w-3" />
      case 'success':
        return <CheckCircle className="h-3 w-3" />
      case 'error':
        return <XCircle className="h-3 w-3" />
      case 'help':
        return <HelpCircle className="h-3 w-3" />
      default:
        return null
    }
  }

  const getVariantClasses = () => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
      case 'help':
        return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200'
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
    }
  }

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side={side} 
          align={align}
          className={`max-w-xs p-3 ${getVariantClasses()} ${className}`}
        >
          <div className="flex items-start gap-2">
            {getVariantIcon() && (
              <div className="flex-shrink-0 mt-0.5">
                {getVariantIcon()}
              </div>
            )}
            <div className="flex-1 text-sm">
              {typeof content === 'string' ? (
                <p className="leading-relaxed">{content}</p>
              ) : (
                content
              )}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Help text component for forms and inputs
interface HelpTextProps {
  children: React.ReactNode
  variant?: 'default' | 'info' | 'warning' | 'success' | 'error'
  className?: string
}

export function HelpText({ 
  children, 
  variant = 'default', 
  className = '' 
}: HelpTextProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'info':
        return 'text-blue-600 dark:text-blue-400'
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400'
      case 'success':
        return 'text-green-600 dark:text-green-400'
      case 'error':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-500 dark:text-gray-400'
    }
  }

  return (
    <p className={`text-xs mt-1 ${getVariantClasses()} ${className}`}>
      {children}
    </p>
  )
}

// Help icon button component
interface HelpIconProps {
  content: string | React.ReactNode
  variant?: 'default' | 'info' | 'warning' | 'success' | 'error' | 'help'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function HelpIcon({ 
  content, 
  variant = 'help', 
  size = 'sm',
  className = '' 
}: HelpIconProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  return (
    <EnhancedTooltip content={content} variant={variant}>
      <Button
        variant="ghost"
        size="sm"
        className={`h-auto w-auto p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ${className}`}
      >
        <HelpCircle className={sizeClasses[size]} />
      </Button>
    </EnhancedTooltip>
  )
}

// Feature highlight component
interface FeatureHighlightProps {
  title: string
  description: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'info' | 'warning' | 'success' | 'error'
  className?: string
}

export function FeatureHighlight({
  title,
  description,
  icon: Icon,
  variant = 'info',
  className = ''
}: FeatureHighlightProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'info':
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
      case 'success':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
    }
  }

  return (
    <Card className={`${getVariantClasses()} ${className}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="flex-shrink-0 mt-1">
              <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          )}
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Quick tip component
interface QuickTipProps {
  children: React.ReactNode
  tip: string
  className?: string
}

export function QuickTip({ children, tip, className = '' }: QuickTipProps) {
  return (
    <EnhancedTooltip content={tip} variant="help">
      <div className={`inline-block ${className}`}>
        {children}
      </div>
    </EnhancedTooltip>
  )
}

// Help section component for complex features
interface HelpSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export function HelpSection({ title, children, className = '' }: HelpSectionProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-yellow-500" />
        <h3 className="font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      </div>
      <div className="space-y-2 pl-6">
        {children}
      </div>
    </div>
  )
}

// Predefined tooltip content for common UI elements
export const tooltipContent = {
  // Navigation
  dashboard: "View your main dashboard with overview of all activities",
  projects: "Manage your projects and track progress",
  tasks: "View and manage all tasks across projects",
  forms: "Create and manage forms for data collection",
  calendar: "Schedule and manage meetings and events",
  documents: "Store and organize your files and documents",
  services: "Manage available services and pricing",
  users: "Manage user accounts and permissions",
  settings: "Configure application settings and preferences",

  // Project Management
  createProject: "Start a new project to organize your work",
  projectStatus: "Track the current status of your project",
  projectManager: "Assign a project manager to oversee the project",
  projectMembers: "Add team members to collaborate on this project",
  projectDeadline: "Set a target completion date for the project",
  
  // Task Management
  createTask: "Add a new task to track work items",
  taskPriority: "Set the importance level of this task",
  taskStatus: "Update the current progress of this task",
  taskAssignee: "Assign this task to a team member",
  taskDueDate: "Set when this task should be completed",
  taskDescription: "Provide detailed information about what needs to be done",
  taskComments: "Add notes and updates about task progress",
  
  // Forms
  formTitle: "Give your form a descriptive name",
  formDescription: "Explain what this form is for and how to use it",
  formFields: "Add input fields to collect the information you need",
  formSubmissions: "View responses submitted through this form",
  
  // Documents
  uploadFile: "Add new files to your document library",
  createFolder: "Organize files into folders for better structure",
  filePreview: "View file contents without downloading",
  fileDownload: "Save a copy of this file to your device",
  fileShare: "Generate a link to share this file with others",
  
  // Calendar
  scheduleMeeting: "Book a new meeting or appointment",
  meetingDuration: "How long should this meeting last?",
  meetingAttendees: "Who should be invited to this meeting?",
  meetingLocation: "Where will this meeting take place?",
  
  // User Management
  inviteUser: "Send an invitation to join your team",
  userRole: "Set permissions for what this user can access",
  userPermissions: "Control specific actions this user can perform",
  
  // Settings
  profileSettings: "Update your personal information and preferences",
  notificationSettings: "Choose how and when you want to be notified",
  securitySettings: "Manage your account security and privacy",
  themeSettings: "Customize the appearance of your interface"
}

// Helper function to get tooltip content
export function getTooltipContent(key: keyof typeof tooltipContent): string {
  return tooltipContent[key] || "Click for more information"
}

// Helper function to create tooltip with predefined content
export function createTooltip(key: keyof typeof tooltipContent, variant?: EnhancedTooltipProps['variant']) {
  return function TooltipWrapper({ children }: { children: React.ReactNode }) {
    return (
      <EnhancedTooltip content={tooltipContent[key]} variant={variant}>
        {children}
      </EnhancedTooltip>
    )
  }
}
