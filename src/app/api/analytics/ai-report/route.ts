import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ReportConfig {
  name: string
  description?: string
  chartType: 'bar' | 'line' | 'pie' | 'table'
  dateRange: string
  selectedFields: string[]
  xAxisLabel?: string
  yAxisLabel?: string
}

const AVAILABLE_METRICS = [
  { id: 'users', name: 'Users', description: 'Total users and active users' },
  { id: 'projects', name: 'Projects', description: 'Total projects and active projects' },
  { id: 'tasks', name: 'Tasks', description: 'Total tasks and completed tasks' },
  { id: 'submissions', name: 'Form Submissions', description: 'Form submission count' },
  { id: 'activities', name: 'Activities', description: 'Activity log count' },
]

const SYSTEM_PROMPT = `You are an AI assistant that helps users create analytics reports from natural language requests.

Available metrics:
${AVAILABLE_METRICS.map(m => `- ${m.id}: ${m.name} - ${m.description}`).join('\n')}

Available chart types: bar, line, pie, table
Available date ranges: today, yesterday, last_7_days, last_30_days, last_90_days, custom

When a user requests a report, extract the following information and return ONLY a valid JSON object with this structure:
{
  "name": "Report name (descriptive, max 50 chars)",
  "description": "Brief description (optional)",
  "chartType": "bar" | "line" | "pie" | "table",
  "dateRange": "last_30_days" | "last_7_days" | "last_90_days" | "today" | "yesterday" | "custom",
  "selectedFields": ["array", "of", "metric", "ids"],
  "xAxisLabel": "optional x-axis label",
  "yAxisLabel": "optional y-axis label"
}

Rules:
- If user mentions "users", "people", "members" -> include "users"
- If user mentions "projects", "work", "initiatives" -> include "projects"
- If user mentions "tasks", "todo", "work items" -> include "tasks"
- If user mentions "forms", "submissions" -> include "submissions"
- If user mentions "activity", "actions", "events" -> include "activities"
- Chart type: "bar chart" or "bars" -> "bar", "line chart" or "trend" -> "line", "pie chart" or "distribution" -> "pie", "table" or "list" -> "table"
- Date range: "last week" -> "last_7_days", "last month" -> "last_30_days", "last 3 months" -> "last_90_days", "today" -> "today"
- Default to "bar" chart type if not specified
- Default to "last_30_days" if date range not specified
- Always include at least one metric
- Return ONLY the JSON, no markdown, no explanation, no code blocks`

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json()

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    // Check for OpenAI API key (support both OPENAI_API_KEY and OPEN_API_KEY)
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Please set OPENAI_API_KEY or OPEN_API_KEY in your .env.local file.' },
        { status: 500 }
      )
    }

    // Build conversation messages
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role || 'user',
        content: msg.content || msg.message
      })),
      { role: 'user', content: message }
    ]

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using gpt-4o-mini for cost efficiency, can be changed to gpt-4 if needed
        messages,
        temperature: 0.3,
        max_tokens: 500,
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('OpenAI API error:', error)
      return NextResponse.json(
        { error: 'Failed to generate report configuration' },
        { status: 500 }
      )
    }

    const data = await response.json()
    const aiResponse = data.choices[0]?.message?.content || ''

    // Try to extract JSON from the response
    let reportConfig: ReportConfig | null = null
    
    try {
      // Try to find JSON in the response (might be wrapped in markdown code blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        reportConfig = JSON.parse(jsonMatch[0])
      } else {
        reportConfig = JSON.parse(aiResponse)
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', aiResponse)
      // Fallback: create a basic report config
      reportConfig = {
        name: 'Generated Report',
        chartType: 'bar',
        dateRange: 'last_30_days',
        selectedFields: ['users', 'projects', 'tasks']
      }
    }

    // Validate and sanitize the config
    if (!reportConfig) {
      return NextResponse.json(
        { error: 'Failed to generate valid report configuration' },
        { status: 500 }
      )
    }

    // Ensure valid values
    const validChartTypes = ['bar', 'line', 'pie', 'table']
    const validDateRanges = ['today', 'yesterday', 'last_7_days', 'last_30_days', 'last_90_days', 'custom']
    const validMetrics = AVAILABLE_METRICS.map(m => m.id)

    const sanitizedConfig: ReportConfig = {
      name: reportConfig.name?.substring(0, 50) || 'Generated Report',
      description: reportConfig.description?.substring(0, 200),
      chartType: validChartTypes.includes(reportConfig.chartType) ? reportConfig.chartType : 'bar',
      dateRange: validDateRanges.includes(reportConfig.dateRange) ? reportConfig.dateRange : 'last_30_days',
      selectedFields: Array.isArray(reportConfig.selectedFields) 
        ? reportConfig.selectedFields.filter((f: string) => validMetrics.includes(f))
        : ['users'],
      xAxisLabel: reportConfig.xAxisLabel?.substring(0, 50),
      yAxisLabel: reportConfig.yAxisLabel?.substring(0, 50),
    }

    // Ensure at least one field is selected
    if (sanitizedConfig.selectedFields.length === 0) {
      sanitizedConfig.selectedFields = ['users']
    }

    return NextResponse.json({
      success: true,
      config: sanitizedConfig,
      aiResponse: aiResponse.substring(0, 500) // Include AI response for context
    })

  } catch (error: any) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: error.message || 'An error occurred while generating the report' },
      { status: 500 }
    )
  }
}

