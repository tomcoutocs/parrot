"use client"

import { X, User, Calendar as CalendarIcon, Flag, Trash2 } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface BulkEditBarProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkUpdate: (updates: Record<string, unknown>) => void
  onBulkDelete: () => void
  users?: Array<{ id: string; full_name: string; email: string; profile_picture?: string | null }>
}

// Helper function to get initials from name
function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const priorityLevels = [
  { id: "urgent", label: "Urgent", color: "text-red-600", dotColor: "bg-red-500" },
  { id: "high", label: "High", color: "text-orange-600", dotColor: "bg-orange-500" },
  { id: "normal", label: "Normal", color: "text-muted-foreground", dotColor: "bg-gray-400" },
  { id: "low", label: "Low", color: "text-blue-600", dotColor: "bg-blue-500" },
]

export function BulkEditBar({ selectedCount, onClearSelection, onBulkUpdate, onBulkDelete, users = [] }: BulkEditBarProps) {
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, "MM/dd/yy")
      onBulkUpdate({ dueDate: formatted })
    }
  }

  return (
    <div 
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 border rounded-xl px-4 py-2.5 flex items-center gap-3"
      style={{
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        background: 'rgba(255, 255, 255, 0.72)',
        borderColor: 'rgba(0, 0, 0, 0.06)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.5) inset',
      }}
    >
      {/* Selection Count with Close Button */}
      <div className="flex items-center gap-2 pr-3 border-r border-black/10">
        <button
          onClick={onClearSelection}
          className="p-0.5 hover:bg-muted/50 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        <span className="text-sm text-muted-foreground">
          {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Bulk Actions */}
      <div className="flex items-center gap-1">
        {/* Assign */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors">
              <User className="w-4 h-4" />
              <span>Assign</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onBulkUpdate({ assignee: "" })}>
              <span className="text-muted-foreground">Unassigned</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => onBulkUpdate({ assignee: user.id })}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={user.profile_picture || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                  <span>{user.full_name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Due Date */}
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors">
              <CalendarIcon className="w-4 h-4" />
              <span>Due Date</span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="border-t p-2 flex gap-2">
              <button
                onClick={() => onBulkUpdate({ dueDate: "" })}
                className="flex-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  const today = format(new Date(), "MM/dd/yy")
                  onBulkUpdate({ dueDate: today })
                }}
                className="flex-1 text-sm text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                Today
              </button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Priority */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted/50 rounded-lg transition-colors">
              <Flag className="w-4 h-4" />
              <span>Priority</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {priorityLevels.map((priority) => (
              <DropdownMenuItem
                key={priority.id}
                onClick={() => onBulkUpdate({ priority: priority.label })}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${priority.dotColor}`} />
                  <span className={priority.color}>{priority.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Delete */}
        <button
          onClick={onBulkDelete}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors ml-1"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  )
}

