"use client"

import { useState, useEffect } from "react"
import { User, Mail, Lock, Key, FileText, Building2, Calendar, Loader2, Sun, Moon, Monitor, Palette, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useSession } from "@/components/providers/session-provider"
import { useTheme } from "@/components/providers/theme-provider"
import { fetchUserFormSubmissions, fetchForms } from "@/lib/database-functions"
import { FormSubmission, Form } from "@/lib/supabase"
import { supabase } from "@/lib/supabase"
import { toastSuccess, toastError } from "@/lib/toast"

export default function UserSettingsTab() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [sendingResetLink, setSendingResetLink] = useState(false)
  const [userSubmissions, setUserSubmissions] = useState<FormSubmission[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [forms, setForms] = useState<Form[]>([])

  // Load user form submissions
  useEffect(() => {
    const loadUserSubmissions = async () => {
      if (!session?.user?.id) return
      
      setLoadingSubmissions(true)
      try {
        const submissions = await fetchUserFormSubmissions(session.user.id)
        setUserSubmissions(submissions)
        
        // Also load forms to get form titles
        const formsData = await fetchForms()
        setForms(formsData)
      } catch (error) {
        console.error('Error loading user submissions:', error)
      } finally {
        setLoadingSubmissions(false)
      }
    }
    
    loadUserSubmissions()
  }, [session?.user?.id])

  const handleSendPasswordReset = async () => {
    if (!session?.user?.email) {
      toastError('Email address not available')
      return
    }

    if (!supabase) {
      toastError('Database connection not available')
      return
    }

    setSendingResetLink(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(session.user.email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        throw error
      }

      toastSuccess('Password reset link sent', {
        description: 'Check your email for instructions to reset your password'
      })
    } catch (error) {
      console.error('Error sending password reset:', error)
      toastError('Failed to send reset link', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setSendingResetLink(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold">User Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences and security
        </p>
      </div>

      {/* Account Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" />
            Account Settings
          </CardTitle>
          <CardDescription>
            Manage your account preferences and security
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Email Address</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                {session?.user?.email || 'Not available'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <Label className="text-sm font-medium">Password</Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Change your password to keep your account secure
              </p>
            </div>
            <Button 
              onClick={handleSendPasswordReset}
              disabled={sendingResetLink}
              variant="outline"
              className="gap-2"
            >
              {sendingResetLink ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Send Reset Link
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="w-4 h-4" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize the appearance of your interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-sm font-medium mb-3 block">Theme</Label>
            <div className="flex gap-2">
              <Button
                variant={theme === 'light' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('light')}
                className="flex items-center gap-2"
              >
                <Sun className="h-4 w-4" />
                Light
              </Button>
              <Button
                variant={theme === 'dark' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('dark')}
                className="flex items-center gap-2"
              >
                <Moon className="h-4 w-4" />
                Dark
              </Button>
              <Button
                variant={theme === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme('system')}
                className="flex items-center gap-2"
              >
                <Monitor className="h-4 w-4" />
                System
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {theme === 'system' 
                ? 'Uses your system preference' 
                : `Currently using ${theme} theme`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* My Form Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            My Form Submissions
          </CardTitle>
          <CardDescription>
            View all forms you've submitted across all spaces
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingSubmissions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : userSubmissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>You haven't submitted any forms yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {userSubmissions.map((submission) => {
                const form = forms.find(f => f.id === submission.form_id)
                const submissionData = submission.submission_data as Record<string, unknown>
                const company = (submission as any).company as { id: string; name: string } | undefined
                
                return (
                  <div
                    key={submission.id}
                    className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">
                          {form?.title || 'Unknown Form'}
                        </h4>
                        {form?.description && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {form.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {submission.submitted_at
                          ? new Date(submission.submitted_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Unknown date'}
                      </div>
                    </div>
                    {company && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <Building2 className="w-3 h-3" />
                        <span>Submitted in: {company.name}</span>
                      </div>
                    )}
                    {submissionData && Object.keys(submissionData).length > 0 && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {Object.entries(submissionData).slice(0, 4).map(([key, value]) => (
                            <div key={key} className="truncate">
                              <span className="font-medium text-muted-foreground">{key}:</span>{' '}
                              <span className="text-foreground">
                                {typeof value === 'string' ? value : JSON.stringify(value)}
                              </span>
                            </div>
                          ))}
                        </div>
                        {Object.keys(submissionData).length > 4 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            +{Object.keys(submissionData).length - 4} more fields
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
