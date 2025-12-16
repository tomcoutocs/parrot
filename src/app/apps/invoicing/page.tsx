"use client"

import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { DollarSign, ArrowLeft, Construction } from 'lucide-react'

export default function InvoicingPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-4xl mx-auto">
          <Button
            variant="ghost"
            onClick={() => router.push('/apps')}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Apps
          </Button>

          <Card className="text-center py-12">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <div className="p-4 rounded-full bg-orange-50 dark:bg-orange-950">
                  <DollarSign className="w-12 h-12 text-orange-600" />
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Construction className="w-5 h-5 text-muted-foreground" />
                <CardTitle className="text-3xl">Coming Soon</CardTitle>
              </div>
              <CardDescription className="text-lg">
                Invoicing & Billing App
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground max-w-md mx-auto">
                The Invoicing & Billing app is currently under development. This will allow you to create invoices, track payments, and manage all your billing needs.
              </p>
              <Button onClick={() => router.push('/apps')} className="mt-6">
                Return to App Selection
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

