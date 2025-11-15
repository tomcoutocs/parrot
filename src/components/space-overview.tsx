"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface SpaceOverviewProps {
  manager?: {
    name: string
    avatar?: string
  }
  startDate?: string
  services?: string[]
}

export function SpaceOverview({ 
  manager, 
  startDate, 
  services = []
}: SpaceOverviewProps) {
  const currentManager = manager || {
    name: "No Manager",
    avatar: undefined
  }

  return (
    <div className="border-b border-border/50 pb-3">
      <div className="flex items-center justify-between gap-8">
        {/* Account Manager */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="text-xs text-muted-foreground flex-shrink-0">Manager</div>
          <div className="flex items-center gap-2">
            <Avatar className="w-6 h-6 flex-shrink-0">
              <AvatarImage src={currentManager.avatar} />
              <AvatarFallback className="bg-muted text-xs">
                {currentManager.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{currentManager.name}</span>
          </div>
        </div>

        {/* Start Date */}
        {startDate && (
          <div className="flex items-center gap-2.5 flex-shrink-0">
            <div className="text-xs text-muted-foreground">Started</div>
            <span className="text-sm">{startDate}</span>
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="text-xs text-muted-foreground flex-shrink-0">Services</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {services.map((service) => (
                <span
                  key={service}
                  className="text-xs px-3 py-1 bg-muted rounded-md text-foreground font-medium"
                >
                  {service}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

