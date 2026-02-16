"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, UserPlus, Mail, Phone, Building2 } from 'lucide-react'
import {
  fetchReferralClients,
  createReferralClient,
  updateReferralClient,
  deleteReferralClient,
  type ReferralClient,
} from '@/lib/database-functions'
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
import { DeleteConfirmationDialog } from '@/components/ui/confirmation-dialog'

export function LeadReferrals() {
  const { data: session } = useSession()
  const [referrals, setReferrals] = useState<ReferralClient[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedReferral, setSelectedReferral] = useState<ReferralClient | null>(null)
  const [deleteReferral, setDeleteReferral] = useState<ReferralClient | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    email: '',
    phone: '',
    contact_person: '',
    commission_rate: '',
    notes: '',
    is_active: true,
  })

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
      }
    } catch (error) {
      console.error('Error loading referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      company_name: '',
      email: '',
      phone: '',
      contact_person: '',
      commission_rate: '',
      notes: '',
      is_active: true,
    })
    setSelectedReferral(null)
  }

  const handleCreate = () => {
    resetForm()
    setShowCreateModal(true)
    setShowEditModal(false)
  }

  const handleEdit = (referral: ReferralClient) => {
    setSelectedReferral(referral)
    setFormData({
      name: referral.name,
      company_name: referral.company_name || '',
      email: referral.email || '',
      phone: referral.phone || '',
      contact_person: referral.contact_person || '',
      commission_rate: referral.commission_rate?.toString() || '',
      notes: referral.notes || '',
      is_active: referral.is_active,
    })
    setShowEditModal(true)
    setShowCreateModal(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!session?.user?.id || !companyId) {
      toastError('User not authenticated')
      return
    }

    if (!formData.name.trim()) {
      toastError('Name is required')
      return
    }

    try {
      const payload = {
        space_id: companyId,
        name: formData.name.trim(),
        company_name: formData.company_name.trim() || undefined,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        contact_person: formData.contact_person.trim() || undefined,
        commission_rate: formData.commission_rate ? parseFloat(formData.commission_rate) : undefined,
        notes: formData.notes.trim() || undefined,
        is_active: formData.is_active,
      }

      if (selectedReferral) {
        const { space_id: _, ...updatePayload } = payload
        const result = await updateReferralClient(selectedReferral.id, updatePayload)
        if (result.success) {
          toastSuccess('Referral updated successfully')
          loadReferrals()
          setShowEditModal(false)
          resetForm()
        } else {
          toastError(result.error || 'Failed to update referral')
        }
      } else {
        const result = await createReferralClient(payload)
        if (result.success) {
          toastSuccess('Referral created successfully')
          loadReferrals()
          setShowCreateModal(false)
          resetForm()
        } else {
          toastError(result.error || 'Failed to create referral')
        }
      }
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleDelete = async () => {
    if (!deleteReferral) return

    setDeleting(true)
    try {
      const result = await deleteReferralClient(deleteReferral.id)
      if (result.success) {
        toastSuccess('Referral deleted successfully')
        loadReferrals()
        setDeleteReferral(null)
      } else {
        toastError(result.error || 'Failed to delete referral')
      }
    } catch (error: unknown) {
      toastError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Referral Clients</h2>
          <p className="text-muted-foreground">Manage your referral partners and clients</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Referral
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading referrals...</div>
      ) : referrals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <UserPlus className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No referral clients yet</p>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Referral
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {referrals.map((referral) => (
            <Card key={referral.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
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
                      <span className="truncate">{referral.email}</span>
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
                <div className="flex flex-wrap gap-2 mt-4">
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
                    onClick={() => setDeleteReferral(referral)}
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
        <DialogContent className="glass-dialog max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedReferral ? 'Edit Referral Client' : 'Add Referral Client'}</DialogTitle>
            <DialogDescription>
              {selectedReferral
                ? 'Update the referral client details'
                : 'Add a new referral partner or client'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Company or contact name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company_name">Company Name</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
                placeholder="Company name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_person">Contact Person</Label>
              <Input
                id="contact_person"
                value={formData.contact_person}
                onChange={(e) => setFormData((prev) => ({ ...prev, contact_person: e.target.value }))}
                placeholder="Primary contact"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="commission_rate">Commission Rate (%)</Label>
              <Input
                id="commission_rate"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={formData.commission_rate}
                onChange={(e) => setFormData((prev) => ({ ...prev, commission_rate: e.target.value }))}
                placeholder="e.g. 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
              />
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
              <Button type="submit">
                {selectedReferral ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <DeleteConfirmationDialog
        isOpen={deleteReferral !== null}
        onClose={() => setDeleteReferral(null)}
        onConfirm={handleDelete}
        itemName={deleteReferral?.name || ''}
        isLoading={deleting}
      />
    </div>
  )
}
