"use client"

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { Grid3x3, HelpCircle, LogOut, User, ChevronDown, Shield } from 'lucide-react'
interface AppsLayoutHeaderProps {
  pageTitle: string
  pageIcon?: React.ComponentType<{ className?: string }>
  userProfilePicture: string | null
  userName: string
  showSystemAdmin?: boolean
  onSupportClick: () => void
  onUserSettingsClick: () => void
  onSignOut: () => void
}

export function AppsLayoutHeader({
  pageTitle,
  pageIcon: PageIcon,
  userProfilePicture,
  userName,
  showSystemAdmin,
  onSupportClick,
  onUserSettingsClick,
  onSignOut,
}: AppsLayoutHeaderProps) {
  const router = useRouter()

  return (
    <div className="sticky top-0 z-50 bg-background flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push('/apps')}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <Image
            src="/parrot-grad-main.png"
            alt="Parrot Logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain"
          />
          <h1 className="text-xl font-bold hidden sm:inline">Parrot Platform</h1>
        </button>
        <div className="h-6 w-px bg-border hidden sm:block" />
        <button
          onClick={() => router.push('/apps')}
          className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors min-h-[44px]"
        >
          <Grid3x3 className="w-4 h-4" />
          <span>Apps</span>
        </button>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          {PageIcon && <PageIcon className="w-4 h-4 text-muted-foreground" />}
          <h2 className="text-lg font-medium">{pageTitle}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <button
          onClick={onSupportClick}
          className="p-2 hover:bg-muted rounded-md transition-colors"
          title="Create Support Ticket"
        >
          <HelpCircle className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="w-px h-5 bg-border mx-1" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted px-2 py-1 -mx-2 rounded-md transition-colors">
              <Avatar className="w-7 h-7">
                <AvatarImage src={userProfilePicture || undefined} />
                <AvatarFallback className="bg-muted text-xs">
                  {userName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden sm:inline">{userName || 'User'}</span>
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={() => router.push('/apps')}
              className="flex items-center gap-2 cursor-pointer"
            >
              <Grid3x3 className="w-4 h-4" />
              <span>Back to Apps</span>
            </DropdownMenuItem>
            <div className="w-px h-px bg-border mx-2 my-1" />
            <DropdownMenuItem
              onClick={onUserSettingsClick}
              className="flex items-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>User Settings</span>
            </DropdownMenuItem>
            {showSystemAdmin ? (
              <>
                <div className="w-px h-px bg-border mx-2 my-1" />
                <DropdownMenuItem
                  onClick={() => router.push('/apps/system-admin')}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>System Admin</span>
                </DropdownMenuItem>
              </>
            ) : null}
            <div className="w-px h-px bg-border mx-2 my-1" />
            <DropdownMenuItem
              onClick={onSignOut}
              className="flex items-center gap-2 cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
