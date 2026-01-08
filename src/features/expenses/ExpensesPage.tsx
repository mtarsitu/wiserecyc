import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog } from '@/components/ui'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { expensesQueryOptions } from './queries'
import { useCreateExpense, useUpdateExpense, useDeleteExpense } from './mutations'
import { useCreateCashTransaction } from '@/features/cashier/mutations'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseTable } from './components/ExpenseTable'
import type { Expense, ExpenseType, PaymentMethod, AttributionType } from '@/types/database'

export function ExpensesPage() {
  const { companyId, user } = useAuthContext()

  // UI Store
  const dialog = useUIStore((s) => s.getDialog('expenses'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Query
  const { data: expenses = [], isLoading } = useQuery(expensesQueryOptions(companyId))

  // Mutations
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createCashTransaction = useCreateCashTransaction()

  // Current editing expense
  const editingExpense = useMemo(() => {
    if (!dialog.editId) return null
    return expenses.find((e) => e.id === dialog.editId) || null
  }, [dialog.editId, expenses])

  // Handlers
  const handleSubmit = async (data: {
    date: string
    name: string
    amount: number
    type: ExpenseType
    payment_method: PaymentMethod | null
    attribution_type: AttributionType | null
    cash_register_id: string | null
    notes: string
  }) => {
    try {
      let expenseId: string | undefined

      if (editingExpense) {
        await updateExpense.mutateAsync({
          id: editingExpense.id,
          date: data.date,
          name: data.name,
          amount: data.amount,
          type: data.type,
          payment_method: data.payment_method,
          attribution_type: data.attribution_type,
          notes: data.notes,
        })
        expenseId = editingExpense.id
      } else {
        const newExpense = await createExpense.mutateAsync({
          company_id: companyId!,
          created_by: user?.id,
          date: data.date,
          name: data.name,
          amount: data.amount,
          type: data.type,
          payment_method: data.payment_method,
          attribution_type: data.attribution_type,
          notes: data.notes,
        })
        expenseId = newExpense.id
      }

      // Create cash transaction if cash_register_id is selected
      if (data.cash_register_id && expenseId && !editingExpense) {
        await createCashTransaction.mutateAsync({
          company_id: companyId!,
          cash_register_id: data.cash_register_id,
          date: data.date,
          type: data.type === 'payment' ? 'expense' : 'income',
          amount: data.amount,
          description: data.name,
          source_type: 'expense',
          source_id: expenseId,
          created_by: user?.id,
        })
      }

      closeDialog('expenses')
    } catch (error) {
      console.error('Error saving expense:', error)
      alert('Eroare la salvarea cheltuielii: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEdit = (expense: Expense) => {
    openDialog('expenses', expense.id)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteExpense.mutateAsync({ id, companyId: companyId! })
      setDeleteConfirm('expenses', null)
    } catch (error) {
      console.error('Error deleting expense:', error)
      alert('Eroare la stergerea cheltuielii')
    }
  }

  // Calculate totals
  const totals = useMemo(() => {
    const payments = expenses.filter((e) => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0)
    const collections = expenses.filter((e) => e.type === 'collection').reduce((sum, e) => sum + e.amount, 0)
    return { payments, collections, balance: collections - payments }
  }, [expenses])

  return (
    <div>
      <Header title="Cheltuieli" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista cheltuieli</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza cheltuielile si platile
            </p>
          </div>
          <Button onClick={() => openDialog('expenses')}>
            <Plus className="mr-2 h-4 w-4" />
            Cheltuiala noua
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total plati</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                -{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(totals.payments)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total incasari</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                +{new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(totals.collections)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Balanta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                {new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(totals.balance)}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Cheltuieli ({expenses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseTable
              expenses={expenses}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              deleteLoading={deleteExpense.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Expense Dialog */}
      <Dialog
        open={dialog.isOpen}
        onClose={() => closeDialog('expenses')}
        title={editingExpense ? 'Editeaza cheltuiala' : 'Cheltuiala noua'}
        maxWidth="lg"
      >
        <ExpenseForm
          companyId={companyId!}
          expense={editingExpense}
          isLoading={createExpense.isPending || updateExpense.isPending || createCashTransaction.isPending}
          onSubmit={handleSubmit}
          onCancel={() => closeDialog('expenses')}
        />
      </Dialog>
    </div>
  )
}
