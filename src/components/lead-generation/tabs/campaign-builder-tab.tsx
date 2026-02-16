"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Workflow, Loader2 } from 'lucide-react'
import { fetchLeadCampaigns, updateLeadCampaign, type LeadCampaign } from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { CampaignSequenceBuilder, type SequenceStep } from '../components/campaign-sequence-builder'
import { toastSuccess, toastError } from '@/lib/toast'

interface CampaignBuilderTabProps {
  onNavigateToCampaigns?: () => void
}

export function CampaignBuilderTab({ onNavigateToCampaigns }: CampaignBuilderTabProps) {
  const { data: session } = useSession()
  const [campaigns, setCampaigns] = useState<LeadCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [buildingCampaign, setBuildingCampaign] = useState<LeadCampaign | null>(null)

  useEffect(() => {
    loadCampaigns()
  }, [session?.user?.company_id])

  const loadCampaigns = async () => {
    if (!session?.user?.company_id) {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const result = await fetchLeadCampaigns(session.user.company_id)
      if (result.success && result.campaigns) {
        setCampaigns(result.campaigns)
      }
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
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
        setBuildingCampaign({
          ...buildingCampaign,
          campaign_settings: { ...buildingCampaign.campaign_settings, sequence_steps: steps },
        })
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
        setBuildingCampaign({ ...buildingCampaign!, status: newStatus })
        loadCampaigns()
      } else {
        toastError(result.error || 'Failed to update campaign')
      }
    } catch (error) {
      toastError('Failed to update campaign')
    }
  }

  // Show sequence builder when a campaign is selected
  if (buildingCampaign) {
    const steps = (buildingCampaign.campaign_settings?.sequence_steps as SequenceStep[]) || []
    return (
      <CampaignSequenceBuilder
        campaignName={buildingCampaign.name}
        campaignId={buildingCampaign.id}
        initialSteps={steps}
        isActive={buildingCampaign.status === 'active'}
        onSave={handleSaveSequence}
        onToggleActive={() => handleToggleStatus(buildingCampaign)}
        onBack={() => setBuildingCampaign(null)}
      />
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Campaign Builder</h2>
        <p className="text-muted-foreground">
          Build sequences with steps and conditions for your lead campaigns
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Workflow className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Create a campaign first in the Campaigns tab, then come back here to build its sequence with emails, calls, waits, and conditions.
            </p>
            <Button onClick={() => onNavigateToCampaigns?.()}>
              Go to Campaigns
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((campaign) => {
            const stepCount = (campaign.campaign_settings?.sequence_steps as SequenceStep[] | undefined)?.length || 0
            return (
              <Card
                key={campaign.id}
                className="cursor-pointer hover:shadow-md transition-shadow hover:border-primary/50"
                onClick={() => setBuildingCampaign(campaign)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {stepCount} step{stepCount !== 1 ? 's' : ''} in sequence
                      </p>
                    </div>
                    <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <Button variant="outline" size="sm" className="w-full mt-4" onClick={(e) => { e.stopPropagation(); setBuildingCampaign(campaign) }}>
                    <Workflow className="w-4 h-4 mr-2" />
                    Build sequence
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
