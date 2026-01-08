"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Play, Pause, Trash2, Edit, Zap, Loader2, History, Share2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getAutomations, deleteAutomation, updateAutomation, type Automation } from '@/lib/automation-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
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
import { AutomationsExecutions } from './automations-executions'
import { ShareToMarketplaceModal } from '../components/share-to-marketplace-modal'

export function AutomationsSaved() {
  const { data: session } = useSession()
  const router = useRouter()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [shareTarget, setShareTarget] = useState<Automation | null>(null)
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null)
  const [unshareTarget, setUnshareTarget] = useState<string | null>(null)
  const [isUnsharing, setIsUnsharing] = useState(false)

  const loadAutomations = useCallback(async () => {
    if (!session?.user?.id) {
      setLoading(false)
      return
    }
    
    setLoading(true)
    try {
      const spaceId = session?.user?.company_id || null
      const result = await getAutomations(spaceId || undefined)
      if (result.success && result.data) {
        setAutomations(result.data)
      }
    } catch (error) {
      console.error('Error loading automations:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, session?.user?.company_id])

  useEffect(() => {
    loadAutomations()
  }, [loadAutomations])

  const handleUnshare = async () => {
    if (!unshareTarget) return

    setIsUnsharing(true)
    try {
      const currentUser = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('auth-user') || 'null') 
        : null

      if (!currentUser) {
        toastError('User session not found')
        setIsUnsharing(false)
        return
      }

      const response = await fetch('/api/automations/marketplace/unshare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId: unshareTarget,
          userId: currentUser.id,
          userEmail: currentUser.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toastSuccess('Automation removed from marketplace successfully')
        loadAutomations()
        setUnshareTarget(null)
      } else {
        toastError(result.error || 'Failed to remove automation from marketplace')
      }
    } catch (error) {
      console.error('Error removing automation from marketplace:', error)
      toastError('Failed to remove automation from marketplace')
    } finally {
      setIsUnsharing(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return

    try {
      const result = await deleteAutomation(deleteTarget)
      if (result.success) {
        toastSuccess('Automation deleted')
        setAutomations(automations.filter(a => a.id !== deleteTarget))
      } else {
        toastError(result.error || 'Failed to delete automation')
      }
    } catch (error) {
      toastError('Failed to delete automation')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleToggleActive = async (automation: Automation) => {
    try {
      const result = await updateAutomation(automation.id, {
        is_active: !automation.is_active
      })
      if (result.success) {
        toastSuccess(`Automation ${!automation.is_active ? 'activated' : 'paused'}`)
        setAutomations(automations.map(a => 
          a.id === automation.id ? { ...a, is_active: !a.is_active } : a
        ))
      } else {
        toastError(result.error || 'Failed to update automation')
      }
    } catch (error) {
      toastError('Failed to update automation')
    }
  }

  const handleEdit = (automationId: string) => {
    router.push(`/apps/automations?tab=builder&id=${automationId}`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Automations</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your saved automation workflows
          </p>
        </div>
        <Button onClick={() => {}}>
          <Plus className="w-4 h-4 mr-2" />
          New Automation
        </Button>
      </div>

      {/* Automations List */}
      {selectedAutomation ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => setSelectedAutomation(null)}>
              ← Back
            </Button>
            <div>
              <h3 className="text-lg font-semibold">{selectedAutomation.name}</h3>
              <p className="text-sm text-muted-foreground">{selectedAutomation.description}</p>
            </div>
          </div>
          <Tabs defaultValue="executions" className="w-full">
            <TabsList>
              <TabsTrigger value="executions">
                <History className="w-4 h-4 mr-2" />
                Execution History
              </TabsTrigger>
            </TabsList>
            <TabsContent value="executions">
              <AutomationsExecutions automationId={selectedAutomation.id} />
            </TabsContent>
          </Tabs>
        </div>
      ) : loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : automations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Zap className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No automations yet</p>
            <Button onClick={() => router.push('/apps/automations?tab=builder')}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Automation
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {automations.map((automation) => (
            <Card key={automation.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{automation.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {automation.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {automation.trigger_type}
                      </Badge>
                      {automation.category && (
                        <Badge variant="secondary" className="text-xs">
                          {automation.category}
                        </Badge>
                      )}
                      {automation.is_public && (
                        <Badge variant="default" className="text-xs bg-green-500">
                          <Share2 className="w-3 h-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={automation.is_active ? "default" : "secondary"}>
                    {automation.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Runs: {automation.run_count || 0}</span>
                    <span>Success: {automation.success_count || 0}</span>
                  </div>
                  {automation.last_run_at && (
                    <div className="text-xs text-muted-foreground">
                      Last run: {new Date(automation.last_run_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedAutomation(automation)}
                    title="View execution history"
                  >
                    <History className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleEdit(automation.id)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleToggleActive(automation)}
                  >
                    {automation.is_active ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  {automation.is_public ? (
                    <>
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={() => setShareTarget(automation)}
                        title="Update marketplace listing"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setUnshareTarget(automation.id)}
                        title="Remove from marketplace"
                        disabled={isUnsharing}
                      >
                        {isUnsharing && unshareTarget === automation.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Share2 className="w-4 h-4" />
                        )}
                      </Button>
                    </>
                  ) : (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShareTarget(automation)}
                      title="Share to marketplace"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setDeleteTarget(automation.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Automation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this automation? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share to Marketplace Modal */}
      {shareTarget && (
        <ShareToMarketplaceModal
          isOpen={shareTarget !== null}
          onClose={() => setShareTarget(null)}
          automationId={shareTarget.id}
          automationName={shareTarget.name}
          onShared={() => {
            loadAutomations()
            setShareTarget(null)
          }}
        />
      )}

      {/* Unshare Confirmation Dialog */}
      <AlertDialog open={unshareTarget !== null} onOpenChange={() => !isUnsharing && setUnshareTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Marketplace</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this automation from the marketplace? 
              It will no longer be visible to other users, but the automation itself will remain in your saved automations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnsharing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnshare}
              disabled={isUnsharing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isUnsharing ? (
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

