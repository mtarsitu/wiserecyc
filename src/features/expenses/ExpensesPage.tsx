import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, Select, Badge } from '@/components/ui'
import { Plus, Filter, Building2, FileText, Banknote } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { expensesQueryOptions, expenseCategoriesQueryOptions } from './queries'
import { contractsQueryOptions } from '@/features/contracts/queries'
import { useCreateExpense, useUpdateExpense, useDeleteExpense } from './mutations'
import { useCreateCashTransaction } from '@/features/cashier/mutations'
import { ExpenseForm } from './components/ExpenseForm'
import { ExpenseTable } from './components/ExpenseTable'
import type { Expense, ExpenseType, PaymentMethod, AttributionType } from '@/types/database'

export function ExpensesPage() {
  const { companyId, user } = useAuthContext()

  // Filters
  const [filterAttribution, setFilterAttribution] = useState<'all' | 'punct_lucru' | 'contract'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterContract, setFilterContract] = useState<string>('')

  // UI Store
  const dialog = useUIStore((s) => s.getDialog('expenses'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Queries
  const { data: expenses = [], isLoading } = useQuery(expensesQueryOptions(companyId))
  const { data: categories = [] } = useQuery(expenseCategoriesQueryOptions(companyId))
  const { data: contracts = [] } = useQuery(contractsQueryOptions(companyId))

  // Mutations
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const deleteExpense = useDeleteExpense()
  const createCashTransaction = useCreateCashTransaction()

  // Category and contract options for filters
  const categoryOptions = useMemo(() => [
    { value: '', label: 'Toate categoriile' },
    ...categories.map(c => ({ value: c.id, label: c.name }))
  ], [categories])

  const contractOptions = useMemo(() => [
    { value: '', label: 'Toate contractele' },
    ...contracts.map(c => ({ value: c.id, label: c.contract_number }))
  ], [contracts])

  const attributionOptions = [
    { value: 'all', label: 'Toate' },
    { value: 'punct_lucru', label: 'Punct de lucru' },
    { value: 'contract', label: 'Contracte' },
  ]

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    let result = expenses

    // Filter by attribution type
    if (filterAttribution === 'punct_lucru') {
      result = result.filter(e => e.attribution_type !== 'contract')
    } else if (filterAttribution === 'contract') {
      result = result.filter(e => e.attribution_type === 'contract')
    }

    // Filter by category
    if (filterCategory) {
      result = result.filter(e => e.category_id === filterCategory)
    }

    // Filter by specific contract
    if (filterContract) {
      result = result.filter(e => e.attribution_id === filterContract)
    }

    return result
  }, [expenses, filterAttribution, filterCategory, filterContract])

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

  // Calculate totals - separate punct lucru and contract
  const totals = useMemo(() => {
    // Only payments (not collections) for totals
    const allPayments = expenses.filter(e => e.type === 'payment')

    // Punct lucru = everything EXCEPT contract-attributed
    const punctLucruPayments = allPayments.filter(e => e.attribution_type !== 'contract')
    const contractPayments = allPayments.filter(e => e.attribution_type === 'contract')

    // Also exclude TRANSFER entries from punct lucru totals
    const punctLucruNoTransfer = punctLucruPayments.filter(e =>
      !e.name?.toUpperCase().includes('TRANSFER')
    )

    const totalPunctLucru = punctLucruNoTransfer.reduce((sum, e) => sum + e.amount, 0)
    const totalContract = contractPayments.reduce((sum, e) => sum + e.amount, 0)
    const totalAll = totalPunctLucru + totalContract

    // Collections
    const collections = expenses.filter(e => e.type === 'collection').reduce((sum, e) => sum + e.amount, 0)

    // Filtered totals
    const filteredPayments = filteredExpenses.filter(e => e.type === 'payment').reduce((sum, e) => sum + e.amount, 0)
    const filteredCollections = filteredExpenses.filter(e => e.type === 'collection').reduce((sum, e) => sum + e.amount, 0)

    return {
      totalPunctLucru,
      totalContract,
      totalAll,
      collections,
      filteredPayments,
      filteredCollections,
    }
  }, [expenses, filteredExpenses])

  // Category breakdown for punct lucru expenses
  const categoryBreakdown = useMemo(() => {
    const punctLucruPayments = expenses.filter(e =>
      e.type === 'payment' &&
      e.attribution_type !== 'contract' &&
      !e.name?.toUpperCase().includes('TRANSFER')
    )

    const breakdown = new Map<string, { name: string; total: number; count: number }>()

    punctLucruPayments.forEach(e => {
      const catId = e.category_id || 'no-category'
      const cat = categories.find(c => c.id === e.category_id)
      const catName = cat?.name || 'Fara categorie'

      const existing = breakdown.get(catId) || { name: catName, total: 0, count: 0 }
      existing.total += e.amount
      existing.count++
      breakdown.set(catId, existing)
    })

    return Array.from(breakdown.values()).sort((a, b) => b.total - a.total)
  }, [expenses, categories])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount)

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

        {/* Summary cards - showing punct lucru vs contract */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Cheltuieli Punct Lucru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(totals.totalPunctLucru)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Fara transferuri si contracte
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Cheltuieli Contracte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totals.totalContract)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Nu intra in totalul general
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Banknote className="h-4 w-4" />
                Total Incasari
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(totals.collections)}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Companie
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totals.totalPunctLucru)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cheltuieli reale punct lucru
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category breakdown */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cheltuieli pe categorii (Punct Lucru)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categoryBreakdown.slice(0, 10).map((cat, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="cursor-pointer hover:bg-muted"
                  onClick={() => {
                    const catObj = categories.find(c => c.name === cat.name)
                    if (catObj) setFilterCategory(catObj.id)
                  }}
                >
                  {cat.name}: {formatCurrency(cat.total)} ({cat.count})
                </Badge>
              ))}
              {categoryBreakdown.length > 10 && (
                <Badge variant="secondary">+{categoryBreakdown.length - 10} altele</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtre
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Atribuire</label>
                <Select
                  value={filterAttribution}
                  onChange={(e) => {
                    setFilterAttribution(e.target.value as 'all' | 'punct_lucru' | 'contract')
                    if (e.target.value !== 'contract') setFilterContract('')
                  }}
                  options={attributionOptions}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Categorie</label>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  options={categoryOptions}
                />
              </div>
              {filterAttribution === 'contract' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Contract</label>
                  <Select
                    value={filterContract}
                    onChange={(e) => setFilterContract(e.target.value)}
                    options={contractOptions}
                  />
                </div>
              )}
            </div>
            {(filterAttribution !== 'all' || filterCategory || filterContract) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Afisate: {filteredExpenses.length} cheltuieli •
                  Plati: {formatCurrency(totals.filteredPayments)} •
                  Incasari: {formatCurrency(totals.filteredCollections)}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterAttribution('all')
                    setFilterCategory('')
                    setFilterContract('')
                  }}
                >
                  Reseteaza filtre
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cheltuieli ({filteredExpenses.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ExpenseTable
              expenses={filteredExpenses}
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
