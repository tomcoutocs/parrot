"use client"

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Merge, Mail, Phone, User } from 'lucide-react'
import { findDuplicateLeads, mergeLeads, type Lead } from '@/lib/database-functions'
import { toastSuccess, toastError } from '@/lib/toast'

interface MergeDuplicatesModalProps {
  isOpen: boolean
  onClose: () => void
  spaceId?: string | null
  onMerged?: () => void
}

export function MergeDuplicatesModal({
  isOpen,
  onClose,
  spaceId,
  onMerged,
}: MergeDuplicatesModalProps) {
  const [loading, setLoading] = useState(true)
  const [merging, setMerging] = useState(false)
  const [duplicates, setDuplicates] = useState<
    Array<{ key: string; keyType: 'email' | 'phone'; leads: Lead[] }>
  >([])

  useEffect(() => {
    if (!isOpen || !spaceId) {
      setLoading(false)
      return
    }
    setLoading(true)
    findDuplicateLeads(spaceId).then((result) => {
      if (result.success && result.duplicates) {
        setDuplicates(result.duplicates)
      } else {
        setDuplicates([])
      }
      setLoading(false)
    })
  }, [isOpen, spaceId])

  const handleMerge = async (primary: Lead, secondary: Lead) => {
    setMerging(true)
    try {
      const result = await mergeLeads(primary.id, secondary.id)
      if (result.success) {
        toastSuccess('Contacts merged successfully')
        onMerged?.()
        setDuplicates((prev) =>
          prev
            .map((d) => ({
              ...d,
              leads: d.leads.filter((l) => l.id !== secondary.id),
            }))
            .filter((d) => d.leads.length > 1)
        )
      } else {
        toastError(result.error || 'Failed to merge')
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to merge')
    } finally {
      setMerging(false)
    }
  }

  const getLeadDisplay = (lead: Lead) => {
    const name = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || 'Unknown'
    return { name, email: lead.email, phone: lead.phone }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5" />
            Merge Duplicate Contacts
          </DialogTitle>
          <DialogDescription>
            Find and merge duplicate contacts by email or phone. Merging keeps the primary contact
            and combines data from the duplicate.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : duplicates.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">No duplicates found</p>
            <p className="text-sm mt-1">Your contacts look clean. Check back after adding more.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {duplicates.map((dup, idx) => (
              <div
                key={`${dup.keyType}-${dup.key}-${idx}`}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center gap-2">
                  {dup.keyType === 'email' ? (
                    <Mail className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-sm">
                    Duplicate by {dup.keyType}: {dup.key}
                  </span>
                  <Badge variant="secondary">{dup.leads.length} contacts</Badge>
                </div>
                <div className="space-y-2">
                  {dup.leads.map((lead) => {
                    const { name, email, phone } = getLeadDisplay(lead)
                    return (
                      <div
                        key={lead.id}
                        className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{name}</p>
                          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                            {email && <span>{email}</span>}
                            {phone && <span>{phone}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {dup.leads
                            .filter((l) => l.id !== lead.id)
                            .map((other) => {
                              const otherDisplay = getLeadDisplay(other)
                              return (
                                <Button
                                  key={other.id}
                                  size="sm"
                                  variant="outline"
                                  disabled={merging}
                                  onClick={() => handleMerge(lead, other)}
                                  title={`Merge ${otherDisplay.name} into ${name}`}
                                >
                                  {merging ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Merge className="w-3 h-3 mr-1" />
                                      Merge into {name}
                                    </>
                                  )}
                                </Button>
                              )
                            })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
