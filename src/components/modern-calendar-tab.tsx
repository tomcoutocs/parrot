"use client"

import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useSession } from "@/components/providers/session-provider"

interface BrandEvent {
  id: string
  title: string
  startDate: Date
  endDate: Date
  type: "launch" | "sale" | "event" | "deadline"
  color: string
}

interface ModernCalendarTabProps {
  activeSpace?: string | null
}

// Map event types to colors
const eventTypeColors: Record<string, string> = {
  launch: "#8b5cf6",
  sale: "#ef4444",
  event: "#3b82f6",
  deadline: "#f59e0b",
  default: "#10b981"
}

// Infer event type from title (simple heuristic)
function inferEventType(title: string): "launch" | "sale" | "event" | "deadline" {
  const lower = title.toLowerCase()
  if (lower.includes("launch")) return "launch"
  if (lower.includes("sale") || lower.includes("black friday") || lower.includes("promotion")) return "sale"
  if (lower.includes("deadline") || lower.includes("due")) return "deadline"
  return "event"
}

export function ModernCalendarTab({ activeSpace }: ModernCalendarTabProps) {
  const { data: session } = useSession()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false)
  const [events, setEvents] = useState<BrandEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEvents = async () => {
      if (!activeSpace && !session?.user?.company_id) {
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const companyId = activeSpace || session?.user?.company_id
        if (!companyId || !supabase) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('company_events')
          .select('*')
          .eq('company_id', companyId)
          .order('start_date', { ascending: true })

        if (error) {
          console.error("Error loading events:", error)
          setLoading(false)
          return
        }

        // Transform database events to BrandEvent format
        const transformedEvents: BrandEvent[] = (data || []).map((event) => {
          const eventType = inferEventType(event.title || "")
          return {
            id: event.id,
            title: event.title || "Untitled Event",
            startDate: new Date(event.start_date),
            endDate: event.end_date ? new Date(event.end_date) : new Date(event.start_date),
            type: eventType,
            color: eventTypeColors[eventType] || eventTypeColors.default
          }
        })

        setEvents(transformedEvents)
      } catch (error) {
        console.error("Error loading calendar events:", error)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
  }, [activeSpace, session?.user?.company_id])


  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (number | null)[] = []
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // Add the days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i)
    }
    
    return days
  }

  const getEventsForDay = (day: number) => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const date = new Date(year, month, day)
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      
      eventStart.setHours(0, 0, 0, 0)
      eventEnd.setHours(0, 0, 0, 0)
      date.setHours(0, 0, 0, 0)
      
      return date >= eventStart && date <= eventEnd
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const days = getDaysInMonth(currentDate)
  const isToday = (day: number | null) => {
    if (day === null) return false
    const today = new Date()
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    )
  }

  const upcomingEvents = events
    .filter(event => event.startDate >= new Date())
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
    .slice(0, 5)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h2>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateEventOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-foreground bg-muted hover:bg-muted/80 rounded-md transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Event
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={previousMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="col-span-2">
          <div className="border border-border/60 rounded-lg overflow-hidden">
            {/* Days of week header */}
            <div className="grid grid-cols-7 bg-muted/20 border-b border-border/40">
              {daysOfWeek.map(day => (
                <div key={day} className="px-2 py-3 text-center text-xs text-muted-foreground">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7">
              {days.map((day, index) => {
                const dayEvents = day ? getEventsForDay(day) : []
                return (
                  <div
                    key={index}
                    className={`min-h-24 p-2 border-r border-b border-border/40 last:border-r-0 ${
                      index >= days.length - 7 ? "border-b-0" : ""
                    } ${day === null ? "bg-muted/10" : "bg-background hover:bg-muted/20"} transition-colors`}
                  >
                    {day !== null && (
                      <div className="h-full flex flex-col">
                        <div className={`text-sm mb-1 ${
                          isToday(day) 
                            ? "w-6 h-6 rounded-full bg-foreground text-background flex items-center justify-center" 
                            : "text-foreground"
                        }`}>
                          {day}
                        </div>
                        <div className="space-y-1 flex-1 overflow-hidden">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className="text-xs px-1.5 py-0.5 rounded truncate"
                              style={{
                                backgroundColor: `${event.color}20`,
                                color: event.color,
                                borderLeft: `2px solid ${event.color}`
                              }}
                            >
                              {event.title}
                            </div>
                          ))}
                          {dayEvents.length > 3 && (
                            <div className="text-xs text-muted-foreground px-1">
                              +{dayEvents.length - 3} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Upcoming Events Sidebar */}
        <div className="col-span-1">
          <div className="border border-border/60 rounded-lg p-4">
            <h3 className="text-sm font-medium mb-4">Upcoming Events</h3>
            {upcomingEvents.length === 0 ? (
              <div className="text-xs text-muted-foreground py-4">
                No upcoming events
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="group">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-1 h-full rounded-full mt-1"
                        style={{ backgroundColor: event.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{event.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {event.startDate.toLocaleDateString("en-US", { 
                            month: "short", 
                            day: "numeric" 
                          })}
                          {event.startDate.getTime() !== event.endDate.getTime() && (
                            <> - {event.endDate.toLocaleDateString("en-US", { 
                              month: "short", 
                              day: "numeric" 
                            })}</>
                          )}
                        </p>
                        <div className="mt-1">
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${event.color}15`,
                              color: event.color
                            }}
                          >
                            {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Event Legend */}
          <div className="border border-border/60 rounded-lg p-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Event Types</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#8b5cf6" }} />
                <span className="text-xs text-muted-foreground">Launch</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#ef4444" }} />
                <span className="text-xs text-muted-foreground">Sale</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3b82f6" }} />
                <span className="text-xs text-muted-foreground">Event</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "#f59e0b" }} />
                <span className="text-xs text-muted-foreground">Deadline</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Creation Dialog */}
      {/* TODO: Add EventCreation component when available */}
    </div>
  )
}
