"use client"

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Mail,
  Phone,
  Clock,
  CheckSquare,
  GitBranch,
  Tag,
  ArrowRight,
  Code2,
  Calendar,
  Plus,
  MoreHorizontal,
  Pencil,
  ChevronRight,
  Settings,
  Star,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AddStepModal } from './add-step-modal'
import { StepConfigPanel } from './step-config-panel'

export type StepType =
  | 'email'
  | 'call'
  | 'wait'
  | 'manual_task'
  | 'meeting'
  | 'add_tag'
  | 'change_stage'
  | 'webhook'
  | 'send_to_campaign'
  | 'condition_score'
  | 'condition_stage'
  | 'condition_email_opened'
  | 'condition_email_clicked'
  | 'condition_tag'
  | 'condition_custom_field'

export interface SequenceStep {
  id: string
  type: StepType
  label: string
  config: Record<string, unknown>
  delayMinutes?: number
}

const STEP_ICONS: Record<StepType, React.ElementType> = {
  email: Mail,
  call: Phone,
  wait: Clock,
  manual_task: CheckSquare,
  meeting: Calendar,
  add_tag: Tag,
  change_stage: GitBranch,
  webhook: Code2,
  send_to_campaign: ArrowRight,
  condition_score: GitBranch,
  condition_stage: GitBranch,
  condition_email_opened: GitBranch,
  condition_email_clicked: GitBranch,
  condition_tag: GitBranch,
  condition_custom_field: GitBranch,
}

const STEP_LABELS: Record<StepType, string> = {
  email: 'Email',
  call: 'Call',
  wait: 'Wait',
  manual_task: 'Manual Task',
  meeting: 'Meeting',
  add_tag: 'Add Tag',
  change_stage: 'Change Stage',
  webhook: 'Call API',
  send_to_campaign: 'Send to Campaign',
  condition_score: 'If Score',
  condition_stage: 'If Stage',
  condition_email_opened: 'If Email Opened',
  condition_email_clicked: 'If Link Clicked',
  condition_tag: 'If Has Tag',
  condition_custom_field: 'If Custom Field',
}

interface CampaignSequenceBuilderProps {
  campaignName: string
  campaignId?: string
  initialSteps?: SequenceStep[]
  isActive?: boolean
  onSave: (steps: SequenceStep[]) => Promise<void>
  onToggleActive?: () => void
  onBack?: () => void
}

export function CampaignSequenceBuilder({
  campaignName,
  campaignId,
  initialSteps = [],
  isActive = false,
  onSave,
  onToggleActive,
  onBack,
}: CampaignSequenceBuilderProps) {
  const [steps, setSteps] = useState<SequenceStep[]>(initialSteps)
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null)
  const [showAddStepModal, setShowAddStepModal] = useState(false)
  const [addAfterStepId, setAddAfterStepId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const selectedStep = steps.find((s) => s.id === selectedStepId)

  const handleAddStep = (type: StepType, config?: Record<string, unknown>) => {
    const newStep: SequenceStep = {
      id: `step-${Date.now()}`,
      type,
      label: STEP_LABELS[type],
      config: config || {},
    }

    if (addAfterStepId) {
      const index = steps.findIndex((s) => s.id === addAfterStepId)
      const newSteps = [...steps]
      newSteps.splice(index + 1, 0, newStep)
      setSteps(newSteps)
    } else {
      setSteps([...steps, newStep])
    }

    setShowAddStepModal(false)
    setAddAfterStepId(null)
    setSelectedStepId(newStep.id)
  }

  const handleRemoveStep = (stepId: string) => {
    setSteps(steps.filter((s) => s.id !== stepId))
    if (selectedStepId === stepId) setSelectedStepId(null)
  }

  const handleUpdateStep = (stepId: string, updates: Partial<SequenceStep>) => {
    setSteps(steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(steps)
    } finally {
      setSaving(false)
    }
  }

  const openAddStep = (afterStepId: string | null) => {
    setAddAfterStepId(afterStepId)
    setShowAddStepModal(true)
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-0 -mx-8 -my-6">
      {/* Main canvas */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border bg-muted/20">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-background">
          <div className="flex items-center gap-4">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ChevronRight className="w-4 h-4 rotate-180" />
              </Button>
            )}
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">{campaignName}</h2>
              <Badge variant={isActive ? 'default' : 'secondary'}>
                {isActive ? 'ON' : 'OFF'}
              </Badge>
            </div>
            {onToggleActive && (
              <Button
                variant={isActive ? 'secondary' : 'default'}
                size="sm"
                onClick={onToggleActive}
              >
                {isActive ? 'Pause' : 'Activate'}
              </Button>
            )}
            <Button variant="ghost" size="icon">
              <Star className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span className="px-2 py-1 rounded bg-primary/10 text-primary font-medium">1</span>
              <span>Sequence</span>
              <span className="px-2 py-1 rounded">2</span>
              <span>Lead list</span>
              <span className="px-2 py-1 rounded">3</span>
              <span>Launch</span>
            </div>
            <Button size="sm">Next step &gt;</Button>
          </div>
        </div>

        {/* Canvas with dotted grid */}
        <div className="flex-1 overflow-auto p-8">
          <div
            className="min-h-full relative"
            style={{
              backgroundImage: `radial-gradient(circle, oklch(var(--border)) 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
            }}
          >
            <div className="flex flex-col items-center gap-0 max-w-md mx-auto">
              {/* Sequence start */}
              <div className="px-6 py-3 rounded-lg border-2 border-dashed border-border bg-background flex items-center gap-2">
                <span className="font-medium">Sequence start</span>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* Connector */}
              <div className="w-0.5 h-8 bg-border" />

              {/* Add first step */}
              {steps.length === 0 && (
                <>
                  <button
                    onClick={() => openAddStep(null)}
                    className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                </>
              )}

              {/* Steps */}
              {steps.map((step, index) => {
                const Icon = STEP_ICONS[step.type]
                const isCondition = step.type.startsWith('condition_')
                const isSelected = selectedStepId === step.id

                return (
                  <div key={step.id} className="flex flex-col items-center w-full">
                    <div
                      className={`flex items-center gap-3 w-full max-w-sm px-4 py-3 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 shadow-sm'
                          : 'border-border bg-background hover:border-muted-foreground/50'
                      } ${isCondition ? 'border-l-4 border-l-amber-500' : ''}`}
                      onClick={() => setSelectedStepId(step.id)}
                    >
                      <div
                        className={`flex items-center justify-center w-8 h-8 rounded ${
                          isCondition ? 'bg-amber-500/20' : 'bg-muted'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {(typeof step.config?.label === 'string' ? step.config.label : null) || step.label}
                        </div>
                        {step.delayMinutes && step.delayMinutes > 0 && (
                          <div className="text-xs text-muted-foreground">
                            Wait {step.delayMinutes} min
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Edit - could open config
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRemoveStep(step.id)
                            }}
                          >
                            Remove step
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Connector + Add */}
                    <div className="flex flex-col items-center w-full">
                      <div className="w-0.5 h-6 bg-border" />
                      <button
                        onClick={() => openAddStep(step.id)}
                        className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 transition-colors"
                      >
                        <Plus className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {index < steps.length - 1 && <div className="w-0.5 h-6 bg-border" />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Right sidebar - Step config */}
      <div className="w-96 flex-shrink-0 border-l border-border bg-background overflow-y-auto">
        {selectedStep ? (
          <StepConfigPanel
            step={selectedStep}
            onUpdate={(updates) => handleUpdateStep(selectedStep.id, updates)}
            onClose={() => setSelectedStepId(null)}
          />
        ) : (
          <div className="p-6 flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Pencil className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">Select a step</p>
            <p className="text-xs text-muted-foreground mb-4">
              Click a step on the canvas to configure it
            </p>
            <Button variant="outline" size="sm" onClick={() => openAddStep(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Add step
            </Button>
          </div>
        )}
      </div>

      {/* Add Step Modal */}
      <AddStepModal
        isOpen={showAddStepModal}
        onClose={() => {
          setShowAddStepModal(false)
          setAddAfterStepId(null)
        }}
        onSelectStep={handleAddStep}
      />
    </div>
  )
}
