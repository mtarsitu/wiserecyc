import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Badge } from '@/components/ui'
import {
  ArrowLeft,
  Search,
  Loader2,
  Download,
  Receipt,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { expensesQueryOptions, expenseCategoriesQueryOptions } from '@/features/expenses/queries'
import type { Expense, ExpenseCategory } from '@/types/database'

interface CategorySummary {
  category: ExpenseCategory | null
  categoryName: string
  totalAmount: number
  paymentCount: number
  collectionCount: number
  netAmount: number // payments - collections
  expenses: Expense[]
}

interface DateRange {
  start: string
  end: string
}

export function ExpensesReportPage() {
  const { companyId } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })
  const [filterType, setFilterType] = useState<'all' | 'payment' | 'collection'>('all')

  // Query all data
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery(expensesQueryOptions(companyId))
  const { data: categories = [], isLoading: loadingCategories } = useQuery(expenseCategoriesQueryOptions(companyId))

  const isLoading = loadingExpenses || loadingCategories

  // Filter expenses by date range
  const filteredByDate = useMemo(() => {
    return expenses.filter(e => {
      const expenseDate = e.date.split('T')[0]
      return expenseDate >= dateRange.start && expenseDate <= dateRange.end
    })
  }, [expenses, dateRange])

  // Calculate summaries per category
  const categorySummaries = useMemo((): CategorySummary[] => {
    const categoryMap = new Map<string | null, CategorySummary>()

    // Initialize with all categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, {
        category: cat,
        categoryName: cat.name,
        totalAmount: 0,
        paymentCount: 0,
        collectionCount: 0,
        netAmount: 0,
        expenses: [],
      })
    })

    // Add "Fara categorie" entry
    categoryMap.set(null, {
      category: null,
      categoryName: 'Fara categorie',
      totalAmount: 0,
      paymentCount: 0,
      collectionCount: 0,
      netAmount: 0,
      expenses: [],
    })

    // Process expenses
    filteredByDate.forEach(expense => {
      const categoryId = expense.category_id || null
      let summary = categoryMap.get(categoryId)

      // If category doesn't exist (deleted?), add to "Fara categorie"
      if (!summary) {
        summary = categoryMap.get(null)!
      }

      summary.totalAmount += expense.amount || 0
      summary.expenses.push(expense)

      if (expense.type === 'payment') {
        summary.paymentCount++
        summary.netAmount += expense.amount || 0
      } else {
        summary.collectionCount++
        summary.netAmount -= expense.amount || 0
      }
    })

    // Convert to array and filter out empty categories
    return Array.from(categoryMap.values())
      .filter(s => s.expenses.length > 0)
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [filteredByDate, categories])

  // Apply search and type filters
  const filteredSummaries = useMemo(() => {
    return categorySummaries.filter(summary => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!summary.categoryName.toLowerCase().includes(q)) {
          return false
        }
      }

      // Type filter
      if (filterType === 'payment' && summary.paymentCount === 0) return false
      if (filterType === 'collection' && summary.collectionCount === 0) return false

      return true
    })
  }, [categorySummaries, searchQuery, filterType])

  // Calculate totals
  const totals = useMemo(() => {
    const allFiltered = filteredByDate.filter(e => {
      if (filterType === 'payment') return e.type === 'payment'
      if (filterType === 'collection') return e.type === 'collection'
      return true
    })

    const payments = allFiltered.filter(e => e.type === 'payment')
    const collections = allFiltered.filter(e => e.type === 'collection')

    return {
      totalPayments: payments.reduce((sum, e) => sum + (e.amount || 0), 0),
      totalCollections: collections.reduce((sum, e) => sum + (e.amount || 0), 0),
      paymentCount: payments.length,
      collectionCount: collections.length,
      netAmount: payments.reduce((sum, e) => sum + (e.amount || 0), 0) -
                 collections.reduce((sum, e) => sum + (e.amount || 0), 0),
      categoriesWithExpenses: filteredSummaries.length,
    }
  }, [filteredByDate, filteredSummaries, filterType])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const filterTypeOptions = [
    { value: 'all', label: 'Toate tipurile' },
    { value: 'payment', label: 'Doar plati' },
    { value: 'collection', label: 'Doar incasari' },
  ]

  // Quick date range presets
  const setQuickRange = (preset: 'thisMonth' | 'lastMonth' | 'thisYear' | 'all') => {
    const today = new Date()
    let start: Date
    let end: Date = today

    switch (preset) {
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 0)
        break
      case 'thisYear':
        start = new Date(today.getFullYear(), 0, 1)
        break
      case 'all':
        start = new Date(2020, 0, 1)
        break
    }

    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    })
  }

  return (
    <div>
      <Header title="Raport Cheltuieli pe Categorii" />
      <div className="p-6">
        {/* Back link */}
        <Link to="/rapoarte" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Inapoi la rapoarte
        </Link>

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plati</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totals.totalPayments)}</div>
              <p className="text-xs text-muted-foreground">
                {totals.paymentCount} tranzactii
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Incasari</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(totals.totalCollections)}</div>
              <p className="text-xs text-muted-foreground">
                {totals.collectionCount} tranzactii
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sold Net</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.netAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(totals.netAmount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.netAmount > 0 ? 'cheltuieli nete' : 'surplus net'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Categorii Active</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.categoriesWithExpenses}</div>
              <p className="text-xs text-muted-foreground">
                din {categories.length} categorii
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 mb-4">
              {/* Date range */}
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
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

              {/* Quick range buttons */}
              <div className="flex gap-1">
                <Button variant="outline" size="sm" onClick={() => setQuickRange('thisMonth')}>
                  Luna aceasta
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickRange('lastMonth')}>
                  Luna trecuta
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickRange('thisYear')}>
                  Anul acesta
                </Button>
                <Button variant="outline" size="sm" onClick={() => setQuickRange('all')}>
                  Tot
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cauta categorie..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-[180px]">
                <Select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as typeof filterType)}
                  options={filterTypeOptions}
                />
              </div>
              <Button variant="outline" disabled>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Cheltuieli pe Categorii</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu exista cheltuieli in perioada selectata.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Categorie</th>
                      <th className="px-4 py-3 text-right font-medium">Plati</th>
                      <th className="px-4 py-3 text-right font-medium">Incasari</th>
                      <th className="px-4 py-3 text-right font-medium">Total Suma</th>
                      <th className="px-4 py-3 text-right font-medium">Sold Net</th>
                      <th className="px-4 py-3 text-center font-medium">Nr. Tranzactii</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummaries.map((summary) => {
                      const paymentsTotal = summary.expenses
                        .filter(e => e.type === 'payment')
                        .reduce((sum, e) => sum + (e.amount || 0), 0)
                      const collectionsTotal = summary.expenses
                        .filter(e => e.type === 'collection')
                        .reduce((sum, e) => sum + (e.amount || 0), 0)

                      return (
                        <tr key={summary.category?.id || 'no-category'} className="border-b hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Receipt className="h-4 w-4 text-muted-foreground" />
                              <div className="font-medium">{summary.categoryName}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-medium text-destructive">
                              {formatCurrency(paymentsTotal)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.paymentCount} plati
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-medium text-green-600">
                              {formatCurrency(collectionsTotal)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {summary.collectionCount} incasari
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="font-medium">{formatCurrency(summary.totalAmount)}</div>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className={`font-bold ${summary.netAmount > 0 ? 'text-destructive' : summary.netAmount < 0 ? 'text-green-600' : ''}`}>
                              {formatCurrency(summary.netAmount)}
                            </div>
                            {summary.netAmount > 0 && (
                              <Badge variant="destructive" className="text-xs">Cheltuiala</Badge>
                            )}
                            {summary.netAmount < 0 && (
                              <Badge variant="default" className="text-xs bg-green-600">Surplus</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline">
                              {summary.expenses.length}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-semibold">
                      <td className="px-4 py-3">
                        TOTAL ({filteredSummaries.length} categorii)
                      </td>
                      <td className="px-4 py-3 text-right text-destructive">
                        {formatCurrency(totals.totalPayments)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatCurrency(totals.totalCollections)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(totals.totalPayments + totals.totalCollections)}
                      </td>
                      <td className={`px-4 py-3 text-right ${totals.netAmount > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {formatCurrency(totals.netAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {totals.paymentCount + totals.collectionCount}
                      </td>
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
