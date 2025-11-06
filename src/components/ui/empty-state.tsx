'use client'

import { LucideIcon, Kanban, FolderOpen, FileText, Users, Building2, Calendar, Search, Lightbulb, Sparkles, Rocket, ArrowRight, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  variant?: 'default' | 'large' | 'compact'
  tips?: string[]
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  illustration?: 'default' | 'rocket' | 'sparkles' | 'help'
  onboardingHint?: string
}

export default function EmptyState({ 
  icon: Icon, 
  title, 
  description, 
  actionLabel, 
  onAction,
  variant = 'default',
  tips = [],
  secondaryActionLabel,
  onSecondaryAction,
  illustration = 'default',
  onboardingHint
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

  const iconContainerSizes = {
    default: 'w-24 h-24',
    large: 'w-32 h-32',
    compact: 'w-20 h-20'
  }

  return (
    <Card className="parrot-card-enhanced border-2 border-dashed border-gray-200 dark:border-gray-700">
      <CardContent className={`text-center ${sizeClasses[variant]}`}>
        {/* Enhanced Icon with Animation */}
        <div className={`mx-auto ${iconContainerSizes[variant]} bg-gradient-to-br from-orange-50 via-teal-50 to-blue-50 dark:from-orange-950/20 dark:via-teal-950/20 dark:to-blue-950/20 rounded-full flex items-center justify-center mb-6 relative group`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-200/50 to-teal-200/50 dark:from-orange-800/30 dark:to-teal-800/30 animate-pulse opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <Icon className={`${iconSizes[variant]} text-gray-500 dark:text-gray-400 relative z-10 transition-transform duration-300 group-hover:scale-110`} />
          {illustration === 'sparkles' && (
            <>
          <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-orange-400 animate-pulse" />
              <Sparkles className="absolute -bottom-1 -left-1 h-3 w-3 text-teal-400 animate-pulse delay-300" />
            </>
          )}
          {illustration === 'rocket' && (
            <Rocket className="absolute -top-2 -right-2 h-5 w-5 text-orange-400 animate-bounce" />
          )}
          {illustration === 'help' && (
            <HelpCircle className="absolute -bottom-2 -left-2 h-5 w-5 text-blue-400 animate-pulse" />
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
        
        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto leading-relaxed">{description}</p>

        {/* Onboarding Hint */}
        {onboardingHint && (
          <div className="mb-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/30 dark:to-teal-950/30 rounded-lg border border-blue-200/50 dark:border-blue-800/30">
            <HelpCircle className="h-4 w-4 text-blue-500 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">{onboardingHint}</p>
          </div>
        )}

        {/* Action Buttons */}
        {(actionLabel || secondaryActionLabel) && (
          <div className="flex items-center justify-center gap-3 mb-6 flex-wrap">
            {actionLabel && onAction && (
              <Button 
                onClick={onAction} 
                className="parrot-button-primary min-w-[140px] group/btn"
                size="default"
              >
                <span className="flex items-center gap-2">
                {actionLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                </span>
              </Button>
            )}
            {secondaryActionLabel && onSecondaryAction && (
              <Button 
                onClick={onSecondaryAction} 
                variant="outline"
                className="min-w-[140px]"
                size="default"
              >
                {secondaryActionLabel}
              </Button>
            )}
          </div>
        )}

        {/* Quick Tips Section */}
        {tips.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Lightbulb className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quick Tips</span>
            </div>
            <ul className="text-left max-w-md mx-auto space-y-2">
              {tips.map((tip, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-orange-500 dark:text-orange-400 mt-1">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
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
      illustration="rocket"
      onboardingHint="Tip: Start by creating a task for something you need to do today!"
      tips={[
        "Break large projects into smaller, manageable tasks",
        "Set due dates and priorities to stay organized",
        "Assign tasks to team members for collaboration"
      ]}
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
      illustration="sparkles"
      onboardingHint="Projects help you stay organized by grouping related work together"
      tips={[
        "Projects group related tasks together",
        "Invite team members to collaborate on projects",
        "Track progress with project status and milestones"
      ]}
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
      illustration="help"
      onboardingHint="Forms make data collection easy - create one for surveys, applications, or requests"
      tips={[
        "Use different field types (text, dropdown, checkbox) for varied responses",
        "Make fields required to ensure important information is collected",
        "Review form submissions in the submissions tab"
      ]}
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
      illustration="sparkles"
      onboardingHint="Drag and drop files here or click to browse - organize with folders"
      tips={[
        "Organize documents into folders for easier navigation",
        "Use the search feature to quickly find documents",
        "Mark important documents as favorites for quick access"
      ]}
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
      illustration="rocket"
      onboardingHint="Collaboration starts with inviting team members to your workspace"
      tips={[
        "Invite users by email address",
        "Assign roles to control what users can access",
        "Users receive email invitations to join your workspace"
      ]}
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
      illustration="sparkles"
      onboardingHint="Organize your work by company - each company can have its own projects and tasks"
      tips={[
        "Add company details like name, address, and contact information",
        "Associate projects and tasks with companies",
        "View company-specific dashboards and reports"
      ]}
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
      illustration="help"
      onboardingHint="Stay organized by scheduling your important meetings and deadlines"
      tips={[
        "Add events with dates, times, and descriptions",
        "Set reminders for upcoming events",
        "View your schedule in day, week, or month view"
      ]}
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
