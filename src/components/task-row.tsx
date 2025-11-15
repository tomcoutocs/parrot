"use client"

import { Check, ChevronRight, MoreHorizontal, Calendar as CalendarIcon, Trash2, MessageSquare, Plus, Copy, CheckSquare } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useState } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format, differenceInDays } from "date-fns"

interface Task {
  id: string
  name: string
  assignee: string
  dueDate: string
  priority: string
  subtasks?: number
  completed?: boolean
}

interface TaskRowProps {
  task: Task
  isSelected: boolean
  onToggleSelect: (taskId: string) => void
  onUpdate: (taskId: string, updates: Partial<Task>) => void
  onDelete: (taskId: string) => void
  showMultiSelect: boolean
  selectedTasks: string[]
  onTaskClick?: (taskId: string) => void
}

const teamMembers = [
  { id: "NF", name: "Nicolas Figari", avatar: "" },
  { id: "SC", name: "Sarah Chen", avatar: "" },
  { id: "AR", name: "Alex Rivera", avatar: "" },
  { id: "EW", name: "Emma Wilson", avatar: "" },
]

const priorityLevels = [
  { id: "urgent", label: "Urgent", color: "text-red-600", dotColor: "bg-red-500" },
  { id: "high", label: "High", color: "text-orange-600", dotColor: "bg-orange-500" },
  { id: "normal", label: "Normal", color: "text-muted-foreground", dotColor: "bg-gray-400" },
  { id: "low", label: "Low", color: "text-blue-600", dotColor: "bg-blue-500" },
]

function getDueDateStatus(dueDate: string) {
  if (!dueDate) return null
  
  try {
    // Parse date in format MM/DD/YY
    const [month, day, year] = dueDate.split("/")
    const fullYear = `20${year}`
    const dateObj = new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const daysUntilDue = differenceInDays(dateObj, today)
    
    if (daysUntilDue < 0) {
      return { status: "overdue", color: "text-red-600", dotColor: "bg-red-500" }
    } else if (daysUntilDue <= 3) {
      return { status: "urgent", color: "text-orange-600", dotColor: "bg-orange-500" }
    } else if (daysUntilDue <= 7) {
      return { status: "soon", color: "text-yellow-600", dotColor: "bg-yellow-500" }
    }
    return { status: "normal", color: "text-foreground", dotColor: null }
  } catch (e) {
    return { status: "normal", color: "text-foreground", dotColor: null }
  }
}

export function TaskRow({ task, isSelected, onToggleSelect, onUpdate, onDelete, showMultiSelect, selectedTasks, onTaskClick }: TaskRowProps) {
  const [isEditingName, setIsEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(task.name)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false)

  const dueDateStatus = getDueDateStatus(task.dueDate)
  const currentPriority = priorityLevels.find(p => p.label.toLowerCase() === task.priority.toLowerCase()) || priorityLevels[2]

  const handleNameSave = () => {
    if (nameValue.trim() && nameValue !== task.name) {
      onUpdate(task.id, { name: nameValue.trim() })
    }
    setIsEditingName(false)
  }

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const formatted = format(date, "MM/dd/yy")
      onUpdate(task.id, { dueDate: formatted })
    }
    setIsDatePickerOpen(false)
  }

  const parseDateForCalendar = (dateStr: string): Date | undefined => {
    if (!dateStr) return undefined
    try {
      const [month, day, year] = dateStr.split("/")
      const fullYear = `20${year}`
      return new Date(`${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    } catch (e) {
      return undefined
    }
  }

  return (
    <div 
      className={`grid grid-cols-12 gap-4 px-12 py-2.5 hover:bg-muted/50 transition-colors items-center group rounded-md ${
        isSelected ? "bg-muted/70" : ""
      }`}
    >
      {/* Name Column with left-side controls */}
      <div className="col-span-5 flex items-center gap-2 -ml-8">
        {/* Drag Handle - hidden until hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <div className="flex flex-col gap-0.5 cursor-move p-1">
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
            </div>
            <div className="flex gap-0.5">
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
              <div className="w-0.5 h-0.5 rounded-full bg-muted-foreground/50" />
            </div>
          </div>
        </div>

        {/* Multi-select checkbox - hidden until hover or selection mode active */}
        <button 
          className={`relative w-4 h-4 rounded border-2 transition-all flex items-center justify-center flex-shrink-0 ${
            selectedTasks.length > 0
              ? "opacity-100" 
              : "opacity-0 group-hover:opacity-100"
          } ${
            isSelected 
              ? "border-foreground bg-foreground" 
              : "border-border hover:border-muted-foreground"
          }`}
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(task.id)
          }}
        >
          {isSelected && (
            <Check className="w-3 h-3 text-background stroke-[3]" />
          )}
        </button>

        {/* Chevron for expand */}
        <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
        
        {/* Radio button (always visible) */}
        <button 
          className="relative w-4 h-4 rounded-full border-2 border-border hover:border-muted-foreground transition-all flex items-center justify-center flex-shrink-0 group/check"
          onClick={() => onToggleSelect(task.id)}
        >
          {isSelected && (
            <div className="w-2 h-2 rounded-full bg-foreground" />
          )}
        </button>

        {/* Task Name - Editable */}
        {isEditingName ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleNameSave()
              if (e.key === "Escape") {
                setNameValue(task.name)
                setIsEditingName(false)
              }
            }}
            className="flex-1 bg-transparent border-none outline-none text-sm"
            autoFocus
          />
        ) : (
          <span 
            className="text-sm cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded -ml-1"
            onClick={(e) => {
              e.stopPropagation()
              if (onTaskClick) {
                onTaskClick(task.id)
              } else {
                setIsEditingName(true)
              }
            }}
            onDoubleClick={() => setIsEditingName(true)}
          >
            {task.name}
          </span>
        )}
        
        {task.subtasks && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            <CheckSquare className="w-3 h-3" />
            <span>{task.subtasks}</span>
          </div>
        )}
      </div>

      {/* Assignee Column - Editable */}
      <div className="col-span-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            {task.assignee ? (
              <button className="hover:opacity-80 transition-opacity">
                <Avatar className="w-6 h-6 border border-border">
                  <AvatarImage src="" />
                  <AvatarFallback className="bg-muted text-xs">
                    {task.assignee}
                  </AvatarFallback>
                </Avatar>
              </button>
            ) : (
              <button className="w-6 h-6 rounded-full border border-dashed border-border hover:border-muted-foreground opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <Plus className="w-3 h-3 text-muted-foreground" />
              </button>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => onUpdate(task.id, { assignee: "" })}>
              <span className="text-muted-foreground">Unassigned</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {teamMembers.map((member) => (
              <DropdownMenuItem
                key={member.id}
                onClick={() => onUpdate(task.id, { assignee: member.id })}
              >
                <div className="flex items-center gap-2">
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={member.avatar} />
                    <AvatarFallback className="text-xs">{member.id}</AvatarFallback>
                  </Avatar>
                  <span>{member.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Due Date Column - Editable with color indicators */}
      <div className="col-span-2">
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors -ml-2">
              <span className={`text-sm ${task.dueDate && task.dueDate !== "-" ? "text-red-600" : "text-muted-foreground"}`}>
                {task.dueDate || "-"}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={parseDateForCalendar(task.dueDate)}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="border-t p-2 flex gap-2">
              <button
                onClick={() => {
                  onUpdate(task.id, { dueDate: "" })
                  setIsDatePickerOpen(false)
                }}
                className="flex-1 text-sm text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => {
                  const today = format(new Date(), "MM/dd/yy")
                  onUpdate(task.id, { dueDate: today })
                  setIsDatePickerOpen(false)
                }}
                className="flex-1 text-sm text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
              >
                Today
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Priority Column - Editable with colors */}
      <div className="col-span-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 hover:bg-muted/50 px-2 py-1 rounded transition-colors -ml-2">
              <div className={`w-1.5 h-1.5 rounded-full ${currentPriority.dotColor}`} />
              <span className={`text-xs ${currentPriority.color}`}>
                {task.priority}
              </span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {priorityLevels.map((priority) => (
              <DropdownMenuItem
                key={priority.id}
                onClick={() => onUpdate(task.id, { priority: priority.label })}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${priority.dotColor}`} />
                  <span className={priority.color}>{priority.label}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Actions Column */}
      <div className="col-span-1 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-muted rounded transition-all">
              <MoreHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => console.log("Duplicate task")}>
              <Copy className="w-4 h-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(task.id)}
              className="text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

