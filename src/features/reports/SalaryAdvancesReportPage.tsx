import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Badge } from '@/components/ui'
import {
  ArrowLeft,
  Search,
  Loader2,
  Download,
  Calendar,
  Users,
  Wallet,
  TrendingDown
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { expensesWithDetailsQueryOptions, expenseCategoriesQueryOptions } from '@/features/expenses/queries'
import { employeesQueryOptions } from '@/features/employees/queries'

interface DateRange {
  start: string
  end: string
}

type PeriodPreset = 'first_half' | 'second_half' | 'full_month' | 'custom'

// Categorii considerate avans/salariu
const SALARY_CATEGORY_NAMES = ['avans salariu', 'avans', 'salariu', 'salarii']

export function SalaryAdvancesReportPage() {
  const { companyId } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('full_month')
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    return {
      start: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0],
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0],
    }
  })

  // Query data
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery(expensesWithDetailsQueryOptions(companyId))
  const { data: employees = [], isLoading: loadingEmployees } = useQuery(employeesQueryOptions(companyId))
  const { data: categories = [], isLoading: loadingCategories } = useQuery(expenseCategoriesQueryOptions(companyId))

  const isLoading = loadingExpenses || loadingEmployees || loadingCategories

  // Get salary-related category IDs
  const salaryCategoryIds = useMemo(() => {
    return categories
      .filter(c => SALARY_CATEGORY_NAMES.some(name => c.name.toLowerCase().includes(name)))
      .map(c => c.id)
  }, [categories])

  // Update date range when month or preset changes
  useEffect(() => {
    updateDateRange(selectedMonth, periodPreset)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateDateRange = (month: string, preset: PeriodPreset) => {
    const [year, monthNum] = month.split('-').map(Number)
    const lastDay = new Date(year, monthNum, 0).getDate()

    let start: string
    let end: string

    switch (preset) {
      case 'first_half':
        start = `${year}-${String(monthNum).padStart(2, '0')}-01`
        end = `${year}-${String(monthNum).padStart(2, '0')}-15`
        break
      case 'second_half':
        start = `${year}-${String(monthNum).padStart(2, '0')}-16`
        end = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`
        break
      case 'full_month':
      default:
        start = `${year}-${String(monthNum).padStart(2, '0')}-01`
        end = `${year}-${String(monthNum).padStart(2, '0')}-${lastDay}`
        break
    }

    setDateRange({ start, end })
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value
    setSelectedMonth(newMonth)
    if (periodPreset !== 'custom') {
      updateDateRange(newMonth, periodPreset)
    }
  }

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as PeriodPreset
    setPeriodPreset(preset)
    if (preset !== 'custom') {
      updateDateRange(selectedMonth, preset)
    }
  }

  // Filter salary-related expenses within date range
  const salaryExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Check if it's a salary category
      if (!exp.category_id || !salaryCategoryIds.includes(exp.category_id)) return false

      // Check date range
      const expDate = exp.date.split('T')[0]
      if (expDate < dateRange.start || expDate > dateRange.end) return false

      // Only include payments (not collections)
      if (exp.type !== 'payment') return false

      return true
    })
  }, [expenses, salaryCategoryIds, dateRange])

  // Group by employee
  const employeeSummaries = useMemo(() => {
    const summaryMap = new Map<string, {
      employeeId: string
      employeeName: string
      position: string | null
      advances: { date: string; amount: number; category: string; notes: string | null }[]
      totalAmount: number
    }>()

    // Initialize with all employees
    employees.forEach(emp => {
      summaryMap.set(emp.id, {
        employeeId: emp.id,
        employeeName: emp.full_name,
        position: emp.position,
        advances: [],
        totalAmount: 0,
      })
    })

    // Add "Fara salariat" entry for expenses without employee_id
    summaryMap.set('__no_employee__', {
      employeeId: '__no_employee__',
      employeeName: 'Fara salariat specificat',
      position: null,
      advances: [],
      totalAmount: 0,
    })

    // Process expenses
    salaryExpenses.forEach(exp => {
      const empId = exp.employee_id || '__no_employee__'
      let summary = summaryMap.get(empId)

      if (!summary) {
        // Employee was deleted but expense exists
        summary = {
          employeeId: empId,
          employeeName: 'Salariat sters',
          position: null,
          advances: [],
          totalAmount: 0,
        }
        summaryMap.set(empId, summary)
      }

      const category = categories.find(c => c.id === exp.category_id)
      summary.advances.push({
        date: exp.date,
        amount: exp.amount,
        category: category?.name || 'Necunoscut',
        notes: exp.notes,
      })
      summary.totalAmount += exp.amount
    })

    // Filter out employees with no advances and apply search
    return Array.from(summaryMap.values())
      .filter(s => s.totalAmount > 0)
      .filter(s => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        return s.employeeName.toLowerCase().includes(q)
      })
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [employees, salaryExpenses, categories, searchQuery])

  // Calculate totals
  const totals = useMemo(() => {
    return {
      totalEmployees: employeeSummaries.filter(s => s.employeeId !== '__no_employee__').length,
      totalAmount: employeeSummaries.reduce((sum, s) => sum + s.totalAmount, 0),
      totalTransactions: employeeSummaries.reduce((sum, s) => sum + s.advances.length, 0),
    }
  }, [employeeSummaries])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  }

  const periodOptions = [
    { value: 'first_half', label: '1-15 (Prima jumatate)' },
    { value: 'second_half', label: '16-31 (A doua jumatate)' },
    { value: 'full_month', label: 'Luna intreaga' },
    { value: 'custom', label: 'Personalizat' },
  ]

  return (
    <div>
      <Header title="Raport Avansuri Salariati" />
      <div className="p-6">
        {/* Back link */}
        <Link to="/rapoarte" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Inapoi la rapoarte
        </Link>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Salariati cu Avansuri</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">
                din {employees.length} salariati
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Avansuri</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(totals.totalAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {totals.totalTransactions} tranzactii
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Medie pe Salariat</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {totals.totalEmployees > 0
                  ? formatCurrency(totals.totalAmount / totals.totalEmployees)
                  : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                in perioada selectata
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 mb-4">
              {/* Month selector */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                  className="w-[180px]"
                />
              </div>

              {/* Period preset */}
              <div className="w-[200px]">
                <Select
                  value={periodPreset}
                  onChange={handlePresetChange}
                  options={periodOptions}
                />
              </div>

              {/* Custom date range (only if custom preset) */}
              {periodPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-[150px]"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-[150px]"
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cauta salariat..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Button variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>

            {/* Period info */}
            <div className="mt-4 text-sm text-muted-foreground">
              Perioada: <span className="font-medium">{formatDate(dateRange.start)}</span> - <span className="font-medium">{formatDate(dateRange.end)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Avansuri pe Salariati</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : employeeSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu exista avansuri sau salarii in perioada selectata.
                {salaryCategoryIds.length === 0 && (
                  <p className="mt-2 text-sm">
                    Nu aveti categorii de cheltuieli pentru avansuri/salarii.
                    Creati o categorie cu numele "Avans" sau "Salariu" din Setari.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Salariat</th>
                      <th className="px-4 py-3 text-center font-medium">Nr. Tranzactii</th>
                      <th className="px-4 py-3 text-right font-medium">Total</th>
                      <th className="px-4 py-3 text-left font-medium">Detalii</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSummaries.map((summary) => (
                      <tr key={summary.employeeId} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{summary.employeeName}</div>
                              {summary.position && (
                                <div className="text-xs text-muted-foreground">{summary.position}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline">{summary.advances.length}</Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-bold text-orange-600">
                            {formatCurrency(summary.totalAmount)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            {summary.advances.slice(0, 3).map((adv, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="text-muted-foreground">{formatDate(adv.date)}</span>
                                {' - '}
                                <span className="font-medium">{formatCurrency(adv.amount)}</span>
                                {' '}
                                <Badge variant="secondary" className="text-[10px]">{adv.category}</Badge>
                              </div>
                            ))}
                            {summary.advances.length > 3 && (
                              <div className="text-xs text-muted-foreground">
                                ... si inca {summary.advances.length - 3} tranzactii
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-semibold">
                      <td className="px-4 py-3">
                        TOTAL ({employeeSummaries.length} salariati)
                      </td>
                      <td className="px-4 py-3 text-center">
                        {totals.totalTransactions}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {formatCurrency(totals.totalAmount)}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
