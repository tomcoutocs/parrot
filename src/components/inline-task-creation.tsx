"use client"

import { useState, useRef, useEffect } from "react"
import { User, Calendar as CalendarIcon, Flag } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface InlineTaskCreationProps {
  onSave: (task: { name: string; assignee?: string; dueDate?: string; priority?: string }) => void
  onCancel: () => void
  statusColor: string
}

const assignees = [
  { id: "NF", name: "Nicolas Figari", initials: "NF" },
  { id: "SC", name: "Sarah Chen", initials: "SC" },
  { id: "EW", name: "Emily Wilson", initials: "EW" },
]

const priorityOptions = [
  { id: "High", label: "High" },
  { id: "Normal", label: "Normal" },
  { id: "Low", label: "Low" },
]

export function InlineTaskCreation({ onSave, onCancel, statusColor }: InlineTaskCreationProps) {
  const [taskName, setTaskName] = useState("")
  const [assignee, setAssignee] = useState<string | undefined>(undefined)
  const [dueDate, setDueDate] = useState<string | undefined>(undefined)
  const [priority, setPriority] = useState<string>("Normal")
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSave = () => {
    if (taskName.trim()) {
      onSave({ name: taskName, assignee, dueDate, priority })
      setTaskName("")
      setAssignee(undefined)
      setDueDate(undefined)
      setPriority("Normal")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  const selectedAssignee = assignees.find(a => a.id === assignee)

  return (
    <div className="grid grid-cols-12 gap-4 px-12 py-2.5 items-center border-b border-border/20">
      <div className="col-span-5 flex items-center gap-3">
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
          onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {selectedAssignee ? (
            <Avatar className="w-6 h-6 border border-border">
              <AvatarImage src="" />
              <AvatarFallback className="bg-muted text-xs">
                {selectedAssignee.initials}
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
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 py-1 min-w-[160px]">
              {assignees.map((person) => (
                <button
                  key={person.id}
                  onClick={() => {
                    setAssignee(person.id)
                    setShowAssigneeMenu(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <Avatar className="w-5 h-5 border border-border">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-muted text-xs">
                      {person.initials}
                    </AvatarFallback>
                  </Avatar>
                  {person.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="col-span-2">
        <input
          type="date"
          value={dueDate || ""}
          onChange={(e) => setDueDate(e.target.value)}
          className="bg-transparent text-sm outline-none text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        />
      </div>

      <div className="col-span-2 relative">
        <button
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
            <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-md shadow-lg z-20 py-1 min-w-[120px]">
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

      <div className="col-span-1 flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="text-xs bg-foreground text-background hover:bg-foreground/90 px-3 py-1 rounded transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  )
}

