"use client"

import { useState, useRef, useEffect } from "react"
import { User, Calendar as CalendarIcon, Flag, X, Check } from "lucide-react"
import { format } from "date-fns"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface UserOption {
  id: string
  full_name: string
}

interface InlineTaskCreationProps {
  onSave: (task: { name: string; assignee?: string; dueDate?: string; priority?: string; status?: string }) => void
  onCancel: () => void
  statusColor: string
  users?: UserOption[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const assignees = [
  { id: "NF", name: "Nicolas Figari", initials: "NF" },
  { id: "SC", name: "Sarah Chen", initials: "SC" },
  { id: "EW", name: "Emily Wilson", initials: "EW" },
]

const priorityOptions = [
  { id: "Low", label: "Low", dbValue: "low" },
  { id: "Normal", label: "Normal", dbValue: "normal" },
  { id: "High", label: "High", dbValue: "high" },
  { id: "Urgent", label: "Urgent", dbValue: "urgent" },
]

const statusLevels = [
  { id: "todo", label: "TO DO", color: "#6b7280", displayColor: "text-gray-600", dotColor: "bg-gray-500" },
  { id: "in_progress", label: "IN PROGRESS", color: "#8b5cf6", displayColor: "text-purple-600", dotColor: "bg-purple-500" },
  { id: "review", label: "REVIEW", color: "#f59e0b", displayColor: "text-yellow-600", dotColor: "bg-yellow-500" },
  { id: "done", label: "DONE", color: "#10b981", displayColor: "text-green-600", dotColor: "bg-green-500" },
]

export function InlineTaskCreation({ onSave, onCancel, statusColor, users = [] }: InlineTaskCreationProps) {
  const [taskName, setTaskName] = useState("")
  const [assignee, setAssignee] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [priority, setPriority] = useState<string>("Normal") // Display label
  // Determine initial status based on statusColor
  const getInitialStatus = () => {
    const statusMap: Record<string, string> = {
      "#6b7280": "todo",
      "#8b5cf6": "in_progress",
      "#f59e0b": "review",
      "#10b981": "done",
    }
    return statusMap[statusColor] || "todo"
  }
  const [status, setStatus] = useState<string>(getInitialStatus())
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const assigneeButtonRef = useRef<HTMLButtonElement>(null)
  const priorityButtonRef = useRef<HTMLButtonElement>(null)
  const dateInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSave = () => {
    if (taskName.trim()) {
      onSave({ name: taskName, assignee, dueDate, priority, status })
      setTaskName("")
      setAssignee(undefined)
      setDueDate(undefined)
      setPriority("Normal")
      setStatus(getInitialStatus())
    }
  }

  const currentStatus = statusLevels.find(s => s.id === status) || statusLevels[0]

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const selectedAssignee = users.find(u => u.id === assignee)

  return (
    <div className="grid grid-cols-12 gap-4 px-12 py-2.5 items-center border-b border-border/20">
      <div className="col-span-4 flex items-center gap-2 -ml-8">
        <div className="w-3 h-3" /> {/* Spacer for chevron */}
        <div 
          className="w-4 h-4 rounded-full border-2 flex-shrink-0"
          style={{ borderColor: statusColor }}
        />
        <input
          ref={inputRef}
          type="text"
          value={taskName}
          onChange={(e) => setTaskName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Task Name or type '/' for commands"
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="col-span-2 relative">
        <button
          ref={assigneeButtonRef}
          onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {selectedAssignee ? (
            <Avatar className="w-6 h-6 border border-border">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-xs">
                {getInitials(selectedAssignee.full_name)}
              </AvatarFallback>
            </Avatar>
          ) : (
            <>
              <User className="w-3.5 h-3.5" />
              <span>Assignee</span>
            </>
          )}
        </button>
        
        {showAssigneeMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowAssigneeMenu(false)}
            />
            <div 
              className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 py-1 min-w-[160px]"
            >
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setAssignee(user.id)
                    setShowAssigneeMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <Avatar className="w-5 h-5 border border-border">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-muted text-xs">
                      {getInitials(user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  {user.full_name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Status Column - Editable with dropdown */}
      <div className="col-span-2 relative">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors -ml-2">
              <div className={`w-1.5 h-1.5 rounded-full ${currentStatus.dotColor}`} />
              <span className={`text-xs font-medium ${currentStatus.displayColor}`}>
                {currentStatus.label}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {statusLevels.map((statusOption) => (
              <DropdownMenuItem
                key={statusOption.id}
                onClick={() => setStatus(statusOption.id)}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${statusOption.dotColor}`} />
                  <span className={statusOption.displayColor}>{statusOption.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="col-span-2 relative flex items-center justify-center">
        <input
          ref={dateInputRef}
          type="date"
          value={dueDate || ""}
          onChange={(e) => setDueDate(e.target.value)}
          className="sr-only"
        />
        {dueDate ? (
          <button
            onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {(() => {
              // Parse date correctly to avoid timezone shifts
              let date: Date
              if (dueDate.includes('-')) {
                // YYYY-MM-DD format - parse as local date
                const [year, month, day] = dueDate.split('-').map(Number)
                date = new Date(year, month - 1, day)
              } else {
                date = new Date(dueDate)
              }
              return format(date, "MM/dd/yy")
            })()}
          </button>
        ) : (
          <button
            onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.click()}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="col-span-1 relative">
        <button
          ref={priorityButtonRef}
          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {priority}
        </button>

        {showPriorityMenu && (
          <>
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setShowPriorityMenu(false)}
            />
            <div 
              className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 py-1 min-w-[120px]"
            >
              {priorityOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => {
                    setPriority(option.id)
                    setShowPriorityMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="col-span-1 flex items-center justify-end gap-1">
        <button
          onClick={onCancel}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded hover:bg-muted/50"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleSave}
          className="p-1.5 bg-foreground text-background hover:bg-foreground/90 rounded transition-colors"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

