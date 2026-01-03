"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Bot, User, Sparkles, CheckCircle2, BarChart3, LineChart, PieChart, Table } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toastError } from '@/lib/toast'

interface Message {
  role: 'user' | 'assistant'
  content: string
  config?: ReportConfig
}

interface ReportConfig {
  name: string
  description?: string
  chartType: 'bar' | 'line' | 'pie' | 'table'
  dateRange: string
  selectedFields: string[]
  xAxisLabel?: string
  yAxisLabel?: string
  filters?: {
    spaceId?: string
    userId?: string
  }
}

interface AIReportAgentProps {
  onReportGenerated: (config: ReportConfig) => void
  onClose?: () => void
}

export function AIReportAgent({ onReportGenerated, onClose }: AIReportAgentProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI report assistant. Tell me what kind of report you'd like to create. For example:\n\n• \"Create a bar chart showing users and projects\"\n• \"Show me a line chart of task completion over the last 7 days\"\n• \"Make a pie chart of project status distribution\""
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)

    // Add user message
    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage }
    ]
    setMessages(newMessages)

    try {
      const response = await fetch('/api/analytics/ai-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory: messages.slice(1).map(m => ({
            role: m.role,
            content: m.content
          }))
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate report')
      }

      if (data.success && data.config) {
        // Add assistant response with config preview
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: `I've created a report configuration preview for you. Review it below and let me know if you'd like any changes, or click "Use This Configuration" to apply it.`,
            config: data.config
          }
        ])
      } else {
        throw new Error('Invalid response from AI')
      }
    } catch (error: any) {
      console.error('Error generating report:', error)
      toastError(error.message || 'Failed to generate report')
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${error.message}. Please try rephrasing your request or check if the OpenAI API key is configured.`
        }
      ])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleUseConfig = (config: ReportConfig) => {
    onReportGenerated(config)
    // Dialog will be closed by parent component
  }

  const getChartIcon = (chartType: string) => {
    switch (chartType) {
      case 'bar':
        return <BarChart3 className="w-4 h-4" />
      case 'line':
        return <LineChart className="w-4 h-4" />
      case 'pie':
        return <PieChart className="w-4 h-4" />
      case 'table':
        return <Table className="w-4 h-4" />
      default:
        return <BarChart3 className="w-4 h-4" />
    }
  }

  const formatDateRange = (dateRange: string) => {
    return dateRange.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-border/50">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">AI Report Assistant</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Describe the report you want to create in natural language
        </p>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-4 overflow-y-auto" ref={scrollAreaRef}>
          <div className="space-y-4 py-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                  {message.config && (
                    <div className="mt-4 pt-4 border-t border-border/50 space-y-4">
                      {/* Preview Card */}
                      <div className="bg-background/50 rounded-lg p-4 border border-border/50 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm mb-1 flex items-center gap-2">
                              {getChartIcon(message.config.chartType)}
                              {message.config.name}
                            </h4>
                            {message.config.description && (
                              <p className="text-xs text-muted-foreground mb-2">
                                {message.config.description}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Chart Type:</span>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs capitalize">
                                {message.config.chartType}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Date Range:</span>
                            <div className="mt-1">
                              <Badge variant="secondary" className="text-xs">
                                {formatDateRange(message.config.dateRange)}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-muted-foreground text-xs">Metrics:</span>
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {message.config.selectedFields.map(field => (
                              <Badge key={field} variant="outline" className="text-xs capitalize">
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {(message.config.xAxisLabel || message.config.yAxisLabel) && (
                          <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border/30">
                            {message.config.xAxisLabel && (
                              <div>
                                <span className="text-muted-foreground">X-Axis:</span>
                                <p className="mt-0.5 font-medium">{message.config.xAxisLabel}</p>
                              </div>
                            )}
                            {message.config.yAxisLabel && (
                              <div>
                                <span className="text-muted-foreground">Y-Axis:</span>
                                <p className="mt-0.5 font-medium">{message.config.yAxisLabel}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUseConfig(message.config!)}
                          className="flex-1"
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Use This Configuration
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        You can continue chatting to refine this configuration
                      </p>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Describe the report you want to create..."
              disabled={loading}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

