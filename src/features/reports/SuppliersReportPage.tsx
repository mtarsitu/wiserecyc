import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Badge, Dialog, Label } from '@/components/ui'
import {
  ArrowLeft,
  Search,
  Loader2,
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  FileText,
  Building2,
  EyeOff,
  Eye
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import { acquisitionsQueryOptions } from '@/features/acquisitions/queries'
import { expensesQueryOptions } from '@/features/expenses/queries'
import { expenseCategoriesQueryOptions } from '@/features/expenses/queries'
import type { Supplier, AcquisitionType } from '@/types/database'

// Payment categories that count as supplier payments
const PAYMENT_CATEGORY_NAMES = ['AVANS MARFA', 'PLATA MARFA']

// Parola pentru a afisa achizitiile ascunse (zero sau director)
const HIDDEN_ACQUISITIONS_PASSWORD = '1234'

interface SupplierBalance {
  supplier: Supplier
  totalAcquisitions: number
  totalPayments: number
  balance: number // Positive = we owe them, Negative = they owe us
  acquisitionCount: number
  paymentCount: number
  lastAcquisitionDate: string | null
  lastPaymentDate: string | null
}

export function SuppliersReportPage() {
  const { companyId, profile } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'contract' | 'punct_lucru' | 'deee'>('all')
  const [filterBalance, setFilterBalance] = useState<'all' | 'owed' | 'paid'>('all')

  // Hidden data toggle (Ctrl+M) - only for admin users
  const [showHiddenData, setShowHiddenData] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Verificare parola
  const handlePasswordSubmit = () => {
    if (passwordInput === HIDDEN_ACQUISITIONS_PASSWORD) {
      setShowHiddenData(true)
      setPasswordDialogOpen(false)
      setPasswordInput('')
      setPasswordError('')
    } else {
      setPasswordError('Parola incorecta')
    }
  }

  // Keyboard shortcut handler for Ctrl+M / Cmd+M to toggle hidden data view
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault()
      if (isAdmin) {
        if (showHiddenData) {
          // Daca sunt deja vizibile, le ascundem direct
          setShowHiddenData(false)
        } else {
          // Deschide dialogul de parola
          setPasswordDialogOpen(true)
          setPasswordInput('')
          setPasswordError('')
        }
      }
    }
  }, [isAdmin, showHiddenData])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Helper to check if an acquisition item is hidden type
  const isHiddenItem = useCallback((item: { acquisition_type?: AcquisitionType }) => {
    return item.acquisition_type && item.acquisition_type !== 'normal'
  }, [])

  // Query all data
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery(suppliersQueryOptions(companyId))
  const { data: acquisitions = [], isLoading: loadingAcquisitions } = useQuery(acquisitionsQueryOptions(companyId))
  const { data: expenses = [], isLoading: loadingExpenses } = useQuery(expensesQueryOptions(companyId))
  const { data: categories = [], isLoading: loadingCategories } = useQuery(expenseCategoriesQueryOptions(companyId))

  const isLoading = loadingSuppliers || loadingAcquisitions || loadingExpenses || loadingCategories

  // Get payment category IDs
  const paymentCategoryIds = useMemo(() => {
    return categories
      .filter(c => PAYMENT_CATEGORY_NAMES.includes(c.name))
      .map(c => c.id)
  }, [categories])

  // Calculate balances for each supplier
  const supplierBalances = useMemo((): SupplierBalance[] => {
    return suppliers.map(supplier => {
      // Calculate total acquisitions from this supplier
      const supplierAcquisitions = acquisitions.filter(a => a.supplier_id === supplier.id)

      // Calculate total considering hidden items
      // If not showing hidden data, filter out hidden items from the total
      let totalAcquisitions = 0
      supplierAcquisitions.forEach(a => {
        if (a.items && a.items.length > 0) {
          a.items.forEach(item => {
            const itemWithType = item as typeof item & { acquisition_type?: AcquisitionType }
            // Include item if showing hidden data OR if it's a normal item
            if (showHiddenData || !isHiddenItem(itemWithType)) {
              totalAcquisitions += item.line_total || 0
            }
          })
        } else {
          // Fallback to total_amount if no items
          totalAcquisitions += a.total_amount || 0
        }
      })

      const acquisitionCount = supplierAcquisitions.length
      const lastAcquisition = [...supplierAcquisitions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]

      // Calculate payments from two sources:
      // 1. Acquisitions marked as "paid" directly (payment_status = 'paid')
      const paidAcquisitions = supplierAcquisitions.filter(a => a.payment_status === 'paid')

      // Calculate paid total considering hidden items
      let paidAcquisitionsTotal = 0
      paidAcquisitions.forEach(a => {
        if (a.items && a.items.length > 0) {
          a.items.forEach(item => {
            const itemWithType = item as typeof item & { acquisition_type?: AcquisitionType }
            if (showHiddenData || !isHiddenItem(itemWithType)) {
              paidAcquisitionsTotal += item.line_total || 0
            }
          })
        } else {
          paidAcquisitionsTotal += a.total_amount || 0
        }
      })

      const paidAcquisitionsCount = paidAcquisitions.length

      // 2. Expenses with payment categories (AVANS MARFA, PLATA MARFA) attributed to this supplier
      const supplierExpensePayments = expenses.filter(e => {
        // Must be a payment category
        if (!e.category_id || !paymentCategoryIds.includes(e.category_id)) return false

        // Check if expense is attributed to this supplier via punct_lucru or deee
        if (e.attribution_type === 'punct_lucru' || e.attribution_type === 'deee') {
          return e.attribution_id === supplier.id
        }

        return false
      })

      const expensePaymentsTotal = supplierExpensePayments.reduce((sum, e) => sum + (e.amount || 0), 0)
      const expensePaymentsCount = supplierExpensePayments.length

      // Total payments = paid acquisitions + expense payments
      const totalPayments = paidAcquisitionsTotal + expensePaymentsTotal
      const paymentCount = paidAcquisitionsCount + expensePaymentsCount

      // Find last payment date (from either source)
      const lastPaidAcquisition = [...paidAcquisitions].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]
      const lastExpensePayment = [...supplierExpensePayments].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      )[0]

      let lastPaymentDate: string | null = null
      if (lastPaidAcquisition && lastExpensePayment) {
        lastPaymentDate = new Date(lastPaidAcquisition.date) > new Date(lastExpensePayment.date)
          ? lastPaidAcquisition.date
          : lastExpensePayment.date
      } else if (lastPaidAcquisition) {
        lastPaymentDate = lastPaidAcquisition.date
      } else if (lastExpensePayment) {
        lastPaymentDate = lastExpensePayment.date
      }

      return {
        supplier,
        totalAcquisitions,
        totalPayments,
        balance: totalAcquisitions - totalPayments,
        acquisitionCount,
        paymentCount,
        lastAcquisitionDate: lastAcquisition?.date || null,
        lastPaymentDate,
      }
    })
  }, [suppliers, acquisitions, expenses, paymentCategoryIds, showHiddenData, isHiddenItem])

  // Apply filters
  const filteredBalances = useMemo(() => {
    return supplierBalances.filter(sb => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        if (!sb.supplier.name.toLowerCase().includes(q) &&
            !sb.supplier.cui?.toLowerCase().includes(q) &&
            !sb.supplier.city?.toLowerCase().includes(q)) {
          return false
        }
      }

      // Type filter
      if (filterType !== 'all') {
        if (filterType === 'contract' && !sb.supplier.is_contract) return false
        if (filterType === 'punct_lucru' && !sb.supplier.is_punct_lucru) return false
        if (filterType === 'deee' && !sb.supplier.is_deee) return false
      }

      // Balance filter
      if (filterBalance === 'owed' && sb.balance <= 0) return false
      if (filterBalance === 'paid' && sb.balance > 0) return false

      return true
    }).sort((a, b) => b.balance - a.balance) // Sort by balance descending
  }, [supplierBalances, searchQuery, filterType, filterBalance])

  // Calculate totals
  const totals = useMemo(() => {
    return filteredBalances.reduce((acc, sb) => ({
      totalAcquisitions: acc.totalAcquisitions + sb.totalAcquisitions,
      totalPayments: acc.totalPayments + sb.totalPayments,
      totalBalance: acc.totalBalance + sb.balance,
      suppliersWithBalance: acc.suppliersWithBalance + (sb.balance > 0 ? 1 : 0),
    }), {
      totalAcquisitions: 0,
      totalPayments: 0,
      totalBalance: 0,
      suppliersWithBalance: 0,
    })
  }, [filteredBalances])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (date: string | null) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('ro-RO')
  }

  const getSupplierType = (supplier: Supplier) => {
    const types = []
    if (supplier.is_contract) types.push('Contract')
    if (supplier.is_punct_lucru) types.push('Punct lucru')
    if (supplier.is_deee) types.push('DEEE')
    return types.join(', ') || 'Nespecificat'
  }

  const filterTypeOptions = [
    { value: 'all', label: 'Toate tipurile' },
    { value: 'contract', label: 'Contract/Licitatie' },
    { value: 'punct_lucru', label: 'Punct de lucru' },
    { value: 'deee', label: 'DEEE' },
  ]

  const filterBalanceOptions = [
    { value: 'all', label: 'Toate soldurile' },
    { value: 'owed', label: 'Cu sold de plata' },
    { value: 'paid', label: 'Platiti integral' },
  ]

  return (
    <div>
      <Header title="Situatie Furnizori" />
      <div className="p-6">
        {/* Back link */}
        <Link to="/rapoarte" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Inapoi la rapoarte
        </Link>

        {/* Hidden data mode indicator - only for admins */}
        {isAdmin && showHiddenData && (
          <div className="mb-4 flex items-center justify-between rounded-lg border-2 border-dashed border-orange-500 bg-orange-50 dark:bg-orange-950/20 px-4 py-2">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                Mod ascuns activ - Se afiseaza toate datele (inclusiv 0/D). Apasa Ctrl+M pentru a ascunde.
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHiddenData(false)}
              className="text-orange-600 hover:text-orange-700"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Stats cards */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Achizitii</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.totalAcquisitions)}</div>
              <p className="text-xs text-muted-foreground">
                de la {filteredBalances.length} furnizori
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plati</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totals.totalPayments)}</div>
              <p className="text-xs text-muted-foreground">
                plati efectuate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sold Total</CardTitle>
              {totals.totalBalance > 0 ? (
                <TrendingDown className="h-4 w-4 text-destructive" />
              ) : (
                <TrendingUp className="h-4 w-4 text-green-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.totalBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {formatCurrency(totals.totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.totalBalance > 0 ? 'de platit' : 'achitat'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Furnizori cu Sold</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.suppliersWithBalance}</div>
              <p className="text-xs text-muted-foreground">
                din {filteredBalances.length} furnizori
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Cauta dupa nume, CUI, localitate..."
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
              <div className="w-[180px]">
                <Select
                  value={filterBalance}
                  onChange={(e) => setFilterBalance(e.target.value as typeof filterBalance)}
                  options={filterBalanceOptions}
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
            <CardTitle>Detalii Furnizori</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredBalances.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu exista furnizori care sa corespunda criteriilor selectate.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Furnizor</th>
                      <th className="px-4 py-3 text-left font-medium">Tip</th>
                      <th className="px-4 py-3 text-right font-medium">Achizitii</th>
                      <th className="px-4 py-3 text-right font-medium">Plati</th>
                      <th className="px-4 py-3 text-right font-medium">Sold</th>
                      <th className="px-4 py-3 text-center font-medium">Ultima achizitie</th>
                      <th className="px-4 py-3 text-center font-medium">Ultima plata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBalances.map((sb) => (
                      <tr key={sb.supplier.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{sb.supplier.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {sb.supplier.city}{sb.supplier.county ? `, ${sb.supplier.county}` : ''}
                                {sb.supplier.cui && ` | CUI: ${sb.supplier.cui}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {getSupplierType(sb.supplier)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium">{formatCurrency(sb.totalAcquisitions)}</div>
                          <div className="text-xs text-muted-foreground">{sb.acquisitionCount} tranzactii</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium">{formatCurrency(sb.totalPayments)}</div>
                          <div className="text-xs text-muted-foreground">{sb.paymentCount} plati</div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold ${sb.balance > 0 ? 'text-destructive' : sb.balance < 0 ? 'text-green-600' : ''}`}>
                            {formatCurrency(sb.balance)}
                          </div>
                          {sb.balance > 0 && (
                            <Badge variant="destructive" className="text-xs">De plata</Badge>
                          )}
                          {sb.balance === 0 && sb.totalAcquisitions > 0 && (
                            <Badge variant="default" className="text-xs bg-green-600">Achitat</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {formatDate(sb.lastAcquisitionDate)}
                        </td>
                        <td className="px-4 py-3 text-center text-sm">
                          {formatDate(sb.lastPaymentDate)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>
                        TOTAL ({filteredBalances.length} furnizori)
                      </td>
                      <td className="px-4 py-3 text-right">{formatCurrency(totals.totalAcquisitions)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(totals.totalPayments)}</td>
                      <td className={`px-4 py-3 text-right ${totals.totalBalance > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        {formatCurrency(totals.totalBalance)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Password Dialog for Hidden Data */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false)
          setPasswordInput('')
          setPasswordError('')
        }}
        title="Afiseaza date ascunse"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Introduceti parola pentru a afisa achizitiile cu pret 0 sau de tip director.
          </p>
          <div className="space-y-2">
            <Label htmlFor="password">Parola</Label>
            <Input
              id="password"
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit()
                }
              }}
              placeholder="Introduceti parola"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false)
                setPasswordInput('')
                setPasswordError('')
              }}
            >
              Anuleaza
            </Button>
            <Button onClick={handlePasswordSubmit}>
              Afiseaza
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
