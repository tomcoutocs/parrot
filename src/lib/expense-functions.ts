// Expense Tracking Functions
// Core functions for expense tracking with Plaid integration

import { supabase } from './supabase'
import { getCurrentUser } from './auth'

// Re-export getCurrentUser if needed
export { getCurrentUser }

export interface Expense {
  id: string
  space_id: string | null
  description: string
  amount: number
  currency: string
  category: string | null
  subcategory: string | null
  vendor: string | null
  expense_date: string
  auto_categorized: boolean
  categorization_confidence: number | null
  suggested_category: string | null
  user_confirmed_category: boolean
  receipt_url: string | null
  receipt_uploaded_at: string | null
  plaid_transaction_id: string | null
  plaid_account_id: string | null
  bank_account_name: string | null
  is_bank_imported: boolean
  matched_to_invoice: boolean
  matched_invoice_id: string | null
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed'
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CreateExpenseData {
  description: string
  amount: number
  currency?: string
  category?: string
  subcategory?: string
  vendor?: string
  expense_date?: string
  receipt_url?: string
}

/**
 * Auto-categorize expense based on description
 * Simple rule-based categorization (can be enhanced with ML)
 */
function autoCategorizeExpense(description: string, vendor?: string | null): { category: string; confidence: number } {
  const desc = description.toLowerCase()
  const vend = (vendor || '').toLowerCase()

  // High confidence matches
  if (desc.includes('gas') || desc.includes('fuel') || vend.includes('shell') || vend.includes('chevron')) {
    return { category: 'Transportation', confidence: 90 }
  }
  if (desc.includes('office') || desc.includes('staples') || vend.includes('office depot')) {
    return { category: 'Office Supplies', confidence: 85 }
  }
  if (desc.includes('software') || desc.includes('subscription') || desc.includes('saas')) {
    return { category: 'Software', confidence: 85 }
  }
  if (desc.includes('meal') || desc.includes('restaurant') || desc.includes('food')) {
    return { category: 'Meals & Entertainment', confidence: 80 }
  }
  if (desc.includes('hotel') || desc.includes('travel') || desc.includes('flight')) {
    return { category: 'Travel', confidence: 85 }
  }
  if (desc.includes('internet') || desc.includes('phone') || desc.includes('utilities')) {
    return { category: 'Utilities', confidence: 80 }
  }

  // Medium confidence matches
  if (desc.includes('amazon') || desc.includes('online')) {
    return { category: 'General', confidence: 60 }
  }

  // Default
  return { category: 'Uncategorized', confidence: 30 }
}

/**
 * Create expense
 */
export async function createExpense(
  data: CreateExpenseData,
  spaceId?: string
): Promise<{ success: boolean; data?: Expense; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const currentUser = getCurrentUser()
    if (!currentUser) {
      return { success: false, error: 'User not authenticated' }
    }

    const finalSpaceId = spaceId || currentUser.companyId || null
    const expenseDate = data.expense_date || new Date().toISOString().split('T')[0]
    const currency = data.currency || 'USD'

    // Auto-categorize if category not provided
    let category = data.category
    let autoCategorized = false
    let categorizationConfidence: number | null = null
    let suggestedCategory: string | null = null

    if (!category) {
      const categorization = autoCategorizeExpense(data.description, data.vendor)
      category = categorization.category
      autoCategorized = true
      categorizationConfidence = categorization.confidence
      suggestedCategory = categorization.category
    }

    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        space_id: finalSpaceId,
        description: data.description,
        amount: data.amount,
        currency,
        category,
        subcategory: data.subcategory || null,
        vendor: data.vendor || null,
        expense_date: expenseDate,
        auto_categorized: autoCategorized,
        categorization_confidence: categorizationConfidence,
        suggested_category: suggestedCategory,
        user_confirmed_category: !autoCategorized,
        receipt_url: data.receipt_url || null,
        receipt_uploaded_at: data.receipt_url ? new Date().toISOString() : null,
        is_bank_imported: false,
        status: 'pending',
        created_by: currentUser.id,
      })
      .select()
      .single()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: expense }
  } catch (error) {
    console.error('Error creating expense:', error)
    return { success: false, error: 'Failed to create expense' }
  }
}

/**
 * Get expenses for a space
 */
export async function getExpenses(spaceId?: string): Promise<{ success: boolean; data?: Expense[]; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    let query = supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })

    if (spaceId) {
      query = query.eq('space_id', spaceId)
    }

    const { data, error } = await query

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, data: data || [] }
  } catch (error) {
    return { success: false, error: 'Failed to fetch expenses' }
  }
}

/**
 * Update expense category (user confirmation)
 */
export async function updateExpenseCategory(
  expenseId: string,
  category: string,
  subcategory?: string
): Promise<{ success: boolean; error?: string }> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    const { error } = await supabase
      .from('expenses')
      .update({
        category,
        subcategory: subcategory || null,
        user_confirmed_category: true,
        auto_categorized: false,
      })
      .eq('id', expenseId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to update expense category' }
  }
}

/**
 * Calculate cash flow (income - expenses)
 */
export async function getCashFlow(spaceId?: string, startDate?: string, endDate?: string): Promise<{
  success: boolean
  data?: {
    totalIncome: number
    totalExpenses: number
    netCashFlow: number
    expensesByCategory: Record<string, number>
  }
  error?: string
}> {
  if (!supabase) {
    return { success: false, error: 'Supabase not configured' }
  }

  try {
    // Get paid invoices (income)
    let incomeQuery = supabase
      .from('invoices')
      .select('total_amount')
      .eq('status', 'paid')

    if (spaceId) {
      incomeQuery = incomeQuery.eq('space_id', spaceId)
    }

    if (startDate) {
      incomeQuery = incomeQuery.gte('paid_at', startDate)
    }
    if (endDate) {
      incomeQuery = incomeQuery.lte('paid_at', endDate)
    }

    const { data: invoices } = await incomeQuery
    const totalIncome = invoices?.reduce((sum, inv) => sum + (inv.total_amount || 0), 0) || 0

    // Get expenses
    let expenseQuery = supabase
      .from('expenses')
      .select('amount, category')

    if (spaceId) {
      expenseQuery = expenseQuery.eq('space_id', spaceId)
    }

    if (startDate) {
      expenseQuery = expenseQuery.gte('expense_date', startDate)
    }
    if (endDate) {
      expenseQuery = expenseQuery.lte('expense_date', endDate)
    }

    const { data: expenses } = await expenseQuery
    const totalExpenses = expenses?.reduce((sum, exp) => sum + (exp.amount || 0), 0) || 0

    // Group expenses by category
    const expensesByCategory: Record<string, number> = {}
    expenses?.forEach(exp => {
      const cat = exp.category || 'Uncategorized'
      expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (exp.amount || 0)
    })

    return {
      success: true,
      data: {
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        expensesByCategory,
      },
    }
  } catch (error) {
    return { success: false, error: 'Failed to calculate cash flow' }
  }
}

