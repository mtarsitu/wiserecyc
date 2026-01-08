import { useMemo, useState, useCallback, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Badge, Dialog, Label } from '@/components/ui'
import {
  ArrowLeft,
  Search,
  Loader2,
  Download,
  Recycle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Package,
  Eye,
  EyeOff,
  Scale
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuthContext } from '@/contexts/AuthContext'
import { acquisitionsQueryOptions } from '@/features/acquisitions/queries'
import { salesQueryOptions } from '@/features/sales/queries'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import type { AcquisitionType } from '@/types/database'

// Parola pentru a afisa achizitiile ascunse (zero sau director)
const HIDDEN_ACQUISITIONS_PASSWORD = '1234'

// Statistici pe tip de achizitie
interface AcquisitionStats {
  quantity: number
  amount: number
  avgPricePerKg: number
}

interface DEEESummary {
  supplierId: string
  supplierName: string
  isDeee: boolean
  totalAcquisitions: number
  totalAcquisitionsAmount: number
  totalQuantity: number
  materials: { name: string; quantity: number; amount: number }[]
  // Stats per acquisition type
  normalStats: AcquisitionStats
  zeroStats: AcquisitionStats
  directorStats: AcquisitionStats
  totalStats: AcquisitionStats
}

interface DateRange {
  start: string
  end: string
}

export function DEEEReportPage() {
  const { companyId } = useAuthContext()
  const [searchQuery, setSearchQuery] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({
    start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  })

  // State pentru achizitii ascunse
  const [showHiddenAcquisitions, setShowHiddenAcquisitions] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // Handler pentru Ctrl+M / Cmd+M
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') {
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
  const { data: acquisitions = [], isLoading: loadingAcquisitions } = useQuery(acquisitionsQueryOptions(companyId))
  const { data: _sales = [], isLoading: loadingSales } = useQuery(salesQueryOptions(companyId))
  const { data: suppliers = [], isLoading: loadingSuppliers } = useQuery(suppliersQueryOptions(companyId))

  const isLoading = loadingAcquisitions || loadingSales || loadingSuppliers

  // Get DEEE suppliers
  const deeeSuppliers = useMemo(() => {
    return suppliers.filter(s => s.is_deee)
  }, [suppliers])

  // Calculate DEEE acquisitions summary
  const deeeSummaries = useMemo((): DEEESummary[] => {
    const summaryMap = new Map<string, DEEESummary>()

    const emptyStats = (): AcquisitionStats => ({ quantity: 0, amount: 0, avgPricePerKg: 0 })

    // Filter acquisitions within date range from DEEE suppliers
    acquisitions.forEach(acq => {
      const acqDate = acq.date.split('T')[0]
      if (acqDate < dateRange.start || acqDate > dateRange.end) return

      const supplier = acq.supplier
      if (!supplier?.is_deee) return

      let summary = summaryMap.get(supplier.id)
      if (!summary) {
        summary = {
          supplierId: supplier.id,
          supplierName: supplier.name,
          isDeee: true,
          totalAcquisitions: 0,
          totalAcquisitionsAmount: 0,
          totalQuantity: 0,
          materials: [],
          normalStats: emptyStats(),
          zeroStats: emptyStats(),
          directorStats: emptyStats(),
          totalStats: emptyStats(),
        }
        summaryMap.set(supplier.id, summary)
      }

      summary.totalAcquisitions++

      // Aggregate materials
      const materialsMap = new Map<string, { name: string; quantity: number; amount: number }>()
      summary.materials.forEach(m => materialsMap.set(m.name, { ...m }))

      acq.items?.forEach(item => {
        const itemType = (item as typeof item & { acquisition_type?: AcquisitionType }).acquisition_type || 'normal'
        const qty = item.final_quantity || 0
        const amt = item.line_total || 0

        // Update stats per type
        if (itemType === 'zero') {
          summary!.zeroStats.quantity += qty
          summary!.zeroStats.amount += amt
        } else if (itemType === 'director') {
          summary!.directorStats.quantity += qty
          summary!.directorStats.amount += amt
        } else {
          summary!.normalStats.quantity += qty
          summary!.normalStats.amount += amt
        }

        // Total stats include all
        summary!.totalStats.quantity += qty
        summary!.totalStats.amount += amt

        // Only add to visible totals if showing hidden or item is normal
        if (showHiddenAcquisitions || itemType === 'normal') {
          summary!.totalAcquisitionsAmount += amt
          summary!.totalQuantity += qty

          const materialName = item.material?.name || 'Necunoscut'
          const existing = materialsMap.get(materialName) || { name: materialName, quantity: 0, amount: 0 }
          existing.quantity += qty
          existing.amount += amt
          materialsMap.set(materialName, existing)
        }
      })

      summary.materials = Array.from(materialsMap.values())
    })

    // Calculate average prices
    summaryMap.forEach(summary => {
      if (summary.normalStats.quantity > 0) {
        summary.normalStats.avgPricePerKg = summary.normalStats.amount / summary.normalStats.quantity
      }
      if (summary.zeroStats.quantity > 0) {
        summary.zeroStats.avgPricePerKg = summary.zeroStats.amount / summary.zeroStats.quantity
      }
      if (summary.directorStats.quantity > 0) {
        summary.directorStats.avgPricePerKg = summary.directorStats.amount / summary.directorStats.quantity
      }
      if (summary.totalStats.quantity > 0) {
        summary.totalStats.avgPricePerKg = summary.totalStats.amount / summary.totalStats.quantity
      }
    })

    return Array.from(summaryMap.values())
      .sort((a, b) => b.totalAcquisitionsAmount - a.totalAcquisitionsAmount)
  }, [acquisitions, dateRange, showHiddenAcquisitions])

  // Apply search filter
  const filteredSummaries = useMemo(() => {
    if (!searchQuery) return deeeSummaries
    const q = searchQuery.toLowerCase()
    return deeeSummaries.filter(s => s.supplierName.toLowerCase().includes(q))
  }, [deeeSummaries, searchQuery])

  // Calculate totals
  const totals = useMemo(() => {
    const normalStats: AcquisitionStats = { quantity: 0, amount: 0, avgPricePerKg: 0 }
    const zeroStats: AcquisitionStats = { quantity: 0, amount: 0, avgPricePerKg: 0 }
    const directorStats: AcquisitionStats = { quantity: 0, amount: 0, avgPricePerKg: 0 }
    const totalStats: AcquisitionStats = { quantity: 0, amount: 0, avgPricePerKg: 0 }

    filteredSummaries.forEach(s => {
      normalStats.quantity += s.normalStats.quantity
      normalStats.amount += s.normalStats.amount
      zeroStats.quantity += s.zeroStats.quantity
      zeroStats.amount += s.zeroStats.amount
      directorStats.quantity += s.directorStats.quantity
      directorStats.amount += s.directorStats.amount
      totalStats.quantity += s.totalStats.quantity
      totalStats.amount += s.totalStats.amount
    })

    // Calculate averages
    if (normalStats.quantity > 0) normalStats.avgPricePerKg = normalStats.amount / normalStats.quantity
    if (zeroStats.quantity > 0) zeroStats.avgPricePerKg = zeroStats.amount / zeroStats.quantity
    if (directorStats.quantity > 0) directorStats.avgPricePerKg = directorStats.amount / directorStats.quantity
    if (totalStats.quantity > 0) totalStats.avgPricePerKg = totalStats.amount / totalStats.quantity

    return {
      totalSuppliers: filteredSummaries.length,
      totalAcquisitions: filteredSummaries.reduce((sum, s) => sum + s.totalAcquisitions, 0),
      totalAmount: filteredSummaries.reduce((sum, s) => sum + s.totalAcquisitionsAmount, 0),
      totalQuantity: filteredSummaries.reduce((sum, s) => sum + s.totalQuantity, 0),
      normalStats,
      zeroStats,
      directorStats,
      totalStats,
    }
  }, [filteredSummaries])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatQuantity = (qty: number) => {
    return new Intl.NumberFormat('ro-RO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(qty) + ' kg'
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
      <Header title="Situatie DEEE" />
      <div className="p-6">
        {/* Back link */}
        <Link to="/rapoarte" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Inapoi la rapoarte
        </Link>

        {/* Stats cards - Normal data */}
        <div className="grid gap-4 md:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Furnizori DEEE</CardTitle>
              <Recycle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totals.totalSuppliers}</div>
              <p className="text-xs text-muted-foreground">
                din {deeeSuppliers.length} inregistrati
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cantitate Achizitionata</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatQuantity(showHiddenAcquisitions ? totals.totalStats.quantity : totals.normalStats.quantity)}
              </div>
              <p className="text-xs text-muted-foreground">
                {totals.totalAcquisitions} tranzactii
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
                {showHiddenAcquisitions ? 'toate achizitiile' : 'achizitii normale'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pret Mediu/kg</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(showHiddenAcquisitions ? totals.totalStats.avgPricePerKg : totals.normalStats.avgPricePerKg) > 0
                  ? formatCurrency(showHiddenAcquisitions ? totals.totalStats.avgPricePerKg : totals.normalStats.avgPricePerKg)
                  : '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                {showHiddenAcquisitions ? 'media pe toate materialele' : 'media pe materialele normale'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Hidden stats cards - visible after password */}
        {showHiddenAcquisitions && (
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Total General</CardTitle>
                <Eye className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-700">{formatQuantity(totals.totalStats.quantity)}</div>
                <p className="text-xs text-orange-600">
                  {formatCurrency(totals.totalStats.amount)} | {totals.totalStats.avgPricePerKg > 0 ? formatCurrency(totals.totalStats.avgPricePerKg) + '/kg' : '-'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Achizitii Normale</CardTitle>
                <Package className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-700">{formatQuantity(totals.normalStats.quantity)}</div>
                <p className="text-xs text-green-600">
                  {formatCurrency(totals.normalStats.amount)} | {totals.normalStats.avgPricePerKg > 0 ? formatCurrency(totals.normalStats.avgPricePerKg) + '/kg' : '-'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-yellow-700">Achizitii Zero</CardTitle>
                <EyeOff className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-700">{formatQuantity(totals.zeroStats.quantity)}</div>
                <p className="text-xs text-yellow-600">
                  {formatCurrency(totals.zeroStats.amount)} | {totals.zeroStats.avgPricePerKg > 0 ? formatCurrency(totals.zeroStats.avgPricePerKg) + '/kg' : '-'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-700">Achizitii Director</CardTitle>
                <EyeOff className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-700">{formatQuantity(totals.directorStats.quantity)}</div>
                <p className="text-xs text-purple-600">
                  {formatCurrency(totals.directorStats.amount)} | {totals.directorStats.avgPricePerKg > 0 ? formatCurrency(totals.directorStats.avgPricePerKg) + '/kg' : '-'}
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
                    placeholder="Cauta furnizor DEEE..."
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
            <CardTitle>Achizitii DEEE pe Furnizori</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSummaries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nu exista achizitii DEEE in perioada selectata.
                {deeeSuppliers.length === 0 && (
                  <p className="mt-2 text-sm">
                    Nu aveti furnizori marcati ca DEEE. Marcati un furnizor ca DEEE din pagina Furnizori.
                  </p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">Furnizor</th>
                      <th className="px-4 py-3 text-right font-medium">Nr. Achizitii</th>
                      <th className="px-4 py-3 text-right font-medium">Cantitate Totala</th>
                      <th className="px-4 py-3 text-right font-medium">Valoare Totala</th>
                      <th className="px-4 py-3 text-right font-medium">Pret Mediu/kg</th>
                      <th className="px-4 py-3 text-center font-medium">Tip</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSummaries.map((summary) => (
                      <tr key={summary.supplierId} className="border-b hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Recycle className="h-4 w-4 text-green-600" />
                            <div className="font-medium">{summary.supplierName}</div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {summary.totalAcquisitions}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {formatQuantity(summary.totalQuantity)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-orange-600">
                            {formatCurrency(summary.totalAcquisitionsAmount)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {summary.totalQuantity > 0
                            ? formatCurrency(summary.totalAcquisitionsAmount / summary.totalQuantity)
                            : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="default" className="bg-green-600">DEEE</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/50 font-semibold">
                      <td className="px-4 py-3">
                        TOTAL ({filteredSummaries.length} furnizori)
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totals.totalAcquisitions}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {formatQuantity(totals.totalQuantity)}
                      </td>
                      <td className="px-4 py-3 text-right text-orange-600">
                        {formatCurrency(totals.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {totals.totalQuantity > 0
                          ? formatCurrency(totals.totalAmount / totals.totalQuantity)
                          : '-'}
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
