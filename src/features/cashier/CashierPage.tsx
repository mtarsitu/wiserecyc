import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, Input } from '@/components/ui'
import { Plus, Calendar, Banknote } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import {
  cashRegistersQueryOptions,
  cashTransactionsQueryOptions,
  cashRegisterDailySummaryQueryOptions,
} from './queries'
import {
  useCreateCashRegister,
  useUpdateCashRegister,
  useDeleteCashRegister,
  useCreateCashTransaction,
  useDeleteCashTransaction,
} from './mutations'
import {
  CashRegisterCard,
  CashRegisterForm,
  TransactionForm,
  TransactionTable,
} from './components'
import type { CashRegister, CashRegisterType } from '@/types/database'

// Get today's date in YYYY-MM-DD format
const getTodayDate = () => new Date().toISOString().split('T')[0]

// Format date for display
const formatDisplayDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ro-RO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function CashierPage() {
  const { companyId, user } = useAuthContext()

  // Selected date state
  const [selectedDate, setSelectedDate] = useState(getTodayDate())

  // UI Store
  const registerDialog = useUIStore((s) => s.getDialog('cashRegister'))
  const transactionDialog = useUIStore((s) => s.getDialog('cashTransaction'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  
  // Queries
  const { data: registers = [] } = useQuery(cashRegistersQueryOptions(companyId))
  const { data: dailySummary = [], isLoading: summaryLoading } = useQuery(
    cashRegisterDailySummaryQueryOptions(companyId, selectedDate)
  )
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery(
    cashTransactionsQueryOptions(companyId, selectedDate)
  )

  // Mutations
  const createRegister = useCreateCashRegister()
  const updateRegister = useUpdateCashRegister()
  const deleteRegister = useDeleteCashRegister()
  const createTransaction = useCreateCashTransaction()
  const deleteTransaction = useDeleteCashTransaction()

  // Current editing register
  const editingRegister = useMemo(() => {
    if (!registerDialog.editId) return null
    return registers.find((r) => r.id === registerDialog.editId) || null
  }, [registerDialog.editId, registers])

  // Calculate totals
  const totals = useMemo(() => {
    return dailySummary.reduce(
      (acc, r) => ({
        opening: acc.opening + r.opening_balance,
        income: acc.income + r.daily_income,
        expense: acc.expense + r.daily_expense,
        closing: acc.closing + r.closing_balance,
      }),
      { opening: 0, income: 0, expense: 0, closing: 0 }
    )
  }, [dailySummary])

  // Handlers
  const handleRegisterSubmit = async (data: {
    name: string
    type: CashRegisterType
    initial_balance: number
  }) => {
    try {
      if (editingRegister) {
        await updateRegister.mutateAsync({
          id: editingRegister.id,
          company_id: companyId!,
          ...data,
        })
      } else {
        await createRegister.mutateAsync({
          company_id: companyId!,
          ...data,
        })
      }
      closeDialog('cashRegister')
    } catch (error) {
      console.error('Error saving register:', error)
      alert('Eroare la salvarea casei: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEditRegister = (register: CashRegister) => {
    openDialog('cashRegister', register.id)
  }

  const handleDeleteRegister = async (id: string) => {
    if (!confirm('Sigur doriti sa stergeti aceasta casa?')) return
    try {
      await deleteRegister.mutateAsync({ id, company_id: companyId! })
    } catch (error) {
      console.error('Error deleting register:', error)
      alert('Eroare la stergerea casei')
    }
  }

  const handleTransactionSubmit = async (data: {
    cash_register_id: string
    type: 'income' | 'expense'
    amount: number
    description: string
  }) => {
    try {
      await createTransaction.mutateAsync({
        company_id: companyId!,
        date: selectedDate,
        created_by: user?.id,
        source_type: 'manual',
        ...data,
      })
      closeDialog('cashTransaction')
    } catch (error) {
      console.error('Error saving transaction:', error)
      alert('Eroare la salvarea tranzactiei: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm('Sigur doriti sa stergeti aceasta tranzactie?')) return
    try {
      await deleteTransaction.mutateAsync({
        id,
        company_id: companyId!,
        date: selectedDate,
      })
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Eroare la stergerea tranzactiei')
    }
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount)

  return (
    <div>
      <Header title="Casierie" />
      <div className="p-6">
        {/* Header with date selector and actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {formatDisplayDate(selectedDate)}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openDialog('cashRegister')}>
              <Plus className="mr-2 h-4 w-4" />
              Casa noua
            </Button>
            <Button onClick={() => openDialog('cashTransaction')} disabled={registers.length === 0}>
              <Plus className="mr-2 h-4 w-4" />
              Tranzactie
            </Button>
          </div>
        </div>

        {/* Summary totals */}
        <div className="grid gap-4 sm:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total sold inceput
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{formatCurrency(totals.opening)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total incasari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                +{formatCurrency(totals.income)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total plati
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-destructive">
                -{formatCurrency(totals.expense)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total sold final
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-xl font-bold ${
                  totals.closing >= 0 ? 'text-green-600' : 'text-destructive'
                }`}
              >
                {formatCurrency(totals.closing)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cash register cards */}
        {summaryLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : dailySummary.length === 0 ? (
          <Card className="mb-6">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nicio casa de marcat</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adaugati prima casa pentru a incepe gestionarea numerarului
              </p>
              <Button onClick={() => openDialog('cashRegister')}>
                <Plus className="mr-2 h-4 w-4" />
                Adauga casa
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {dailySummary.map((register) => (
              <CashRegisterCard
                key={register.id}
                register={register}
                onEdit={() => handleEditRegister(register)}
                onDelete={() => handleDeleteRegister(register.id)}
              />
            ))}
          </div>
        )}

        {/* Transactions table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tranzactii zilnice ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionTable
              transactions={transactions}
              isLoading={transactionsLoading}
              onDelete={handleDeleteTransaction}
              deleteLoading={deleteTransaction.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Cash Register Dialog */}
      <Dialog
        open={registerDialog.isOpen}
        onClose={() => closeDialog('cashRegister')}
        title={editingRegister ? 'Editeaza casa' : 'Casa noua'}
        maxWidth="md"
      >
        <CashRegisterForm
          register={editingRegister}
          isLoading={createRegister.isPending || updateRegister.isPending}
          onSubmit={handleRegisterSubmit}
          onCancel={() => closeDialog('cashRegister')}
        />
      </Dialog>

      {/* Transaction Dialog */}
      <Dialog
        open={transactionDialog.isOpen}
        onClose={() => closeDialog('cashTransaction')}
        title="Tranzactie noua"
        maxWidth="md"
      >
        <TransactionForm
          registers={registers}
          selectedDate={selectedDate}
          isLoading={createTransaction.isPending}
          onSubmit={handleTransactionSubmit}
          onCancel={() => closeDialog('cashTransaction')}
        />
      </Dialog>
    </div>
  )
}
