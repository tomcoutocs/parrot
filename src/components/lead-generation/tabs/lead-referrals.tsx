"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, UserPlus, Mail, Phone, Building2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  fetchReferralClients,
  createReferralClient,
  updateReferralClient,
  deleteReferralClient,
  type ReferralClient,
} from '@/lib/database-functions'
import { useSession } from '@/components/providers/session-provider'
import { toastSuccess, toastError } from '@/lib/toast'
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'

export function LeadReferrals() {
  const { data: session } = useSession()
  const [referrals, setReferrals] = useState<ReferralClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<ReferralClient | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [notes, setNotes] = useState('')
  const [commissionRate, setCommissionRate] = useState<string>('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)

  const companyId = session?.user?.company_id

  useEffect(() => {
    loadReferrals()
  }, [companyId])

  const loadReferrals = async () => {
    if (!companyId) {
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const result = await fetchReferralClients(companyId)
      if (result.success && result.referrals) {
        setReferrals(result.referrals)
      } else if (result.error) {
        toastError(result.error)
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to load referral clients')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setName('')
    setEmail('')
    setPhone('')
    setCompanyName('')
    setContactPerson('')
    setNotes('')
    setCommissionRate('')
    setIsActive(true)
    setSelectedReferral(null)
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const handleEdit = (referral: ReferralClient) => {
    setSelectedReferral(referral)
    setName(referral.name || '')
    setEmail(referral.email || '')
    setPhone(referral.phone || '')
    setCompanyName(referral.company_name || '')
    setContactPerson(referral.contact_person || '')
    setNotes(referral.notes || '')
    setCommissionRate(referral.commission_rate ? referral.commission_rate.toString() : '')
    setIsActive(referral.is_active !== false)
    setShowEditModal(true)
  }

  const handleDelete = (referral: ReferralClient) => {
    setSelectedReferral(referral)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!selectedReferral) return

    setDeleting(true)
    try {
      const result = await deleteReferralClient(selectedReferral.id)
      if (result.success) {
        toastSuccess('Referral client deleted successfully')
        setShowDeleteDialog(false)
        loadReferrals()
      } else {
        toastError(result.error || 'Failed to delete referral client')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while deleting')
    } finally {
      setDeleting(false)
      setSelectedReferral(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyId) return

    setSaving(true)
    try {
      const referralData = {
        space_id: companyId,
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        company_name: companyName.trim() || undefined,
        contact_person: contactPerson.trim() || undefined,
        notes: notes.trim() || undefined,
        commission_rate: commissionRate ? parseFloat(commissionRate) : undefined,
        is_active: isActive,
      }

      let result
      if (selectedReferral) {
        result = await updateReferralClient(selectedReferral.id, referralData)
      } else {
        result = await createReferralClient(referralData)
      }

      if (result.success) {
        toastSuccess(
          selectedReferral
            ? 'Referral client updated successfully'
            : 'Referral client created successfully'
        )
        resetForm()
        setShowCreateModal(false)
        setShowEditModal(false)
        loadReferrals()
      } else {
        toastError(result.error || 'Failed to save referral client')
      }
    } catch (error: any) {
      toastError(error.message || 'An error occurred while saving')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading referral clients...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Referral Clients</h2>
          <p className="text-muted-foreground mt-1">
            Manage clients and partners who refer leads to your business
          </p>
        </div>
        <Button onClick={handleCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Referral Client
        </Button>
      </div>

      {/* Referrals List */}
      {referrals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No referral clients yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Start tracking referrals by adding your first referral client
            </p>
            <Button onClick={handleCreate} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Referral Client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {referrals.map((referral) => (
            <Card key={referral.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{referral.name}</CardTitle>
                    {referral.company_name && (
                      <CardDescription className="mt-1 flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {referral.company_name}
                      </CardDescription>
                    )}
                  </div>
                  <Badge variant={referral.is_active ? 'default' : 'secondary'}>
                    {referral.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {referral.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{referral.email}</span>
                    </div>
                  )}
                  {referral.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{referral.phone}</span>
                    </div>
                  )}
                  {referral.contact_person && (
                    <div className="text-muted-foreground">
                      Contact: {referral.contact_person}
                    </div>
                  )}
                  {referral.commission_rate !== null && referral.commission_rate !== undefined && (
                    <div className="text-muted-foreground">
                      Commission: {referral.commission_rate}%
                    </div>
                  )}
                  {referral.notes && (
                    <div className="text-muted-foreground text-xs mt-2 line-clamp-2">
                      {referral.notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(referral)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(referral)}
                    className="flex-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Dialog
        open={showCreateModal || showEditModal}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateModal(false)
            setShowEditModal(false)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedReferral ? 'Edit Referral Client' : 'Add Referral Client'}
            </DialogTitle>
            <DialogDescription>
              {selectedReferral
                ? 'Update referral client information'
                : 'Add a new client or partner who refers leads to your business'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input
                  id="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  placeholder="10.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information about this referral client..."
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setShowEditModal(false)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : selectedReferral
                    ? 'Update'
                    : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false)
          setSelectedReferral(null)
        }}
        onConfirm={confirmDelete}
        itemName={selectedReferral?.name || ''}
        isLoading={deleting}
      />
    </div>
  )
}
