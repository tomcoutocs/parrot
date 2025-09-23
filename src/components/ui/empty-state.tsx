'use client'

import { LucideIcon, Kanban, FolderOpen, FileText, Users, Building2, Calendar, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'default' | 'large' | 'compact'
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  variant = 'default'
}: EmptyStateProps) {
  const sizeClasses = {
    default: 'py-12',
    large: 'py-16',
    compact: 'py-8'
  }

  const iconSizes = {
    default: 'h-16 w-16',
    large: 'h-20 w-20',
    compact: 'h-12 w-12'
  }

  return (
    <Card className="parrot-card-enhanced">
      <CardContent className={`text-center ${sizeClasses[variant]}`}>
        <div className="mx-auto w-24 h-24 bg-gradient-to-br from-orange-100 to-teal-100 rounded-full flex items-center justify-center mb-6">
          <Icon className={`${iconSizes[variant]} text-gray-400`} />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{description}</p>
        {actionLabel && onAction && (
          <Button 
            onClick={onAction} 
            className="parrot-button-primary"
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

// Specialized empty state components for common use cases
export function EmptyTasksState({ onAddTask }: { onAddTask?: () => void }) {
  return (
    <EmptyState
      icon={Kanban}
      title="No tasks yet"
      description="Get started by creating your first task. Tasks help you organize and track your work progress."
      actionLabel="Create Task"
      onAction={onAddTask}
    />
  )
}

export function EmptyProjectsState({ onAddProject }: { onAddProject?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No projects found"
      description="Projects help you organize tasks and collaborate with your team. Create your first project to get started."
      actionLabel="Create Project"
      onAction={onAddProject}
    />
  )
}

export function EmptyFormsState({ onCreateForm }: { onCreateForm?: () => void }) {
  return (
    <EmptyState
      icon={FileText}
      title="No forms available"
      description="Forms help you collect information from clients and team members. Create your first form to start gathering data."
      actionLabel="Create Form"
      onAction={onCreateForm}
    />
  )
}

export function EmptyDocumentsState({ onUploadDocument }: { onUploadDocument?: () => void }) {
  return (
    <EmptyState
      icon={FolderOpen}
      title="No documents uploaded"
      description="Upload documents to share with your team and clients. Keep all your important files organized in one place."
      actionLabel="Upload Document"
      onAction={onUploadDocument}
    />
  )
}

export function EmptyUsersState({ onInviteUser }: { onInviteUser?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No users found"
      description="Invite team members to collaborate on projects and tasks. Build your team to get more done together."
      actionLabel="Invite User"
      onAction={onInviteUser}
    />
  )
}

export function EmptyCompaniesState({ onAddCompany }: { onAddCompany?: () => void }) {
  return (
    <EmptyState
      icon={Building2}
      title="No companies found"
      description="Add companies to organize your clients and projects. Keep track of all your business relationships."
      actionLabel="Add Company"
      onAction={onAddCompany}
    />
  )
}

export function EmptyCalendarState({ onAddEvent }: { onAddEvent?: () => void }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No events scheduled"
      description="Schedule meetings, appointments, and important dates. Keep your calendar organized and never miss an important event."
      actionLabel="Add Event"
      onAction={onAddEvent}
    />
  )
}

export function EmptySearchState({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search terms or filters.`}
      variant="compact"
    />
  )
}
