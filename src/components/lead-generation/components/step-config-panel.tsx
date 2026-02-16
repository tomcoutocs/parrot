"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Mail, Phone, Clock, CheckSquare, GitBranch, Tag, ArrowRight, Code2, Calendar, X, CheckCircle2 } from 'lucide-react'
import type { SequenceStep, StepType } from './campaign-sequence-builder'
import { fetchLeadIntegrations } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { EmailConnectionModal } from './modals/email-connection-modal'

interface StepConfigPanelProps {
  step: SequenceStep
  onUpdate: (updates: Partial<SequenceStep>) => void
  onClose: () => void
}

export function StepConfigPanel({ step, onUpdate, onClose }: StepConfigPanelProps) {
  const { data: session } = useSession()
  const [emailIntegrations, setEmailIntegrations] = useState<any[]>([])
  const [emailModalOpen, setEmailModalOpen] = useState(false)

  useEffect(() => {
    const loadEmailIntegrations = async () => {
      if (!session?.user?.id || step.type !== 'email') return
      const result = await fetchLeadIntegrations({ userOnly: true })
      const email = (result.integrations || []).filter(
        (i: any) => i.integration_type === 'email_marketing' && i.is_active
      )
      setEmailIntegrations(email)
    }
    loadEmailIntegrations()
  }, [session?.user?.id, step.type])

  const [label, setLabel] = useState((step.config?.label as string) || step.label)
  const [senderId, setSenderId] = useState((step.config?.senderId as string) || '')
  const [subject, setSubject] = useState((step.config?.subject as string) || '')
  const [content, setContent] = useState((step.config?.content as string) || '')
  const [delayMinutes, setDelayMinutes] = useState(step.delayMinutes || 0)
  const [taskDescription, setTaskDescription] = useState((step.config?.taskDescription as string) || '')
  const [markAsManual, setMarkAsManual] = useState((step.config?.markAsManual as boolean) || false)
  const [conditionValue, setConditionValue] = useState((step.config?.value as string) || '')
  const [tagName, setTagName] = useState((step.config?.tagName as string) || '')
  const [webhookUrl, setWebhookUrl] = useState((step.config?.webhookUrl as string) || '')

  const applyUpdate = (updates: Record<string, unknown>) => {
    onUpdate({
      config: { ...step.config, ...updates },
      label: updates.label as string || label,
    })
  }

  const handleBlur = () => {
    applyUpdate({ label })
  }

  const renderEmailConfig = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="markManual">Mark as manual</Label>
        <Switch
          id="markManual"
          checked={markAsManual}
          onCheckedChange={(v) => {
            setMarkAsManual(v)
            applyUpdate({ markAsManual: v })
          }}
        />
      </div>
      <div className="space-y-2">
        <Label>Sender</Label>
        {emailIntegrations.length > 0 ? (
          <Select
            value={senderId || emailIntegrations[0]?.id || ''}
            onValueChange={(v) => {
              setSenderId(v)
              applyUpdate({ senderId: v })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select sender" />
            </SelectTrigger>
            <SelectContent>
              {emailIntegrations.map((int) => (
                <SelectItem key={int.id} value={int.id}>
                  {int.integration_name} ({(int.credentials as any)?.fromEmail || '—'})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="rounded-lg border p-3 space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              onClick={() => setEmailModalOpen(true)}
            >
              Connect email sender
            </Button>
            <p className="text-xs text-muted-foreground">
              Connect in Settings → Integrations, or click above
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input
          id="subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          onBlur={() => applyUpdate({ subject })}
          placeholder="Email subject..."
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => applyUpdate({ content })}
          placeholder="Write your email content..."
          rows={6}
          className="resize-none"
        />
      </div>
      <Button variant="outline" size="sm">
        Preview
      </Button>
    </div>
  )

  const renderWaitConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="delay">Wait duration (minutes)</Label>
        <Input
          id="delay"
          type="number"
          min={0}
          value={delayMinutes}
          onChange={(e) => {
            const v = parseInt(e.target.value) || 0
            setDelayMinutes(v)
            onUpdate({ delayMinutes: v })
          }}
          placeholder="e.g. 60"
        />
      </div>
    </div>
  )

  const renderCallConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taskDesc">Task description</Label>
        <Textarea
          id="taskDesc"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          onBlur={() => applyUpdate({ taskDescription })}
          placeholder="Call the lead to discuss..."
          rows={4}
        />
      </div>
    </div>
  )

  const renderManualTaskConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taskDesc">Task description</Label>
        <Textarea
          id="taskDesc"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          onBlur={() => applyUpdate({ taskDescription })}
          placeholder="Describe the task..."
          rows={4}
        />
      </div>
    </div>
  )

  const renderMeetingConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="taskDesc">Meeting task description</Label>
        <Textarea
          id="taskDesc"
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          onBlur={() => applyUpdate({ taskDescription })}
          placeholder="Schedule a meeting to discuss..."
          rows={4}
        />
      </div>
    </div>
  )

  const renderAddTagConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tagName">Tag name</Label>
        <Input
          id="tagName"
          value={tagName}
          onChange={(e) => setTagName(e.target.value)}
          onBlur={() => applyUpdate({ tagName })}
          placeholder="e.g. hot-lead, qualified"
        />
      </div>
    </div>
  )

  const renderChangeStageConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Stage</Label>
        <Select
          value={conditionValue}
          onValueChange={(v) => {
            setConditionValue(v)
            applyUpdate({ value: v })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="proposal">Proposal</SelectItem>
            <SelectItem value="negotiation">Negotiation</SelectItem>
            <SelectItem value="closed_won">Closed Won</SelectItem>
            <SelectItem value="closed_lost">Closed Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderWebhookConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="webhookUrl">Webhook URL</Label>
        <Input
          id="webhookUrl"
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          onBlur={() => applyUpdate({ webhookUrl })}
          placeholder="https://api.example.com/webhook"
        />
      </div>
    </div>
  )

  const renderSendToCampaignConfig = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Campaign</Label>
        <Select
          value={conditionValue}
          onValueChange={(v) => {
            setConditionValue(v)
            applyUpdate({ campaignId: v })
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="placeholder">Select a campaign (configure in settings)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )

  const renderConditionConfig = () => (
    <div className="space-y-4">
      {step.type === 'condition_score' && (
        <div className="space-y-2">
          <Label>Score threshold</Label>
          <Input
            type="number"
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            onBlur={() => applyUpdate({ value: conditionValue })}
            placeholder="e.g. 50"
          />
        </div>
      )}
      {step.type === 'condition_stage' && (
        <div className="space-y-2">
          <Label>Stage</Label>
          <Select
            value={conditionValue}
            onValueChange={(v) => {
              setConditionValue(v)
              applyUpdate({ value: v })
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="proposal">Proposal</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
              <SelectItem value="closed_won">Closed Won</SelectItem>
              <SelectItem value="closed_lost">Closed Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {step.type === 'condition_email_opened' && (
        <p className="text-sm text-muted-foreground">
          This condition triggers when the lead opens a previous email in the sequence.
        </p>
      )}
      {step.type === 'condition_email_clicked' && (
        <p className="text-sm text-muted-foreground">
          This condition triggers when the lead clicks a link in a previous email.
        </p>
      )}
      {step.type === 'condition_tag' && (
        <div className="space-y-2">
          <Label>Tag to check</Label>
          <Input
            value={tagName}
            onChange={(e) => setTagName(e.target.value)}
            onBlur={() => applyUpdate({ tagName })}
            placeholder="e.g. hot-lead"
          />
        </div>
      )}
      {step.type === 'condition_custom_field' && (
        <div className="space-y-2">
          <Label>Field name and value</Label>
          <Input
            value={conditionValue}
            onChange={(e) => setConditionValue(e.target.value)}
            onBlur={() => applyUpdate({ value: conditionValue })}
            placeholder="field_name=value"
          />
        </div>
      )}
    </div>
  )

  const getStepIcon = () => {
    switch (step.type) {
      case 'email':
        return <Mail className="w-5 h-5" />
      case 'call':
        return <Phone className="w-5 h-5" />
      case 'wait':
        return <Clock className="w-5 h-5" />
      case 'manual_task':
        return <CheckSquare className="w-5 h-5" />
      case 'meeting':
        return <Calendar className="w-5 h-5" />
      case 'add_tag':
        return <Tag className="w-5 h-5" />
      case 'change_stage':
        return <GitBranch className="w-5 h-5" />
      case 'webhook':
        return <Code2 className="w-5 h-5" />
      case 'send_to_campaign':
        return <ArrowRight className="w-5 h-5" />
      default:
        return <GitBranch className="w-5 h-5" />
    }
  }

  const getStepTitle = () => {
    const titles: Record<StepType, string> = {
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
    return titles[step.type] || step.type
  }

  const getStepSubtitle = () => {
    const subtitles: Record<StepType, string> = {
      email: 'Send automatic email.',
      call: 'Create a task to call the lead.',
      wait: 'Wait for a period before continuing.',
      manual_task: 'Create a task for manual follow-up.',
      meeting: 'Create a task to schedule a meeting.',
      add_tag: 'Add a tag to the lead.',
      change_stage: 'Move lead to a different stage.',
      webhook: 'Call an external API or webhook.',
      send_to_campaign: 'Add lead to another campaign.',
      condition_score: 'Branch when lead score meets threshold.',
      condition_stage: 'Branch when lead is in specific stage.',
      condition_email_opened: 'Branch when lead opens an email.',
      condition_email_clicked: 'Branch when lead clicks a link.',
      condition_tag: 'Branch when lead has a specific tag.',
      condition_custom_field: 'Branch when custom field matches.',
    }
    return subtitles[step.type] || ''
  }

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded bg-muted">
            {getStepIcon()}
          </div>
          <div>
            <h3 className="font-semibold">{getStepTitle()}</h3>
            <p className="text-xs text-muted-foreground">{getStepSubtitle()}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="stepLabel">Step label</Label>
          <Input
            id="stepLabel"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleBlur}
            placeholder="e.g. Welcome email"
          />
        </div>

        {step.type === 'email' && renderEmailConfig()}
        {step.type === 'wait' && renderWaitConfig()}
        {step.type === 'call' && renderCallConfig()}
        {step.type === 'manual_task' && renderManualTaskConfig()}
        {step.type === 'meeting' && renderMeetingConfig()}
        {step.type === 'add_tag' && renderAddTagConfig()}
        {step.type === 'change_stage' && renderChangeStageConfig()}
        {step.type === 'webhook' && renderWebhookConfig()}
        {step.type === 'send_to_campaign' && renderSendToCampaignConfig()}
        {step.type.startsWith('condition_') && renderConditionConfig()}
      </div>

      {step.type === 'email' && (
        <EmailConnectionModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
          onConnected={() => {
            fetchLeadIntegrations({ userOnly: true }).then((r) => {
              const email = (r.integrations || []).filter(
                (i: any) => i.integration_type === 'email_marketing' && i.is_active
              )
              setEmailIntegrations(email)
              if (email.length > 0 && !senderId) {
                setSenderId(email[0].id)
                applyUpdate({ senderId: email[0].id })
              }
            })
          }}
          existingIntegration={null}
        />
      )}
    </div>
  )
}
