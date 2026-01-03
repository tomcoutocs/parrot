"use client"

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Loader2, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toastSuccess, toastError } from '@/lib/toast'
import type { Invoice } from '@/lib/invoicing-functions'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  invoice: Invoice | null
  onPaymentSuccess?: () => void
}

export function PaymentModal({ isOpen, onClose, invoice, onPaymentSuccess }: PaymentModalProps) {
  const [loading, setLoading] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'succeeded' | 'failed'>('idle')
  const [stripe, setStripe] = useState<any>(null)
  const [elements, setElements] = useState<any>(null)
  const [cardElement, setCardElement] = useState<any>(null)

  useEffect(() => {
    if (isOpen && invoice && !clientSecret) {
      initializePayment()
    }
  }, [isOpen, invoice])

  useEffect(() => {
    // Load Stripe.js
    if (isOpen && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
      const loadStripe = async () => {
        const stripeModule = await import('@stripe/stripe-js')
        const stripeInstance = await stripeModule.loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)
        if (stripeInstance) {
          setStripe(stripeInstance)
        }
      }
      loadStripe()
    }
  }, [isOpen])

  const initializePayment = async () => {
    if (!invoice) return

    setLoading(true)
    try {
      const response = await fetch('/api/payments/stripe/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId: invoice.id }),
      })

      const data = await response.json()
      if (data.success) {
        setClientSecret(data.clientSecret)
      } else {
        toastError(data.error || 'Failed to initialize payment')
      }
    } catch (error) {
      toastError('Failed to initialize payment')
    } finally {
      setLoading(false)
    }
  }

  const handlePayment = async () => {
    if (!stripe || !elements || !clientSecret) {
      toastError('Payment system not ready')
      return
    }

    setPaymentStatus('processing')

    try {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        },
      })

      if (error) {
        setPaymentStatus('failed')
        toastError(error.message || 'Payment failed')
      } else if (paymentIntent.status === 'succeeded') {
        setPaymentStatus('succeeded')
        toastSuccess('Payment successful!')
        setTimeout(() => {
          onPaymentSuccess?.()
          handleClose()
        }, 2000)
      }
    } catch (error) {
      setPaymentStatus('failed')
      toastError('Payment failed')
    }
  }

  const handleClose = () => {
    setClientSecret(null)
    setPaymentStatus('idle')
    setCardElement(null)
    onClose()
  }

  if (!invoice) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pay Invoice</DialogTitle>
          <DialogDescription>
            Invoice #{invoice.invoice_number} - {invoice.currency} {invoice.total_amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {paymentStatus === 'succeeded' && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Payment successful! Your invoice has been paid.
              </AlertDescription>
            </Alert>
          )}

          {paymentStatus === 'failed' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Payment failed. Please try again or contact support.
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {clientSecret && !loading && paymentStatus === 'idle' && (
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-2">Card Details</div>
                <div id="card-element" className="p-3 border rounded" />
                <p className="text-xs text-muted-foreground mt-2">
                  Your payment information is secure and encrypted
                </p>
              </div>

              {/* Payment Hold Transparency */}
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <div className="text-sm font-medium mb-1">Payment Processing</div>
                  <div className="text-xs text-muted-foreground">
                    Your payment will be processed immediately. If held for review, you'll be notified instantly with the reason.
                  </div>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handlePayment}
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  `Pay ${invoice.currency} ${invoice.total_amount.toFixed(2)}`
                )}
              </Button>
            </div>
          )}

          {!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

