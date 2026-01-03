// AI Bookkeeping Assistant Functions
// Natural language queries for bookkeeping insights

import { supabase } from './supabase'
import { getCurrentUser } from './auth'
import { getExpenses, getCashFlow } from './expense-functions'
import { getInvoices } from './invoicing-functions'

export interface AIQuery {
  id: string
  space_id: string | null
  user_id: string | null
  question: string
  query_type: string | null
  answer: string
  confidence_score: number | null
  data_sources: any
  created_at: string
}

/**
 * Answer natural language bookkeeping questions
 */
export async function askBookkeepingQuestion(
  question: string,
  spaceId?: string
): Promise<{ success: boolean; data?: AIQuery; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const finalSpaceId = spaceId || currentUser.companyId || null
    const questionLower = question.toLowerCase()

    // Determine query type
    let queryType = 'general'
    if (questionLower.includes('profit') || questionLower.includes('revenue') || questionLower.includes('income')) {
      queryType = 'profit_analysis'
    } else if (questionLower.includes('expense') || questionLower.includes('spend')) {
      queryType = 'expense_trend'
    } else if (questionLower.includes('cash flow') || questionLower.includes('cashflow')) {
      queryType = 'cash_flow'
    } else if (questionLower.includes('why') || questionLower.includes('explain')) {
      queryType = 'explanation'
    }

    // Get relevant data
    const [invoicesResult, expensesResult, cashFlowResult] = await Promise.all([
      getInvoices(finalSpaceId || undefined),
      getExpenses(finalSpaceId || undefined),
      getCashFlow(finalSpaceId || undefined),
    ])

    const invoices = invoicesResult.success ? invoicesResult.data || [] : []
    const expenses = expensesResult.success ? expensesResult.data || [] : []
    const cashFlow = cashFlowResult.success ? cashFlowResult.data : null

    // Generate answer based on query type
    let answer = ''
    let confidence = 80
    const dataSources: any = {}

    switch (queryType) {
      case 'profit_analysis': {
        const totalRevenue = invoices
          .filter(inv => inv.status === 'paid')
          .reduce((sum, inv) => sum + inv.total_amount, 0)
        const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
        const profit = totalRevenue - totalExpenses
        const profitMargin = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(1) : '0'

        answer = `Your profit analysis:\n\n` +
          `Total Revenue: $${totalRevenue.toFixed(2)}\n` +
          `Total Expenses: $${totalExpenses.toFixed(2)}\n` +
          `Net Profit: $${profit.toFixed(2)}\n` +
          `Profit Margin: ${profitMargin}%\n\n` +
          `${profit >= 0 ? 'You are profitable!' : 'You are operating at a loss. Consider reviewing your expenses.'}`

        dataSources.revenue = totalRevenue
        dataSources.expenses = totalExpenses
        dataSources.profit = profit
        break
      }

      case 'expense_trend': {
        const expensesByCategory: Record<string, number> = {}
        expenses.forEach(exp => {
          const cat = exp.category || 'Uncategorized'
          expensesByCategory[cat] = (expensesByCategory[cat] || 0) + exp.amount
        })

        const topCategory = Object.entries(expensesByCategory)
          .sort(([, a], [, b]) => b - a)[0]

        answer = `Your expense breakdown:\n\n` +
          `Total Expenses: $${expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}\n\n` +
          `Top spending category: ${topCategory[0]} ($${topCategory[1].toFixed(2)})\n\n` +
          `Breakdown by category:\n` +
          Object.entries(expensesByCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([cat, amount]) => `  • ${cat}: $${amount.toFixed(2)}`)
            .join('\n')

        dataSources.expensesByCategory = expensesByCategory
        break
      }

      case 'cash_flow': {
        if (cashFlow) {
          const cashFlowMessage = cashFlow.netCashFlow >= 0
            ? 'Positive cash flow - you are bringing in more than you are spending!'
            : 'Negative cash flow - consider reducing expenses or increasing revenue.'
          answer = `Your cash flow summary:\n\n` +
            `Total Income: $${cashFlow.totalIncome.toFixed(2)}\n` +
            `Total Expenses: $${cashFlow.totalExpenses.toFixed(2)}\n` +
            `Net Cash Flow: $${cashFlow.netCashFlow.toFixed(2)}\n\n` +
            cashFlowMessage
        } else {
          answer = 'Unable to calculate cash flow at this time.'
          confidence = 30
        }
        break
      }

      case 'explanation': {
        // Simple explanation based on common accounting terms
        if (questionLower.includes('profit')) {
          answer = `Profit is the money you have left after subtracting all your expenses from your revenue. ` +
            `It's calculated as: Revenue - Expenses = Profit. ` +
            `A positive profit means you're making money, while a negative profit (loss) means you're spending more than you're earning.`
        } else if (questionLower.includes('cash flow')) {
          answer = `Cash flow is the movement of money in and out of your business. ` +
            `Positive cash flow means more money is coming in than going out, which is good for your business. ` +
            `Negative cash flow means you're spending more than you're earning, which can be a warning sign.`
        } else {
          answer = `I can help explain accounting concepts in simple terms. ` +
            `Try asking about profit, cash flow, expenses, or revenue.`
          confidence = 50
        }
        break
      }

      default: {
        answer = `I can help you understand your finances. Try asking:\n` +
          `• "Why did my profit drop last month?"\n` +
          `• "What expenses increased?"\n` +
          `• "Show me my cash flow"\n` +
          `• "Explain profit like I'm not an accountant"`
        confidence = 40
      }
    }

    // Save query to database
    const { data: query, error } = await supabase
      .from('ai_bookkeeping_queries')
      .insert({
        space_id: finalSpaceId,
        user_id: currentUser.id,
        question,
        query_type: queryType,
        answer,
        confidence_score: confidence,
        data_sources: dataSources,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: query }
  } catch (error) {
    console.error('Error answering question:', error)
    return { success: false, error: 'Failed to answer question' }
  }
}

/**
 * Get query history
 */
export async function getQueryHistory(spaceId?: string): Promise<{ success: boolean; data?: AIQuery[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('ai_bookkeeping_queries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch query history' }
  }
}

