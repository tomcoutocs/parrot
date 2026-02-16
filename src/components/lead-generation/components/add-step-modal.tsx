"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Mail,
  Phone,
  Clock,
  CheckSquare,
  GitBranch,
  Target,
  MailCheck,
  Tag,
  ArrowRight,
  Code2,
  Calendar,
  MailOpen,
  Link2,
  UserCheck,
} from 'lucide-react'
import type { StepType } from './campaign-sequence-builder'

interface AddStepModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectStep: (type: StepType, config?: Record<string, unknown>) => void
}

const AUTOMATIC_STEPS: { type: StepType; label: string; description: string; icon: React.ElementType }[] = [
  { type: 'email', label: 'Email', description: 'Send automatic email', icon: Mail },
  { type: 'wait', label: 'Wait', description: 'Wait for a period of time', icon: Clock },
  { type: 'add_tag', label: 'Add tag', description: 'Add a tag to the lead', icon: Tag },
  { type: 'change_stage', label: 'Change stage', description: 'Move lead to a different stage', icon: GitBranch },
  { type: 'webhook', label: 'Call API', description: 'Call an external API or webhook', icon: Code2 },
  { type: 'send_to_campaign', label: 'Send to campaign', description: 'Add lead to another campaign', icon: ArrowRight },
]

const MANUAL_STEPS: { type: StepType; label: string; description: string; icon: React.ElementType }[] = [
  { type: 'call', label: 'Call', description: 'Create a task to call', icon: Phone },
  { type: 'manual_task', label: 'Manual task', description: 'Create a task', icon: CheckSquare },
  { type: 'meeting', label: 'Meeting', description: 'Create a task to schedule meeting', icon: Calendar },
]

const CONDITION_STEPS: { type: StepType; label: string; description: string; icon: React.ElementType }[] = [
  { type: 'condition_score', label: 'If score', description: 'When lead score meets threshold', icon: Target },
  { type: 'condition_stage', label: 'If stage', description: 'When lead is in specific stage', icon: GitBranch },
  { type: 'condition_email_opened', label: 'If email opened', description: 'When lead opens an email', icon: MailCheck },
  { type: 'condition_email_clicked', label: 'If link clicked', description: 'When lead clicks a link in email', icon: Link2 },
  { type: 'condition_tag', label: 'If has tag', description: 'When lead has a specific tag', icon: Tag },
  { type: 'condition_custom_field', label: 'If custom field', description: 'When custom field matches value', icon: UserCheck },
]

export function AddStepModal({ isOpen, onClose, onSelectStep }: AddStepModalProps) {
  const [activeTab, setActiveTab] = useState<'steps' | 'conditions'>('steps')

  const handleSelect = (type: StepType) => {
    onSelectStep(type)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Add step</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'steps' | 'conditions')}>
          <TabsList className="mx-6 mb-4">
            <TabsTrigger value="steps">Steps</TabsTrigger>
            <TabsTrigger value="conditions">Conditions</TabsTrigger>
          </TabsList>

          <TabsContent value="steps" className="px-6 pb-6 mt-0">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Automatic steps</h3>
                <div className="grid grid-cols-2 gap-2">
                  {AUTOMATIC_STEPS.map((step) => {
                    const Icon = step.icon
                    return (
                      <button
                        key={step.type}
                        onClick={() => handleSelect(step.type)}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded bg-muted">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{step.label}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">Manual execution</h3>
                <div className="grid grid-cols-2 gap-2">
                  {MANUAL_STEPS.map((step) => {
                    const Icon = step.icon
                    return (
                      <button
                        key={step.type}
                        onClick={() => handleSelect(step.type)}
                        className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/50 transition-colors text-left"
                      >
                        <div className="flex items-center justify-center w-10 h-10 rounded bg-muted">
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{step.label}</div>
                          <div className="text-xs text-muted-foreground">{step.description}</div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="conditions" className="px-6 pb-6 mt-0">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Conditions</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add conditions to branch your sequence based on lead behavior or attributes.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {CONDITION_STEPS.map((step) => {
                  const Icon = step.icon
                  return (
                    <button
                      key={step.type}
                      onClick={() => handleSelect(step.type)}
                      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted/50 hover:border-amber-500/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded bg-amber-500/20">
                        <Icon className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <div className="font-medium text-sm">{step.label}</div>
                        <div className="text-xs text-muted-foreground">{step.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
