"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/session-provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Shield, Grid3x3, ArrowRight } from 'lucide-react'
import { hasSystemAdminPrivileges } from '@/lib/role-helpers'
import Image from 'next/image'

export default function SystemAdminChoicePage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status !== 'loading' && !session) {
      router.push('/auth/signin')
      return
    }

    // Check if user is system admin
    if (session && !hasSystemAdminPrivileges(session.user.role)) {
      router.push('/apps') // Redirect non-system-admins to regular apps
      return
    }
  }, [session, status, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-red-600"></div>
      </div>
    )
  }

  if (!session || !hasSystemAdminPrivileges(session.user.role)) {
    return null // Should already be redirected
  }

  const handlePlatformClick = () => {
    router.push('/apps')
  }

  const handleSystemAdminClick = () => {
    router.push('/apps/system-admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center space-y-4">
          <Image
            src="/parrot-grad-main.png"
            alt="Parrot Logo"
            width={150}
            height={150}
            className="mx-auto h-24 w-24 object-contain"
          />
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome, {session.user.name}
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose where you'd like to go
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Platform Access Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-primary/50" onClick={handlePlatformClick}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Grid3x3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-xl">Platform Access</CardTitle>
              </div>
              <CardDescription>
                Access all platform applications including CRM, Analytics, Invoicing, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Go to Platform
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* System Admin Access Card */}
          <Card className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-red-500/50" onClick={handleSystemAdminClick}>
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                  <Shield className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-xl">System Admin</CardTitle>
              </div>
              <CardDescription>
                Manage system-wide settings, monitor system health, and handle support tickets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline">
                Go to System Admin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

