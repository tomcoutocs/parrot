/**
 * Toast utility functions for consistent notification handling
 * Uses sonner for toast notifications throughout the app
 */

import { toast as sonnerToast } from 'sonner'

export interface ToastOptions {
  duration?: number
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

/**
 * Show a success toast notification
 */
export function toastSuccess(
  message: string,
  options?: ToastOptions
) {
  return sonnerToast.success(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  })
}

/**
 * Show an error toast notification
 */
export function toastError(
  message: string,
  options?: ToastOptions
) {
  return sonnerToast.error(message, {
    description: options?.description,
    duration: options?.duration ?? 5000,
    action: options?.action,
  })
}

/**
 * Show an info toast notification
 */
export function toastInfo(
  message: string,
  options?: ToastOptions
) {
  return sonnerToast.info(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  })
}

/**
 * Show a warning toast notification
 */
export function toastWarning(
  message: string,
  options?: ToastOptions
) {
  return sonnerToast.warning(message, {
    description: options?.description,
    duration: options?.duration ?? 4000,
    action: options?.action,
  })
}

/**
 * Show a loading toast notification (returns a function to update/dismiss)
 */
export function toastLoading(message: string) {
  return sonnerToast.loading(message)
}

/**
 * Promise-based toast - automatically shows loading, then success/error
 */
export function toastPromise<T>(
  promise: Promise<T>,
  {
    loading,
    success,
    error,
  }: {
    loading: string
    success: string | ((data: T) => string)
    error: string | ((error: unknown) => string)
  }
) {
  return sonnerToast.promise(promise, {
    loading,
    success,
    error,
  })
}

// Re-export toast for advanced usage
export { sonnerToast as toast }

