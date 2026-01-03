"use client"

import { useState, useEffect } from 'react'
import { useSession } from '@/components/providers/session-provider'
import { getExpenses, createExpense, updateExpenseCategory, type Expense } from '@/lib/expense-functions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Plus, 
  Search, 
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Loader2 } from 'lucide-react'
import { toastSuccess, toastError } from '@/lib/toast'

export function InvoicingExpenses() {
  const { data: session } = useSession()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null)

  const spaceId = session?.user?.company_id || null

  useEffect(() => {
    loadExpenses()
  }, [spaceId])

  const loadExpenses = async () => {
    setLoading(true)
    try {
      const result = await getExpenses(spaceId || undefined)
      if (result.success && result.data) {
        setExpenses(result.data)
      }
    } catch (error) {
      console.error('Error loading expenses:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredExpenses = expenses.filter(expense =>
    expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0)
  const expensesByCategory = expenses.reduce((acc, exp) => {
    const cat = exp.category || 'Uncategorized'
    acc[cat] = (acc[cat] || 0) + exp.amount
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Expenses</h2>
          <p className="text-muted-foreground">Track and categorize your business expenses</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold">
                  ${expenses.filter(exp => {
                    const expDate = new Date(exp.expense_date)
                    const now = new Date()
                    return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
                  }).reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Categories</p>
                <p className="text-2xl font-bold">{Object.keys(expensesByCategory).length}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses ({filteredExpenses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No expenses found</div>
          ) : (
            <div className="space-y-4">
              {filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{expense.description}</h3>
                      {expense.auto_categorized && (
                        <Badge variant="outline" className="text-xs">
                          Auto-categorized ({expense.categorization_confidence}%)
                        </Badge>
                      )}
                      {expense.status === 'approved' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{expense.category || 'Uncategorized'}</span>
                      {expense.vendor && <span>• {expense.vendor}</span>}
                      <span>• {new Date(expense.expense_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold">${expense.amount.toFixed(2)}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedExpense(expense)}
                    >
                      Edit Category
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Expense Modal */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onExpenseCreated={() => {
          loadExpenses()
          setIsCreateModalOpen(false)
        }}
        spaceId={spaceId}
      />

      {/* Edit Category Modal */}
      {selectedExpense && (
        <EditCategoryModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          onCategoryUpdated={() => {
            loadExpenses()
            setSelectedExpense(null)
          }}
        />
      )}
    </div>
  )
}

function CreateExpenseModal({ isOpen, onClose, onExpenseCreated, spaceId }: {
  isOpen: boolean
  onClose: () => void
  onExpenseCreated: () => void
  spaceId: string | null
}) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [vendor, setVendor] = useState('')
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!description || !amount) {
      toastError('Description and amount are required')
      return
    }

    setSubmitting(true)
    try {
      const result = await createExpense({
        description,
        amount: parseFloat(amount),
        category: category || undefined,
        vendor: vendor || undefined,
        expense_date: expenseDate,
      }, spaceId || undefined)

      if (result.success) {
        toastSuccess('Expense added successfully')
        onExpenseCreated()
      } else {
        toastError(result.error || 'Failed to create expense')
      }
    } catch (error) {
      toastError('Failed to create expense')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Expense</DialogTitle>
          <DialogDescription>Track a new business expense</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Description *</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g., Office supplies from Staples"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
              />
            </div>
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Category (auto-detected if left empty)</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Office Supplies"
            />
          </div>
          <div>
            <Label>Vendor</Label>
            <Input
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g., Staples"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function EditCategoryModal({ expense, onClose, onCategoryUpdated }: {
  expense: Expense
  onClose: () => void
  onCategoryUpdated: () => void
}) {
  const [category, setCategory] = useState(expense.category || '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const result = await updateExpenseCategory(expense.id, category)
      if (result.success) {
        toastSuccess('Category updated')
        onCategoryUpdated()
      } else {
        toastError(result.error || 'Failed to update category')
      }
    } catch (error) {
      toastError('Failed to update category')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={!!expense} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Category</DialogTitle>
          <DialogDescription>
            {expense.description} - ${expense.amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Category</Label>
            <Input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Office Supplies"
            />
            {expense.suggested_category && expense.auto_categorized && (
              <p className="text-xs text-muted-foreground mt-1">
                Suggested: {expense.suggested_category} ({expense.categorization_confidence}% confidence)
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
