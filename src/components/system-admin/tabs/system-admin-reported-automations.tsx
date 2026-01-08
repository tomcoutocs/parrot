"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, CheckCircle, XCircle, Clock, Eye, Trash2 } from 'lucide-react'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AutomationReport {
  id: string
  marketplace_id: string
  automation_id: string
  reported_by: string
  reason: string
  status: 'pending' | 'reviewed' | 'dismissed' | 'resolved'
  created_at: string
  reviewed_at?: string
  reviewed_by?: string
  marketplace?: {
    id: string
    title: string
    short_description?: string
    automation_id: string
  }
  reporter?: {
    id: string
    email: string
    full_name: string
  }
}

export function SystemAdminReportedAutomations() {
  const { data: session } = useSession()
  const [reports, setReports] = useState<AutomationReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedReport, setSelectedReport] = useState<AutomationReport | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [removingMarketplaceId, setRemovingMarketplaceId] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [statusFilter])

  const loadReports = async () => {
    if (!session?.user) return

    setLoading(true)
    try {
      const currentUser = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('auth-user') || 'null') 
        : null

      if (!currentUser) {
        toastError('User session not found')
        setLoading(false)
        return
      }

      const response = await fetch(
        `/api/automations/marketplace/reports?userId=${currentUser.id}&userEmail=${encodeURIComponent(currentUser.email)}&status=${statusFilter}`
      )
      const result = await response.json()

      if (result.success) {
        setReports(result.data || [])
      } else {
        toastError(result.error || 'Failed to load reports')
      }
    } catch (error) {
      console.error('Error loading reports:', error)
      toastError('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveFromMarketplace = async (marketplaceId: string) => {
    if (!session?.user) return

    setRemovingMarketplaceId(marketplaceId)
    try {
      const currentUser = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('auth-user') || 'null') 
        : null

      if (!currentUser) {
        toastError('User session not found')
        setRemovingMarketplaceId(null)
        return
      }

      const response = await fetch('/api/automations/marketplace/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          marketplaceId,
          userId: currentUser.id,
          userEmail: currentUser.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toastSuccess('Automation removed from marketplace successfully')
        loadReports()
      } else {
        toastError(result.error || 'Failed to remove automation from marketplace')
      }
    } catch (error) {
      console.error('Error removing automation:', error)
      toastError('Failed to remove automation from marketplace')
    } finally {
      setRemovingMarketplaceId(null)
    }
  }

  const handleStatusUpdate = async (reportId: string, newStatus: string) => {
    if (!session?.user) return

    setUpdatingStatus(reportId)
    try {
      const currentUser = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('auth-user') || 'null') 
        : null

      if (!currentUser) {
        toastError('User session not found')
        setUpdatingStatus(null)
        return
      }

      const response = await fetch('/api/automations/marketplace/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportId,
          status: newStatus,
          userId: currentUser.id,
          userEmail: currentUser.email,
        }),
      })

      const result = await response.json()

      if (result.success) {
        toastSuccess(`Report marked as ${newStatus}`)
        loadReports()
      } else {
        toastError(result.error || 'Failed to update report status')
      }
    } catch (error) {
      console.error('Error updating report status:', error)
      toastError('Failed to update report status')
    } finally {
      setUpdatingStatus(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'reviewed':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500"><Eye className="w-3 h-3 mr-1" />Reviewed</Badge>
      case 'resolved':
        return <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500"><CheckCircle className="w-3 h-3 mr-1" />Resolved</Badge>
      case 'dismissed':
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500"><XCircle className="w-3 h-3 mr-1" />Dismissed</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Reported Automations</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review and manage reports submitted by users about marketplace automations
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={loadReports} disabled={loading}>
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No reports found</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Reports ({reports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Automation</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {report.marketplace?.title || 'Unknown Automation'}
                        </div>
                        {report.marketplace?.short_description && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {report.marketplace.short_description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {report.reporter?.full_name || 'Unknown User'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {report.reporter?.email || ''}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        <p className="text-sm line-clamp-2">{report.reason}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 h-auto p-0 text-xs"
                          onClick={() => setSelectedReport(report)}
                        >
                          View full reason
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(report.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDate(report.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {report.status === 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(report.id, 'resolved')}
                              disabled={updatingStatus === report.id}
                            >
                              {updatingStatus === report.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Resolve
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(report.id, 'dismissed')}
                              disabled={updatingStatus === report.id}
                            >
                              {updatingStatus === report.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <XCircle className="w-4 h-4 mr-1" />
                                  Dismiss
                                </>
                              )}
                            </Button>
                          </>
                        )}
                        {report.status !== 'pending' && (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleStatusUpdate(report.id, 'pending')}
                              disabled={updatingStatus === report.id}
                            >
                              {updatingStatus === report.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Reopen'
                              )}
                            </Button>
                            {report.marketplace_id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveFromMarketplace(report.marketplace_id)}
                                disabled={removingMarketplaceId === report.marketplace_id}
                                className="text-destructive hover:text-destructive"
                              >
                                {removingMarketplaceId === report.marketplace_id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4 mr-1" />
                                    Remove
                                  </>
                                )}
                              </Button>
                            )}
                          </>
                        )}
                        {report.marketplace_id && report.status === 'pending' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveFromMarketplace(report.marketplace_id)}
                            disabled={removingMarketplaceId === report.marketplace_id}
                            className="text-destructive hover:text-destructive"
                          >
                            {removingMarketplaceId === report.marketplace_id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="w-4 h-4 mr-1" />
                                Remove
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Report Details Dialog */}
      {selectedReport && (
        <Dialog open={selectedReport !== null} onOpenChange={() => setSelectedReport(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
              <DialogDescription>
                Full details of the automation report
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <h4 className="font-medium mb-2">Automation</h4>
                <p className="text-sm">{selectedReport.marketplace?.title || 'Unknown'}</p>
                {selectedReport.marketplace?.short_description && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedReport.marketplace.short_description}
                  </p>
                )}
              </div>
              <div>
                <h4 className="font-medium mb-2">Reporter</h4>
                <p className="text-sm">
                  {selectedReport.reporter?.full_name || 'Unknown User'} ({selectedReport.reporter?.email || 'N/A'})
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Reason for Report</h4>
                <p className="text-sm whitespace-pre-wrap bg-muted p-3 rounded-md">
                  {selectedReport.reason}
                </p>
              </div>
              <div>
                <h4 className="font-medium mb-2">Status</h4>
                {getStatusBadge(selectedReport.status)}
              </div>
              <div>
                <h4 className="font-medium mb-2">Reported At</h4>
                <p className="text-sm">{formatDate(selectedReport.created_at)}</p>
              </div>
              {selectedReport.reviewed_at && (
                <div>
                  <h4 className="font-medium mb-2">Reviewed At</h4>
                  <p className="text-sm">{formatDate(selectedReport.reviewed_at)}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

