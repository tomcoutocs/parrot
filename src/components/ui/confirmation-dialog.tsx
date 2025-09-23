'use client'

import React from 'react'
import { AlertTriangle, Trash2, Save, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  variant?: 'default' | 'destructive' | 'warning'
  icon?: React.ReactNode
  isLoading?: boolean
}

export function ConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'default',
  icon,
  isLoading = false
}: ConfirmationDialogProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return {
          icon: <Trash2 className="h-6 w-6 text-red-600" />,
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          alertVariant: 'destructive' as const
        }
      case 'warning':
        return {
          icon: <AlertTriangle className="h-6 w-6 text-yellow-600" />,
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          alertVariant: 'default' as const
        }
      default:
        return {
          icon: <Save className="h-6 w-6 text-blue-600" />,
          confirmButton: 'parrot-button-primary',
          alertVariant: 'default' as const
        }
    }
  }

  const styles = getVariantStyles()
  const displayIcon = icon || styles.icon

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="parrot-card-enhanced max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              {displayIcon}
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-gray-600">{description}</p>
          
          {variant === 'warning' && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This action cannot be undone. Please make sure you want to proceed.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            className={styles.confirmButton}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Specialized confirmation dialogs for common actions
export function DeleteConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isLoading = false
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  itemName: string
  isLoading?: boolean
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Delete Item"
      description={`Are you sure you want to delete "${itemName}"? This action cannot be undone.`}
      confirmText="Delete"
      variant="destructive"
      isLoading={isLoading}
    />
  )
}

export function SaveConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  title = "Save Changes",
  description = "Are you sure you want to save these changes?",
  isLoading = false
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title?: string
  description?: string
  isLoading?: boolean
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title={title}
      description={description}
      confirmText="Save"
      variant="default"
      isLoading={isLoading}
    />
  )
}

export function LogoutConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  isLoading?: boolean
}) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      onClose={onClose}
      onConfirm={onConfirm}
      title="Sign Out"
      description="Are you sure you want to sign out? You'll need to sign in again to access your account."
      confirmText="Sign Out"
      variant="warning"
      icon={<LogOut className="h-6 w-6 text-yellow-600" />}
      isLoading={isLoading}
    />
  )
}

// Hook for managing confirmation dialog state
export function useConfirmationDialog() {
  const [isOpen, setIsOpen] = React.useState(false)
  const [config, setConfig] = React.useState<Partial<ConfirmationDialogProps>>({})

  const openDialog = (dialogConfig: Partial<ConfirmationDialogProps>) => {
    setConfig(dialogConfig)
    setIsOpen(true)
  }

  const closeDialog = () => {
    setIsOpen(false)
    setConfig({})
  }

  const confirm = () => {
    if (config.onConfirm) {
      config.onConfirm()
    }
    closeDialog()
  }

  return {
    isOpen,
    config,
    openDialog,
    closeDialog,
    confirm
  }
}
