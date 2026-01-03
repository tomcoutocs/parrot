"use client"

import { useState, useEffect, useRef } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { askBookkeepingQuestion, getQueryHistory, type AIQuery } from '@/lib/ai-bookkeeping-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Send, Bot, MessageSquare } from 'lucide-react'
import { toastError } from '@/lib/toast'

export function InvoicingAIAssistant() {
  const { data: session } = useSession()
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentAnswer, setCurrentAnswer] = useState<AIQuery | null>(null)
  const [history, setHistory] = useState<AIQuery[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadHistory()
  }, [spaceId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, currentAnswer])

  const loadHistory = async () => {
    try {
      const result = await getQueryHistory(spaceId || undefined)
      if (result.success && result.data) {
        setHistory(result.data)
      }
    } catch (error) {
      console.error('Error loading history:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim()) return

    setLoading(true)
    setCurrentAnswer(null)

    try {
      const result = await askBookkeepingQuestion(question, spaceId || undefined)
      if (result.success && result.data) {
        setCurrentAnswer(result.data)
        setQuestion('')
        loadHistory()
      } else {
        toastError(result.error || 'Failed to get answer')
      }
    } catch (error) {
      toastError('Failed to get answer')
    } finally {
      setLoading(false)
    }
  }

  const suggestedQuestions = [
    "Why did my profit drop last month?",
    "What expenses increased?",
    "Show me my cash flow",
    "Explain profit like I'm not an accountant",
    "What's my profit margin?",
    "Which category am I spending the most on?",
  ]

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div>
        <h2 className="text-2xl font-bold">AI Bookkeeping Assistant</h2>
        <p className="text-muted-foreground">Ask questions about your finances in plain English</p>
      </div>

      {/* Chat Interface */}
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Ask Your Question
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {history.length === 0 && !currentAnswer && (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Ask me anything about your finances!</p>
                <div className="mt-6 space-y-2">
                  <p className="text-sm font-medium">Try asking:</p>
                  {suggestedQuestions.slice(0, 3).map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setQuestion(q)}
                      className="block text-sm text-primary hover:underline"
                    >
                      "{q}"
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* History */}
            {history.map((query) => (
              <div key={query.id} className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{query.question}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-sm whitespace-pre-line">{query.answer}</p>
                    {query.confidence_score && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence: {query.confidence_score}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Current Answer */}
            {currentAnswer && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-sm">{currentAnswer.question}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 max-w-[80%]">
                    <p className="text-sm whitespace-pre-line">{currentAnswer.answer}</p>
                    {currentAnswer.confidence_score && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Confidence: {currentAnswer.confidence_score}%
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about your finances..."
              disabled={loading}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || !question.trim()}>
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Suggested Questions */}
          <div className="mt-4">
            <p className="text-xs text-muted-foreground mb-2">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((q, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  onClick={() => setQuestion(q)}
                  className="text-xs"
                >
                  {q}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

