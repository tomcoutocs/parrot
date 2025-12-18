"use client"

import { useState, useEffect } from "react"
import { User, Mail, Lock, Key, Loader2, Sun, Moon, Monitor, Palette, Camera, X, Plug, CheckCircle2, XCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useSession } from "@/components/providers/session-provider"
import { useTheme } from "@/components/providers/theme-provider"
import { uploadProfilePicture } from "@/lib/database-functions"
import { supabase } from "@/lib/supabase"
import { toastSuccess, toastError } from "@/lib/toast"
import { ProfilePictureCropModal } from "@/components/modals/profile-picture-crop-modal"

export default function UserSettingsTab() {
  const { data: session } = useSession()
  const { theme, setTheme } = useTheme()
  const [sendingResetLink, setSendingResetLink] = useState(false)
  const [profilePicture, setProfilePicture] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const [showCropModal, setShowCropModal] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [integrations, setIntegrations] = useState<Array<{ id: string; name: string; description: string; connected: boolean; icon?: string }>>([])
  const [loadingIntegrations, setLoadingIntegrations] = useState(false)

  // Load user profile picture
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!session?.user?.id || !supabase) return
      
      try {
        const { data, error } = await supabase
          .from('users')
          .select('profile_picture')
          .eq('id', session.user.id)
          .single()
        
        if (!error && data?.profile_picture) {
          setProfilePicture(data.profile_picture)
        }
      } catch (error) {
        console.error('Error loading user profile:', error)
      }
    }
    
    loadUserProfile()
  }, [session?.user?.id])

  // Load integrations
  useEffect(() => {
    const loadIntegrations = async () => {
      if (!session?.user?.id) return
      
      setLoadingIntegrations(true)
      try {
        // Mock integrations for now - can be replaced with actual API call
        const mockIntegrations = [
          { id: 'google', name: 'Google', description: 'Connect your Google account', connected: false },
          { id: 'github', name: 'GitHub', description: 'Connect your GitHub account', connected: false },
          { id: 'slack', name: 'Slack', description: 'Connect your Slack workspace', connected: false },
          { id: 'microsoft', name: 'Microsoft', description: 'Connect your Microsoft account', connected: false },
        ]
        setIntegrations(mockIntegrations)
      } catch (error) {
        console.error('Error loading integrations:', error)
      } finally {
        setLoadingIntegrations(false)
      }
    }
    
    loadIntegrations()
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

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !session?.user?.id) return

    // Validate file type
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!validImageTypes.includes(file.type)) {
      toastError('Invalid file type', {
        description: 'Please upload a JPEG, PNG, GIF, or WebP image.'
      })
      return
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      toastError('File too large', {
        description: 'Please upload an image smaller than 5MB.'
      })
      return
    }

    // Show crop modal with the selected file
    setSelectedImageFile(file)
    setShowCropModal(true)
    
    // Reset file input
    if (event.target) {
      event.target.value = ''
    }
  }

  const handleCropComplete = async (croppedFile: File) => {
    if (!session?.user?.id) return

    setUploadingPicture(true)
    try {
      const result = await uploadProfilePicture(session.user.id, croppedFile)
      
      if (result.success && result.url) {
        // Add cache-busting parameter to ensure fresh image
        const urlWithCacheBust = `${result.url}${result.url.includes('?') ? '&' : '?'}t=${Date.now()}`
        setProfilePicture(urlWithCacheBust)
        toastSuccess('Profile picture updated successfully')
        
        // Dispatch custom event to notify other components to refresh profile picture
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
          detail: { userId: session.user.id, url: urlWithCacheBust } 
        }))
      } else {
        throw new Error(result.error || 'Failed to upload profile picture')
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error)
      toastError('Failed to upload profile picture', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setUploadingPicture(false)
      setSelectedImageFile(null)
    }
  }

  const handleRemoveProfilePicture = async () => {
    if (!session?.user?.id || !supabase) return

    setUploadingPicture(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ profile_picture: null })
        .eq('id', session.user.id)

      if (error) {
        throw error
      }

      setProfilePicture(null)
      toastSuccess('Profile picture removed')
    } catch (error) {
      console.error('Error removing profile picture:', error)
      toastError('Failed to remove profile picture', {
        description: error instanceof Error ? error.message : 'Please try again'
      })
    } finally {
      setUploadingPicture(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <User className="w-6 h-6 text-foreground" />
        <h1 className="text-2xl font-semibold text-foreground">User Settings</h1>
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
          {/* Profile Picture Section */}
          <div className="flex items-center gap-4 p-4 border rounded-lg">
            <div className="relative">
              <Avatar className="w-20 h-20">
                <AvatarImage src={profilePicture || undefined} />
                <AvatarFallback className="bg-muted text-lg">
                  {session?.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || "U"}
                </AvatarFallback>
              </Avatar>
              {uploadingPicture && (
                <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-full">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-sm font-medium">Profile Picture</Label>
              <p className="text-xs text-muted-foreground">
                Upload a JPEG, PNG, GIF, or WebP image (max 5MB)
              </p>
              <div className="flex gap-2">
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleProfilePictureChange}
                  disabled={uploadingPicture}
                  className="hidden"
                  id="profile-picture-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('profile-picture-input')?.click()}
                  disabled={uploadingPicture}
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  {profilePicture ? 'Change Picture' : 'Upload Picture'}
                </Button>
                {profilePicture && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveProfilePicture}
                    disabled={uploadingPicture}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

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

      {/* Integrations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Plug className="w-4 h-4" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect your accounts and services to enhance your experience
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingIntegrations ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plug className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No integrations available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      integration.connected 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30' 
                        : 'bg-muted'
                    }`}>
                      <Plug className={`w-5 h-5 ${
                        integration.connected 
                          ? 'text-emerald-600 dark:text-emerald-400' 
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">{integration.name}</h4>
                        {integration.connected ? (
                          <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Connected
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {integration.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={integration.connected ? "outline" : "default"}
                    size="sm"
                    onClick={() => {
                      // Toggle integration connection
                      setIntegrations(prev => 
                        prev.map(integ => 
                          integ.id === integration.id 
                            ? { ...integ, connected: !integ.connected }
                            : integ
                        )
                      )
                      toastSuccess(
                        integration.connected 
                          ? `${integration.name} disconnected` 
                          : `${integration.name} connected`
                      )
                    }}
                    className="gap-2"
                  >
                    {integration.connected ? (
                      <>
                        <XCircle className="w-4 h-4" />
                        Disconnect
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-4 h-4" />
                        Connect
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Picture Crop Modal */}
      <ProfilePictureCropModal
        open={showCropModal}
        onOpenChange={setShowCropModal}
        imageFile={selectedImageFile}
        onCropComplete={handleCropComplete}
      />
    </div>
  )
}
