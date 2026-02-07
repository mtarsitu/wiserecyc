import { useMemo, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, Dialog, Label } from '@/components/ui'
import {
  ArrowLeft,
  Search,
  Loader2,
  Download,
  FileText,
  TrendingDown,
  Calendar,
  Package,
  Eye,
  EyeOff,
  Scale
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { contractsQueryOptions } from '@/features/contracts/queries'
import { acquisitionsQueryOptions } from '@/features/acquisitions/queries'
import { salesQueryOptions } from '@/features/sales/queries'
import type { Contract, Supplier, AcquisitionType } from '@/types/database'

// Parola pentru a afisa achizitiile ascunse (zero sau director)
const HIDDEN_ACQUISITIONS_PASSWORD = '1234'

interface AcquisitionStats {
  quantity: number
  amount: number
  avgPricePerKg: number
}

interface ContractSummary {
  contract: Contract & { supplier: Supplier | null }
  totalAcquisitions: number
  totalAcquisitionsAmount: number
  totalSales: number
  totalSalesAmount: number
  profit: number
  acquisitionItems: { materialName: string; quantity: number; amount: number }[]
  saleItems: { materialName: string; quantity: number; amount: number }[]
  // Statistici pe tipuri de achizitii
  normalStats: AcquisitionStats
  zeroStats: AcquisitionStats
  directorStats: AcquisitionStats
  totalStats: AcquisitionStats
}

interface DateRange {
  start: string
  end: string
}

export function ContractsReportPage() {
  const { companyId } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  // State pentru achizitii ascunse (zero/director)
  const [showHiddenAcquisitions, setShowHiddenAcquisitions] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Handler pentru Ctrl+Shift+H / Cmd+Shift+H
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      if (showHiddenAcquisitions) {
        setShowHiddenAcquisitions(false)
      } else {
        setPasswordDialogOpen(true)
        setPasswordInput('')
        setPasswordError('')
      }
    }
  }, [showHiddenAcquisitions])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Verificare parola
  const handlePasswordSubmit = () => {
    if (passwordInput === HIDDEN_ACQUISITIONS_PASSWORD) {
      setShowHiddenAcquisitions(true)
      setPasswordDialogOpen(false)
      setPasswordInput('')
      setPasswordError('')
    } else {
      setPasswordError('Parola incorecta')
    }
  }

  // Query all data
  const { data: contracts = [], isLoading: loadingContracts } = useQuery(contractsQueryOptions(companyId))
  const { data: acquisitions = [], isLoading: loadingAcquisitions } = useQuery(acquisitionsQueryOptions(companyId))
  const { data: sales = [], isLoading: loadingSales } = useQuery(salesQueryOptions(companyId))

  const isLoading = loadingContracts || loadingAcquisitions || loadingSales

  // Helper function to calculate stats
  const calculateStats = (items: { final_quantity: number; line_total: number }[]): AcquisitionStats => {
    const quantity = items.reduce((sum, item) => sum + (item.final_quantity || 0), 0)
    const amount = items.reduce((sum, item) => sum + (item.line_total || 0), 0)
    return {
      quantity,
      amount,
      avgPricePerKg: quantity > 0 ? amount / quantity : 0
    }
  }

  // Calculate summaries per contract
  const contractSummaries = useMemo((): ContractSummary[] => {
    return contracts.map(contract => {
      // Filter acquisitions for this contract within date range
      const contractAcquisitions = acquisitions.filter(a => {
        const acqDate = a.date.split('T')[0]
        const acq = a as typeof a & { contract_id?: string }
        return acq.contract_id === contract.id &&
          acqDate >= dateRange.start &&
          acqDate <= dateRange.end
      })

      // Filter sales for this contract within date range
      const contractSales = sales.filter(s => {
        const saleDate = s.date.split('T')[0]
        const sale = s as typeof s & { contract_id?: string }
        return sale.contract_id === contract.id &&
          saleDate >= dateRange.start &&
          saleDate <= dateRange.end
      })

      // Collect all acquisition items and categorize by type
      const normalItems: { final_quantity: number; line_total: number }[] = []
      const zeroItems: { final_quantity: number; line_total: number }[] = []
      const directorItems: { final_quantity: number; line_total: number }[] = []
      const allItems: { final_quantity: number; line_total: number }[] = []

      contractAcquisitions.forEach(acq => {
        acq.items?.forEach(item => {
          const itemData = { final_quantity: item.final_quantity || 0, line_total: item.line_total || 0 }
          allItems.push(itemData)

          const acqType = (item as typeof item & { acquisition_type?: AcquisitionType }).acquisition_type
          if (acqType === 'zero') {
            zeroItems.push(itemData)
          } else if (acqType === 'director') {
            directorItems.push(itemData)
          } else {
            normalItems.push(itemData)
          }
        })
      })

      // Calculate stats for each type
      const normalStats = calculateStats(normalItems)
      const zeroStats = calculateStats(zeroItems)
      const directorStats = calculateStats(directorItems)
      const totalStats = calculateStats(allItems)

      // Calculate acquisition totals (only normal items by default)
      const totalAcquisitionsAmount = showHiddenAcquisitions
        ? totalStats.amount
        : normalStats.amount

      // Calculate sale totals
      const totalSalesAmount = contractSales.reduce((sum, s) => sum + (s.total_amount || 0), 0)

      // Aggregate acquisition items by material (filtered by showHiddenAcquisitions)
      const acqItemsMap = new Map<string, { materialName: string; quantity: number; amount: number }>()
      contractAcquisitions.forEach(acq => {
        acq.items?.forEach(item => {
          const acqType = (item as typeof item & { acquisition_type?: AcquisitionType }).acquisition_type
          // Skip zero/director items unless showHiddenAcquisitions is true
          if (!showHiddenAcquisitions && (acqType === 'zero' || acqType === 'director')) {
            return
          }

          const materialName = item.material?.name || 'Necunoscut'
          const existing = acqItemsMap.get(materialName) || { materialName, quantity: 0, amount: 0 }
          existing.quantity += item.final_quantity || 0
          existing.amount += item.line_total || 0
          acqItemsMap.set(materialName, existing)
        })
      })

      // Aggregate sale items by material
      const saleItemsMap = new Map<string, { materialName: string; quantity: number; amount: number }>()
      contractSales.forEach(sale => {
        sale.items?.forEach(item => {
          const materialName = item.material?.name || 'Necunoscut'
          const existing = saleItemsMap.get(materialName) || { materialName, quantity: 0, amount: 0 }
          existing.quantity += item.quantity || 0
          existing.amount += item.line_total || 0
          saleItemsMap.set(materialName, existing)
        })
      })

      return {
        contract,
        totalAcquisitions: contractAcquisitions.length,
        totalAcquisitionsAmount,
        totalSales: contractSales.length,
        totalSalesAmount,
        profit: totalSalesAmount - totalAcquisitionsAmount,
        acquisitionItems: Array.from(acqItemsMap.values()),
        saleItems: Array.from(saleItemsMap.values()),
        normalStats,
        zeroStats,
        directorStats,
        totalStats,
      }
    }).filter(s => s.totalAcquisitions > 0 || s.totalSales > 0)
      .sort((a, b) => b.totalSalesAmount - a.totalSalesAmount)
  }, [contracts, acquisitions, sales, dateRange, showHiddenAcquisitions])

  // Apply search filter
  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return contractSummaries
    const q = searchQuery.toLowerCase()
    return contractSummaries.filter(s =>
      s.contract.contract_number?.toLowerCase().includes(q) ||
      s.contract.supplier?.name?.toLowerCase().includes(q)
    )
  }, [contractSummaries, searchQuery])

  // Calculate totals
  const totals = useMemo(() => {
    const normalQuantity = filteredSummaries.reduce((sum, s) => sum + s.normalStats.quantity, 0)
    const normalAmount = filteredSummaries.reduce((sum, s) => sum + s.normalStats.amount, 0)
    const zeroQuantity = filteredSummaries.reduce((sum, s) => sum + s.zeroStats.quantity, 0)
    const zeroAmount = filteredSummaries.reduce((sum, s) => sum + s.zeroStats.amount, 0)
    const directorQuantity = filteredSummaries.reduce((sum, s) => sum + s.directorStats.quantity, 0)
    const directorAmount = filteredSummaries.reduce((sum, s) => sum + s.directorStats.amount, 0)
    const totalQuantity = filteredSummaries.reduce((sum, s) => sum + s.totalStats.quantity, 0)
    const totalAmount = filteredSummaries.reduce((sum, s) => sum + s.totalStats.amount, 0)

    return {
      totalAcquisitions: filteredSummaries.reduce((sum, s) => sum + s.totalAcquisitions, 0),
      totalAcquisitionsAmount: filteredSummaries.reduce((sum, s) => sum + s.totalAcquisitionsAmount, 0),
      totalSales: filteredSummaries.reduce((sum, s) => sum + s.totalSales, 0),
      totalSalesAmount: filteredSummaries.reduce((sum, s) => sum + s.totalSalesAmount, 0),
      totalProfit: filteredSummaries.reduce((sum, s) => sum + s.profit, 0),
      // Statistici pe tipuri
      normalStats: {
        quantity: normalQuantity,
        amount: normalAmount,
        avgPricePerKg: normalQuantity > 0 ? normalAmount / normalQuantity : 0
      },
      zeroStats: {
        quantity: zeroQuantity,
        amount: zeroAmount,
        avgPricePerKg: zeroQuantity > 0 ? zeroAmount / zeroQuantity : 0
      },
      directorStats: {
        quantity: directorQuantity,
        amount: directorAmount,
        avgPricePerKg: directorQuantity > 0 ? directorAmount / directorQuantity : 0
      },
      totalStats: {
        quantity: totalQuantity,
        amount: totalAmount,
        avgPricePerKg: totalQuantity > 0 ? totalAmount / totalQuantity : 0
      }
    }
  }, [filteredSummaries])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

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
      <Header title="Situatie Contracte" />
      <div className="p-6">
        {/* Back link */}
        <Link to="/rapoarte" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Inapoi la rapoarte
        </Link>

        {/* Stats cards - Normal (always visible) */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cantitate Achizitionata</CardTitle>
              <Scale className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {(showHiddenAcquisitions ? totals.totalStats.quantity : totals.normalStats.quantity).toFixed(2)} kg
              </div>
              <p className="text-xs text-muted-foreground">
                {showHiddenAcquisitions ? 'toate achizitiile' : 'achizitii normale'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Plati</CardTitle>
              <TrendingDown className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(showHiddenAcquisitions ? totals.totalStats.amount : totals.normalStats.amount)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.totalAcquisitions} tranzactii
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pret Mediu/kg</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(showHiddenAcquisitions ? totals.totalStats.avgPricePerKg : totals.normalStats.avgPricePerKg).toFixed(2)} RON
              </div>
              <p className="text-xs text-muted-foreground">
                {showHiddenAcquisitions ? 'pentru toate achizitiile' : 'pentru achizitii normale'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-medium">Contracte Active</CardTitle>
                {showHiddenAcquisitions ? (
                  <Eye className="h-4 w-4 text-orange-500" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredSummaries.length}</div>
              <p className="text-xs text-muted-foreground">
                {showHiddenAcquisitions ? 'afisare completa' : 'Ctrl+M pentru toate'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Stats cards - Hidden (only visible after password) */}
        {showHiddenAcquisitions && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Total General</CardTitle>
                <Scale className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-700">
                  {totals.totalStats.quantity.toFixed(2)} kg
                </div>
                <p className="text-xs text-orange-600">
                  {formatCurrency(totals.totalStats.amount)} | {totals.totalStats.avgPricePerKg.toFixed(2)} RON/kg
                </p>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Achizitii Normale</CardTitle>
                <Package className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-700">
                  {totals.normalStats.quantity.toFixed(2)} kg
                </div>
                <p className="text-xs text-blue-600">
                  {formatCurrency(totals.normalStats.amount)} | {totals.normalStats.avgPricePerKg.toFixed(2)} RON/kg
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Achizitii Zero</CardTitle>
                <Package className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-700">
                  {totals.zeroStats.quantity.toFixed(2)} kg
                </div>
                <p className="text-xs text-purple-600">
                  {formatCurrency(totals.zeroStats.amount)} | {totals.zeroStats.avgPricePerKg.toFixed(2)} RON/kg
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Achizitii Director</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-700">
                  {totals.directorStats.quantity.toFixed(2)} kg
                </div>
                <p className="text-xs text-green-600">
                  {formatCurrency(totals.directorStats.amount)} | {totals.directorStats.avgPricePerKg.toFixed(2)} RON/kg
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
                    placeholder="Cauta contract sau furnizor..."
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
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle>Situatie pe Contracte</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu exista activitate pe contracte in perioada selectata.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Contract</th>
                      <th className="px-4 py-3 text-left font-medium">Furnizor</th>
                      <th className="px-4 py-3 text-right font-medium">Achizitii</th>
                      <th className="px-4 py-3 text-right font-medium">Vanzari</th>
                      <th className="px-4 py-3 text-right font-medium">Profit/Pierdere</th>
                      <th className="px-4 py-3 text-center font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummaries.map((summary) => (
                      <tr key={summary.contract.id} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <div className="font-medium">{summary.contract.contract_number}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {summary.contract.supplier?.name || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-orange-600">
                            {formatCurrency(summary.totalAcquisitionsAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {summary.totalAcquisitions} tranzactii
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-green-600">
                            {formatCurrency(summary.totalSalesAmount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {summary.totalSales} tranzactii
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className={`font-bold ${summary.profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                            {formatCurrency(summary.profit)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant={summary.contract.status === 'active' ? 'default' : 'secondary'}>
                            {summary.contract.status === 'active' ? 'Activ' : 'Inactiv'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-semibold">
                      <td className="px-4 py-3" colSpan={2}>
                        TOTAL ({filteredSummaries.length} contracte)
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {formatCurrency(totals.totalAcquisitionsAmount)}
                      </td>
                      <td className="px-4 py-3 text-right text-green-600">
                        {formatCurrency(totals.totalSalesAmount)}
                      </td>
                      <td className={`px-4 py-3 text-right ${totals.totalProfit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                        {formatCurrency(totals.totalProfit)}
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

      {/* Password Dialog for Hidden Acquisitions */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false)
          setPasswordInput('')
          setPasswordError('')
        }}
        title="Afiseaza achizitii ascunse"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Introduceti parola pentru a afisa achizitiile de tip zero si director.
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
