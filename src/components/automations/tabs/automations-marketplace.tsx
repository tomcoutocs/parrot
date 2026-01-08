"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Heart, Star, Download, Filter, Loader2, Flag, User, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { 
  getMarketplaceAutomations, 
  toggleAutomationLike, 
  installMarketplaceAutomation,
  type MarketplaceAutomation 
} from '@/lib/automation-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { hasSystemAdminPrivileges } from '@/lib/role-helpers'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RateAutomationModal } from '../components/rate-automation-modal'
import { ReportAutomationModal } from '../components/report-automation-modal'

export function AutomationsMarketplace() {
  const { data: session } = useSession()
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [automations, setAutomations] = useState<MarketplaceAutomation[]>([])
  const [loading, setLoading] = useState(true)
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [ratingTarget, setRatingTarget] = useState<MarketplaceAutomation | null>(null)
  const [reportTarget, setReportTarget] = useState<MarketplaceAutomation | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MarketplaceAutomation | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  useEffect(() => {
    loadMarketplace()
  }, [categoryFilter])

  const loadMarketplace = async () => {
    setLoading(true)
    try {
      const result = await getMarketplaceAutomations({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
        search: searchTerm || undefined,
      })
      if (result.success && result.data) {
        setAutomations(result.data)
        // Load liked status (would need separate API call in real implementation)
      }
    } catch (error) {
      console.error('Error loading marketplace:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        loadMarketplace()
      }
    }, 500)
    return () => clearTimeout(timeoutId)
  }, [searchTerm])

  const handleLike = async (marketplaceId: string) => {
    try {
      const result = await toggleAutomationLike(marketplaceId)
      if (result.success) {
        if (result.isLiked) {
          setLikedIds(new Set([...likedIds, marketplaceId]))
          toastSuccess('Added to liked')
        } else {
          const newLiked = new Set(likedIds)
          newLiked.delete(marketplaceId)
          setLikedIds(newLiked)
          toastSuccess('Removed from liked')
        }
        loadMarketplace() // Refresh to update like counts
      } else {
        toastError(result.error || 'Failed to toggle like')
      }
    } catch (error) {
      toastError('Failed to toggle like')
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

  const handleRemove = async () => {
    if (!removeTarget) return

    setIsRemoving(true)
    try {
      const currentUser = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('auth-user') || 'null') 
        : null

      if (!currentUser) {
        toastError('User session not found')
        setIsRemoving(false)
        return
      }

      const response = await fetch('/api/automations/marketplace/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketplaceId: removeTarget.id,
          userId: currentUser.id,
          userEmail: currentUser.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toastSuccess('Automation removed from marketplace successfully')
        loadMarketplace()
        setRemoveTarget(null)
      } else {
        toastError(result.error || 'Failed to remove automation from marketplace')
      }
    } catch (error) {
      console.error('Error removing automation:', error)
      toastError('Failed to remove automation from marketplace')
    } finally {
      setIsRemoving(false)
    }
  }

  const isSystemAdmin = hasSystemAdminPrivileges(session?.user?.role)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Automation Marketplace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Discover and install automation workflows created by the community
        </p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search automations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="operations">Operations</SelectItem>
                <SelectItem value="productivity">Productivity</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Marketplace Grid */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No automations found in marketplace</p>
            {searchTerm && (
              <Button variant="outline" className="mt-4" onClick={() => setSearchTerm('')}>
                Clear Search
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((automation) => {
            const isLiked = likedIds.has(automation.id)
            const isInstalling = installingId === automation.id
            
            return (
              <Card key={automation.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-lg flex-1">{automation.title}</CardTitle>
                    <div className="flex items-center gap-1">
                      {isSystemAdmin && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setRemoveTarget(automation)}
                          className="h-8 w-8"
                          title="Remove from marketplace"
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => setReportTarget(automation)}
                        className="h-8 w-8"
                        title="Report automation"
                      >
                        <Flag className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleLike(automation.id)}
                        className={isLiked ? 'text-red-500' : ''}
                      >
                        <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                      </Button>
                    </div>
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
                    {automation.is_verified && (
                      <Badge variant="outline">Verified</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mb-4 space-y-1">
                    <div>{automation.download_count || 0} installs</div>
                    {automation.creator && automation.creator.full_name && (
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>By {automation.creator.full_name}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline"
                      className="flex-1" 
                      onClick={() => setRatingTarget(automation)}
                    >
                      <Star className="w-4 h-4 mr-2" />
                      Rate
                    </Button>
                    <Button 
                      className="flex-1" 
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
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Rating Modal */}
      {ratingTarget && (
        <RateAutomationModal
          isOpen={ratingTarget !== null}
          onClose={() => setRatingTarget(null)}
          marketplaceId={ratingTarget.id}
          automationTitle={ratingTarget.title}
          onRated={() => {
            loadMarketplace()
            setRatingTarget(null)
          }}
        />
      )}

      {/* Report Modal */}
      {reportTarget && (
        <ReportAutomationModal
          isOpen={reportTarget !== null}
          onClose={() => setReportTarget(null)}
          marketplaceId={reportTarget.id}
          automationTitle={reportTarget.title}
          onReported={() => {
            setReportTarget(null)
          }}
        />
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={removeTarget !== null} onOpenChange={() => !isRemoving && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Automation from Marketplace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{removeTarget?.title}" from the marketplace? 
              This will hide it from all users, but the automation itself will not be deleted. 
              This action can be undone by updating the automation's status.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRemoving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={isRemoving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isRemoving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove from Marketplace'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

