import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog, Select } from '@/components/ui'
import { Plus, Search, Loader2, Users, Banknote, Calendar } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { employeesQueryOptions } from './queries'
import { expensesQueryOptions, expenseCategoriesQueryOptions } from '@/features/expenses/queries'
import { useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from './mutations'
import { EmployeeTable } from './components/EmployeeTable'
import { EmployeeForm } from './components/EmployeeForm'
import type { Employee } from '@/types/database'

// Generate month options for dropdown (last 12 months)
function getMonthOptions() {
  const options = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const label = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })
    options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

const periodOptions = [
  { value: '1-15', label: 'Perioada 1-15' },
  { value: '16-31', label: 'Perioada 16-31' },
]

const ENTITY = 'employees'

export function EmployeesPage() {
  const { companyId } = useAuthContext()

  // Advances report state
  const monthOptions = useMemo(() => getMonthOptions(), [])
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0]?.value || '')
  const [selectedPeriod, setSelectedPeriod] = useState('1-15')

  // UI Store
  const searchQuery = useUIStore((s) => s.getSearchQuery(ENTITY))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const dialog = useUIStore((s) => s.getDialog(ENTITY))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const deleteConfirmId = useUIStore((s) => s.getDeleteConfirm(ENTITY))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Queries & Mutations
  const { data: employees = [], isLoading } = useQuery(employeesQueryOptions(companyId))
  const { data: expenses = [] } = useQuery(expensesQueryOptions(companyId))
  const { data: expenseCategories = [] } = useQuery(expenseCategoriesQueryOptions(companyId))

  // Find AVANS SALARIU category ID
  const avansCategoryId = useMemo(() => {
    const cat = expenseCategories.find(c => c.name.toUpperCase() === 'AVANS SALARIU')
    return cat?.id || null
  }, [expenseCategories])
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()

  // Filtered data
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees
    const q = searchQuery.toLowerCase()
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q)
    )
  }, [employees, searchQuery])

  // Stats
  const activeCount = useMemo(() => employees.filter(e => e.is_active).length, [employees])

  // Calculate advances for selected period
  const advancesData = useMemo(() => {
    if (!selectedMonth || employees.length === 0 || !avansCategoryId) return { advances: [], total: 0 }

    const [year, month] = selectedMonth.split('-').map(Number)
    const lastDayOfMonth = new Date(year, month, 0).getDate()
    const startDay = selectedPeriod === '1-15' ? 1 : 16
    const endDay = selectedPeriod === '1-15' ? 15 : lastDayOfMonth
    const startDate = new Date(year, month - 1, startDay)
    const endDate = new Date(year, month - 1, endDay, 23, 59, 59)

    // Create employee name lookup (uppercase for matching)
    const employeeMap = new Map(employees.map(e => [e.full_name.toUpperCase(), e]))

    // Filter and group expenses by employee
    const advancesByEmployee = new Map<string, { employee: Employee; total: number; count: number; details: { date: string; amount: number }[] }>()

    for (const expense of expenses) {
      const expenseDate = new Date(expense.date)
      if (expenseDate < startDate || expenseDate > endDate) continue

      // Only count expenses in AVANS SALARIU category
      if (expense.category_id !== avansCategoryId) continue

      const employee = employeeMap.get(expense.name?.toUpperCase() || '')
      if (!employee) continue

      const existing = advancesByEmployee.get(employee.id) || {
        employee,
        total: 0,
        count: 0,
        details: []
      }
      existing.total += expense.amount || 0
      existing.count++
      existing.details.push({ date: expense.date, amount: expense.amount || 0 })
      advancesByEmployee.set(employee.id, existing)
    }

    // Sort by total descending
    const advances = Array.from(advancesByEmployee.values()).sort((a, b) => b.total - a.total)
    const total = advances.reduce((sum, a) => sum + a.total, 0)

    return { advances, total }
  }, [employees, expenses, selectedMonth, selectedPeriod, avansCategoryId])

  // Current editing employee
  const editingEmployee = useMemo(() => {
    if (!dialog.editId) return null
    return employees.find((e) => e.id === dialog.editId) || null
  }, [dialog.editId, employees])

  // Handlers
  const handleEdit = (employee: Employee) => openDialog(ENTITY, employee.id)

  const handleSubmit = async (data: Parameters<typeof createEmployee.mutateAsync>[0]) => {
    if (editingEmployee) {
      await updateEmployee.mutateAsync({ id: editingEmployee.id, ...data })
    } else {
      await createEmployee.mutateAsync(data)
    }
    closeDialog(ENTITY)
  }

  const handleDelete = async (id: string) => {
    await deleteEmployee.mutateAsync(id)
    setDeleteConfirm(ENTITY, null)
  }

  const isMutating = createEmployee.isPending || updateEmployee.isPending

  return (
    <div>
      <Header title="Salariati" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista salariati</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza salariatii companiei ({activeCount} activi din {employees.length})
            </p>
          </div>
          <Button onClick={() => openDialog(ENTITY)}>
            <Plus className="mr-2 h-4 w-4" />
            Salariat nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Salariati ({filteredEmployees.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cauta salariat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(ENTITY, e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? 'Nu s-au gasit salariati care sa corespunda cautarii.'
                  : 'Nu exista salariati inregistrati. Apasa butonul "Salariat nou" pentru a adauga.'}
              </p>
            ) : (
              <EmployeeTable
                employees={filteredEmployees}
                deleteConfirmId={deleteConfirmId}
                isDeleting={deleteEmployee.isPending}
                onEdit={handleEdit}
                onDeleteClick={(id) => setDeleteConfirm(ENTITY, id)}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setDeleteConfirm(ENTITY, null)}
              />
            )}
          </CardContent>
        </Card>

        {/* Advances Report Section */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5" />
                Raport Avansuri
              </CardTitle>
              <div className="flex gap-2">
                <Select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  options={monthOptions}
                  className="w-48"
                />
                <Select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  options={periodOptions}
                  className="w-48"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {advancesData.advances.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nu exista avansuri inregistrate pentru perioada selectata.
              </p>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Salariat</th>
                        <th className="px-4 py-2 text-right font-medium">Nr. plati</th>
                        <th className="px-4 py-2 text-right font-medium">Total avansuri</th>
                      </tr>
                    </thead>
                    <tbody>
                      {advancesData.advances.map((item) => (
                        <tr key={item.employee.id} className="border-t">
                          <td className="px-4 py-2">
                            <div className="font-medium">{item.employee.full_name}</div>
                            {item.employee.position && (
                              <div className="text-xs text-muted-foreground">{item.employee.position}</div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right">{item.count}</td>
                          <td className="px-4 py-2 text-right font-semibold text-orange-600">
                            {item.total.toLocaleString('ro-RO')} RON
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-muted/30">
                      <tr className="border-t-2">
                        <td className="px-4 py-2 font-semibold">TOTAL</td>
                        <td className="px-4 py-2 text-right font-semibold">
                          {advancesData.advances.reduce((sum, a) => sum + a.count, 0)}
                        </td>
                        <td className="px-4 py-2 text-right font-bold text-lg text-orange-600">
                          {advancesData.total.toLocaleString('ro-RO')} RON
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Perioada: {selectedMonth}-{selectedPeriod === '1-15' ? '01' : '16'} - {selectedMonth}-{selectedPeriod === '1-15' ? '15' : new Date(Number(selectedMonth.split('-')[0]), Number(selectedMonth.split('-')[1]), 0).getDate()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialog.isOpen}
        onClose={() => closeDialog(ENTITY)}
        title={editingEmployee ? 'Editeaza salariat' : 'Salariat nou'}
      >
        <EmployeeForm
          employee={editingEmployee}
          isLoading={isMutating}
          onSubmit={handleSubmit}
          onCancel={() => closeDialog(ENTITY)}
        />
      </Dialog>
    </div>
  )
}
