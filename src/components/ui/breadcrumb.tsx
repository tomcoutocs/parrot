'use client'

import React from 'react'
import { ChevronRight, Home, FolderOpen, FileText, Calendar, Building2, Users, Settings, Kanban } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
  isActive?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate?: (href: string) => void
  className?: string
}

export function Breadcrumb({ items, onNavigate, className = '' }: BreadcrumbProps) {
  const handleClick = (item: BreadcrumbItem) => {
    if (item.href && onNavigate && !item.isActive) {
      onNavigate(item.href)
    }
  }

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const Icon = item.icon
        const isLast = index === items.length - 1
        
        return (
          <React.Fragment key={index}>
            <div className="flex items-center">
              <Button
                variant={item.isActive ? "default" : "ghost"}
                size="sm"
                onClick={() => handleClick(item)}
                className={`h-8 px-2 text-xs font-medium ${
                  item.isActive 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                disabled={item.isActive}
              >
                {Icon && <Icon className="h-3 w-3 mr-1" />}
                {item.label}
              </Button>
            </div>
            {!isLast && (
              <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}

// Predefined breadcrumb configurations for different sections
export const breadcrumbConfigs = {
  dashboard: [
    { label: 'Dashboard', icon: Home, isActive: true }
  ],
  
  projects: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Projects', icon: FolderOpen, isActive: true }
  ],
  
  projectDetail: (projectName: string, projectId: string) => [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Projects', icon: FolderOpen, href: 'projects' },
    { label: projectName, icon: FolderOpen, isActive: true }
  ],
  
  tasks: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Tasks', icon: Kanban, isActive: true }
  ],
  
  taskDetail: (taskTitle: string, projectName?: string) => {
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', icon: Home, href: 'dashboard' },
      { label: 'Projects', icon: FolderOpen, href: 'projects' }
    ]
    
    if (projectName) {
      items.push({ label: projectName, icon: FolderOpen, href: 'projects' })
    }
    
    items.push({ label: taskTitle, icon: Kanban, isActive: true })
    return items
  },
  
  forms: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Forms', icon: FileText, isActive: true }
  ],
  
  calendar: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Calendar', icon: Calendar, isActive: true }
  ],
  
  companyCalendars: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Company Calendars', icon: Building2, isActive: true }
  ],
  
  documents: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Documents', icon: FileText, isActive: true }
  ],
  
  documentsFolder: (folderName: string, folderPath: string) => {
    const pathParts = folderPath.split('/').filter(Boolean)
    const items: BreadcrumbItem[] = [
      { label: 'Dashboard', icon: Home, href: 'dashboard' },
      { label: 'Documents', icon: FileText, href: 'documents' }
    ]
    
    // Add each folder in the path
    pathParts.forEach((part, index) => {
      const isLast = index === pathParts.length - 1
      items.push({
        label: part,
        icon: FolderOpen,
        href: isLast ? undefined : `documents?folder=${encodeURIComponent(folderPath)}`,
        isActive: isLast
      })
    })
    
    return items
  },
  
  services: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Services', icon: Settings, isActive: true }
  ],
  
  users: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Users', icon: Users, isActive: true }
  ],
  
  settings: [
    { label: 'Dashboard', icon: Home, href: 'dashboard' },
    { label: 'Settings', icon: Settings, isActive: true }
  ]
}

// Hook to generate breadcrumbs based on current route and context
export function useBreadcrumbs(
  currentTab: string, 
  context?: {
    projectName?: string
    projectId?: string
    taskTitle?: string
    folderName?: string
    folderPath?: string
  }
) {
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    switch (currentTab) {
      case 'dashboard':
        return breadcrumbConfigs.dashboard
      
      case 'projects':
        if (context?.projectName && context?.projectId) {
          return breadcrumbConfigs.projectDetail(context.projectName, context.projectId)
        }
        return breadcrumbConfigs.projects
      
      case 'tasks':
        if (context?.taskTitle) {
          return breadcrumbConfigs.taskDetail(context.taskTitle, context.projectName)
        }
        return breadcrumbConfigs.tasks
      
      case 'forms':
        return breadcrumbConfigs.forms
      
      case 'calendar':
        return breadcrumbConfigs.calendar
      
      case 'company-calendars':
        return breadcrumbConfigs.companyCalendars
      
      case 'documents':
        if (context?.folderName && context?.folderPath) {
          return breadcrumbConfigs.documentsFolder(context.folderName, context.folderPath)
        }
        return breadcrumbConfigs.documents
      
      case 'services':
        return breadcrumbConfigs.services
      
      case 'users':
        return breadcrumbConfigs.users
      
      case 'settings':
        return breadcrumbConfigs.settings
      
      default:
        return breadcrumbConfigs.dashboard
    }
  }

  return generateBreadcrumbs()
}

// Compact breadcrumb for smaller spaces
export function CompactBreadcrumb({ items, onNavigate, className = '' }: BreadcrumbProps) {
  if (items.length <= 2) {
    return <Breadcrumb items={items} onNavigate={onNavigate} className={className} />
  }

  const firstItem = items[0]
  const lastItem = items[items.length - 1]
  const middleItems = items.slice(1, -1)

  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => firstItem.href && onNavigate?.(firstItem.href)}
        className="h-8 px-2 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
      >
        {firstItem.icon && <firstItem.icon className="h-3 w-3 mr-1" />}
        {firstItem.label}
      </Button>
      
      <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      
      <Button
        variant="ghost"
        size="sm"
        className="h-8 px-2 text-xs font-medium text-gray-500 dark:text-gray-500"
        disabled
      >
        ...
      </Button>
      
      <ChevronRight className="h-3 w-3 text-gray-400 dark:text-gray-500" />
      
      <Button
        variant="default"
        size="sm"
        className="h-8 px-2 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
        disabled
      >
        {lastItem.icon && <lastItem.icon className="h-3 w-3 mr-1" />}
        {lastItem.label}
      </Button>
    </nav>
  )
}
