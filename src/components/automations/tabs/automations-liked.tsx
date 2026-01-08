"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Star, Download, Trash2, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getLikedAutomations, toggleAutomationLike, installMarketplaceAutomation, type MarketplaceAutomation } from '@/lib/automation-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'

export function AutomationsLiked() {
  const { data: session } = useSession()
  const router = useRouter()
  const [likedAutomations, setLikedAutomations] = useState<MarketplaceAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [installingId, setInstallingId] = useState<string | null>(null)

  const loadLiked = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const result = await getLikedAutomations()
      if (result.success && result.data) {
        setLikedAutomations(result.data)
      }
    } catch (error) {
      console.error('Error loading liked automations:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    loadLiked()
  }, [loadLiked])

  const handleUnlike = async (marketplaceId: string) => {
    try {
      const result = await toggleAutomationLike(marketplaceId)
      if (result.success) {
        setLikedAutomations(likedAutomations.filter(a => a.id !== marketplaceId))
        toastSuccess('Removed from liked')
      } else {
        toastError(result.error || 'Failed to remove like')
      }
    } catch (error) {
      toastError('Failed to remove like')
    }
  }

  const handleInstall = async (marketplaceId: string) => {
    setInstallingId(marketplaceId)
    try {
      const spaceId = session?.user?.company_id || null
      const result = await installMarketplaceAutomation(marketplaceId, spaceId || undefined)
      if (result.success) {
        toastSuccess('Automation installed successfully')
        router.push(`/apps/automations?tab=builder&id=${result.data?.id}`)
      } else {
        toastError(result.error || 'Failed to install automation')
      }
    } catch (error) {
      toastError('Failed to install automation')
    } finally {
      setInstallingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Liked Automations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your saved automations from the marketplace
        </p>
      </div>

      {/* Liked Automations List */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : likedAutomations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Heart className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No liked automations yet</p>
            <Button onClick={() => router.push('/apps/automations?tab=marketplace')}>
              Browse Marketplace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {likedAutomations.map((automation) => {
            const isInstalling = installingId === automation.id
            
            return (
              <Card key={automation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg flex-1">{automation.title}</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleUnlike(automation.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {automation.short_description || automation.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm font-medium">
                        {automation.rating_average > 0 ? automation.rating_average.toFixed(1) : '0.0'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({automation.rating_count})
                      </span>
                    </div>
                    {automation.category && (
                      <Badge variant="secondary">{automation.category}</Badge>
                    )}
                    {automation.is_featured && (
                      <Badge variant="default">Featured</Badge>
                    )}
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={() => handleInstall(automation.id)}
                    disabled={isInstalling}
                  >
                    {isInstalling ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Install
                      </>
                    )}
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

