"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Play, Pause, Calendar, DollarSign, Target, Workflow } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { fetchLeadCampaigns, createLeadCampaign, updateLeadCampaign, deleteLeadCampaign, type LeadCampaign } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CampaignSequenceBuilder, type SequenceStep } from '../components/campaign-sequence-builder'
import { Skeleton } from '@/components/ui/skeleton'

export function LeadCampaigns() {
  const { data: session } = useSession()
  const [campaigns, setCampaigns] = useState<LeadCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<LeadCampaign | null>(null)
  const [buildingCampaign, setBuildingCampaign] = useState<LeadCampaign | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    campaign_type: 'email',
    status: 'draft',
    start_date: '',
    end_date: '',
    budget: '',
  })

  const userId = session?.user?.id
  const companyId = session?.user?.company_id

  useEffect(() => {
    loadCampaigns()
  }, [userId, companyId])

  const loadCampaigns = async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchLeadCampaigns(companyId)

      if (result.success && result.campaigns) {
        setCampaigns(result.campaigns)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setFormData({
      name: '',
      description: '',
      campaign_type: 'email',
      status: 'draft',
      start_date: '',
      end_date: '',
      budget: '',
    })
    setEditingCampaign(null)
    setShowCreateModal(true)
  }

  const handleEdit = (campaign: LeadCampaign) => {
    setFormData({
      name: campaign.name,
      description: campaign.description || '',
      campaign_type: campaign.campaign_type,
      status: campaign.status,
      start_date: campaign.start_date ? new Date(campaign.start_date).toISOString().split('T')[0] : '',
      end_date: campaign.end_date ? new Date(campaign.end_date).toISOString().split('T')[0] : '',
      budget: campaign.budget?.toString() || '',
    })
    setEditingCampaign(campaign)
    setShowCreateModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!userId) {
      toastError('User not authenticated')
      return
    }

    try {
      const campaignPayload = {
        space_id: companyId,
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        campaign_type: formData.campaign_type,
        status: formData.status,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
      }

      if (editingCampaign) {
        const result = await updateLeadCampaign(editingCampaign.id, campaignPayload)
        if (result.success) {
          toastSuccess('Campaign updated successfully')
          setShowCreateModal(false)
          loadCampaigns()
          // Dispatch event to refresh dashboard stats
          window.dispatchEvent(new CustomEvent('campaignChanged'))
        } else {
          toastError(result.error || 'Failed to update campaign')
        }
      } else {
        const result = await createLeadCampaign(campaignPayload)
        if (result.success && result.campaign) {
          toastSuccess('Campaign created successfully')
          setShowCreateModal(false)
          loadCampaigns()
          setBuildingCampaign(result.campaign)
          window.dispatchEvent(new CustomEvent('campaignChanged'))
        } else {
          toastError(result.error || 'Failed to create campaign')
        }
      }
    } catch (error) {
      console.error('Error saving campaign:', error)
      toastError('An error occurred while saving the campaign')
    }
  }

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return

    try {
      const result = await deleteLeadCampaign(campaignId)
      if (result.success) {
        toastSuccess('Campaign deleted successfully')
        loadCampaigns()
        // Dispatch event to refresh dashboard stats
        window.dispatchEvent(new CustomEvent('campaignChanged'))
      } else {
        toastError(result.error || 'Failed to delete campaign')
      }
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toastError('An error occurred while deleting the campaign')
    }
  }

  const handleSaveSequence = async (steps: SequenceStep[]) => {
    if (!buildingCampaign) return
    try {
      const result = await updateLeadCampaign(buildingCampaign.id, {
        campaign_settings: {
          ...(buildingCampaign.campaign_settings || {}),
          sequence_steps: steps,
        },
      })
      if (result.success) {
        toastSuccess('Sequence saved')
        setBuildingCampaign({ ...buildingCampaign, campaign_settings: { ...buildingCampaign.campaign_settings, sequence_steps: steps } })
      } else {
        toastError(result.error || 'Failed to save sequence')
      }
    } catch (error) {
      toastError('Failed to save sequence')
    }
  }

  const handleToggleStatus = async (campaign: LeadCampaign) => {
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    try {
      const result = await updateLeadCampaign(campaign.id, { status: newStatus })
      if (result.success) {
        toastSuccess(`Campaign ${newStatus === 'active' ? 'activated' : 'paused'}`)
        loadCampaigns()
        // Dispatch event to refresh dashboard stats
        window.dispatchEvent(new CustomEvent('campaignChanged'))
      } else {
        toastError(result.error || 'Failed to update campaign')
      }
    } catch (error) {
      console.error('Error updating campaign status:', error)
      toastError('An error occurred while updating the campaign')
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'default'
      case 'paused':
        return 'secondary'
      case 'completed':
        return 'outline'
      case 'draft':
        return 'secondary'
      default:
        return 'secondary'
    }
  }

  const getCampaignTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      email: 'Email',
      social_media: 'Social Media',
      advertising: 'Advertising',
      content: 'Content',
      event: 'Event',
      referral: 'Referral',
      other: 'Other',
    }
    return labels[type] || type
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-40" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show sequence builder when building a campaign
  if (buildingCampaign) {
    const steps = (buildingCampaign.campaign_settings?.sequence_steps as SequenceStep[]) || []
    return (
      <CampaignSequenceBuilder
        campaignName={buildingCampaign.name}
        campaignId={buildingCampaign.id}
        initialSteps={steps}
        isActive={buildingCampaign.status === 'active'}
        onSave={handleSaveSequence}
        onToggleActive={() => buildingCampaign && handleToggleStatus(buildingCampaign)}
        onBack={() => setBuildingCampaign(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campaigns</h2>
          <p className="text-muted-foreground">Create and manage your marketing campaigns</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No campaigns created yet</p>
            <p className="text-sm text-muted-foreground mb-4 max-w-md text-center">
              Create a campaign and build a sequence with steps like emails, calls, waits, and conditions.
            </p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{campaign.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {getCampaignTypeLabel(campaign.campaign_type)}
                    </CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setBuildingCampaign(campaign)}>
                        <Workflow className="w-4 h-4 mr-2" />
                        Build sequence
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(campaign)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(campaign)}>
                        {campaign.status === 'active' ? (
                          <>
                            <Pause className="w-4 h-4 mr-2" />
                            Pause
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(campaign.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {campaign.description && (
                  <p className="text-sm text-muted-foreground mb-4">{campaign.description}</p>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <Badge variant={getStatusBadgeVariant(campaign.status)}>
                      {campaign.status}
                    </Badge>
                  </div>
                  {campaign.start_date && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(campaign.start_date).toLocaleDateString()}
                        {campaign.end_date && ` - ${new Date(campaign.end_date).toLocaleDateString()}`}
                      </span>
                    </div>
                  )}
                  {campaign.budget && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="w-4 h-4" />
                      <span>
                        Budget: ${campaign.budget.toLocaleString()}
                        {campaign.spent > 0 && ` (Spent: $${campaign.spent.toLocaleString()})`}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>
              {editingCampaign ? 'Update campaign details' : 'Create a new marketing campaign'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Campaign Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Q1 Product Launch"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Campaign description..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign_type">Campaign Type *</Label>
                  <Select
                    value={formData.campaign_type}
                    onValueChange={(value) => setFormData({ ...formData, campaign_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="social_media">Social Media</SelectItem>
                      <SelectItem value="advertising">Advertising</SelectItem>
                      <SelectItem value="content">Content</SelectItem>
                      <SelectItem value="event">Event</SelectItem>
                      <SelectItem value="referral">Referral</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status *</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($)</Label>
                <Input
                  id="budget"
                  type="number"
                  step="0.01"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button type="submit">{editingCampaign ? 'Update' : 'Create'} Campaign</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

