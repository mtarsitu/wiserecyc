import { useMemo, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Card, CardContent, CardHeader, CardTitle, Badge, Dialog, Button } from '@/components/ui'
import {
  ShoppingCart,
  TrendingUp,
  Package,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Scale,
  ChevronDown,
  ChevronUp,
  Calendar,
  EyeOff,
  Eye,
  Wallet,
  Receipt
} from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { inventoryQueryOptions } from '@/features/inventory/queries'
import { acquisitionsQueryOptions } from '@/features/acquisitions/queries'
import { salesQueryOptions } from '@/features/sales/queries'
import { materialsQueryOptions } from '@/features/materials/queries'
import { expensesQueryOptions } from '@/features/expenses/queries'
import type { Material, AcquisitionType } from '@/types/database'

// Material category classification
const MATERIAL_CATEGORIES: Record<string, 'feros' | 'neferos' | 'deee' | 'altele'> = {
  'Fier': 'feros',
  'Otel inoxidabil': 'feros',
  'Alama': 'neferos',
  'Aluminiu': 'neferos',
  'Bronz': 'neferos',
  'Cablu aluminiu': 'neferos',
  'Cablu cupru': 'neferos',
  'Cositor': 'neferos',
  'Cupru': 'neferos',
  'Nichel': 'neferos',
  'Plumb': 'neferos',
  'Radiatoare aluminiu': 'neferos',
  'Radiatoare cupru': 'neferos',
  'Zinc': 'neferos',
  'Motoare electrice': 'neferos',
  'Transformatoare': 'neferos',
  'Electronice (DEEE)': 'deee',
  'Baterii auto': 'deee',
  'Hartie/Carton': 'altele',
  'Plastic': 'altele',
}

const CATEGORY_LABELS: Record<string, string> = {
  feros: 'Feroase',
  neferos: 'Neferoase',
  deee: 'DEEE',
  altele: 'Altele',
}

const CATEGORY_COLORS: Record<string, string> = {
  feros: 'bg-gray-100 text-gray-800',
  neferos: 'bg-amber-100 text-amber-800',
  deee: 'bg-green-100 text-green-800',
  altele: 'bg-blue-100 text-blue-800',
}

type MaterialCategoryType = 'feros' | 'neferos' | 'deee' | 'altele'

interface MaterialStats {
  materialId: string
  materialName: string
  category: MaterialCategoryType
  totalQuantity: number
  totalAmount: number
  avgPrice: number
}

interface CategoryStats {
  category: MaterialCategoryType
  label: string
  totalQuantity: number
  totalAmount: number
  avgPrice: number
  materials: MaterialStats[]
}

function getMaterialCategory(material: Material): MaterialCategoryType {
  if (material.category && ['feros', 'neferos', 'deee', 'altele'].includes(material.category)) {
    return material.category as MaterialCategoryType
  }
  return MATERIAL_CATEGORIES[material.name] || 'altele'
}

function formatCurrency(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
}

function formatQuantity(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' kg'
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('ro-RO', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num)
}

function getDateRange(period: 'today' | 'week' | 'month'): { start: Date; end: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (period) {
    case 'today':
      return { start: today, end: now }
    case 'week': {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + 1)
      return { start: startOfWeek, end: now }
    }
    case 'month': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return { start: startOfMonth, end: now }
    }
  }
}

function isInDateRange(dateStr: string, range: { start: Date; end: Date }): boolean {
  const date = new Date(dateStr)
  return date >= range.start && date <= range.end
}

function getCurrentMonthStart(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
}

function getPreviousMonthDates(): { start: string; end: string } {
  const now = new Date()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
  return {
    start: prevMonthStart.toISOString().split('T')[0],
    end: prevMonthEnd.toISOString().split('T')[0]
  }
}

export function DashboardPage() {
  const { companyId, profile } = useAuthContext()
  const [expandedPeriod, setExpandedPeriod] = useState<string | null>(null)
  const [detailDialog, setDetailDialog] = useState<{
    open: boolean
    data: MaterialStats[] | null
    title: string
    type: 'acquisition' | 'sale'
  }>({ open: false, data: null, title: '', type: 'acquisition' })

  // Hidden data toggle (Ctrl+M) - only for admin users
  const [showHiddenData, setShowHiddenData] = useState(false)
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  // Keyboard shortcut handler for Ctrl+M / Cmd+M to toggle hidden data view
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault()
      if (isAdmin) {
        setShowHiddenData(prev => !prev)
      }
    }
  }, [isAdmin])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Queries
  const { data: inventory = [], isLoading: isLoadingInventory } = useQuery(inventoryQueryOptions(companyId))
  const { data: acquisitions = [], isLoading: isLoadingAcquisitions } = useQuery(acquisitionsQueryOptions(companyId))
  const { data: sales = [], isLoading: isLoadingSales } = useQuery(salesQueryOptions(companyId))
  const { data: materials = [], isLoading: isLoadingMaterials } = useQuery(materialsQueryOptions())
  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery(expensesQueryOptions(companyId))

  const isLoading = isLoadingInventory || isLoadingAcquisitions || isLoadingSales || isLoadingMaterials || isLoadingExpenses

  // Material lookup map
  const materialMap = useMemo(() => {
    const map = new Map<string, Material>()
    materials.forEach(m => map.set(m.id, m))
    return map
  }, [materials])

  // Helper to check if item is hidden type
  const isHiddenItem = useCallback((item: { acquisition_type?: AcquisitionType }) => {
    return item.acquisition_type && item.acquisition_type !== 'normal'
  }, [])

  // Calculate overall average prices for acquisitions (ALWAYS includes all types for price calculation)
  const overallAcqAvgPrices = useMemo(() => {
    const result: Record<MaterialCategoryType, { avgPrice: number; quantity: number; amount: number; hiddenQuantity: number; hiddenAmount: number }> = {
      feros: { avgPrice: 0, quantity: 0, amount: 0, hiddenQuantity: 0, hiddenAmount: 0 },
      neferos: { avgPrice: 0, quantity: 0, amount: 0, hiddenQuantity: 0, hiddenAmount: 0 },
      deee: { avgPrice: 0, quantity: 0, amount: 0, hiddenQuantity: 0, hiddenAmount: 0 },
      altele: { avgPrice: 0, quantity: 0, amount: 0, hiddenQuantity: 0, hiddenAmount: 0 },
    }

    acquisitions.forEach(acq => {
      acq.items?.forEach(item => {
        const material = materialMap.get(item.material_id) || item.material
        if (!material) return

        const itemWithType = item as typeof item & { acquisition_type?: AcquisitionType }
        const category = getMaterialCategory(material)
        const qty = item.final_quantity || item.quantity || 0
        const amt = item.line_total || 0

        // Always include in totals for price calculation
        result[category].quantity += qty
        result[category].amount += amt

        // Track hidden amounts separately
        if (isHiddenItem(itemWithType)) {
          result[category].hiddenQuantity += qty
          result[category].hiddenAmount += amt
        }
      })
    })

    Object.keys(result).forEach(cat => {
      const c = cat as MaterialCategoryType
      result[c].avgPrice = result[c].quantity > 0 ? result[c].amount / result[c].quantity : 0
    })

    return result
  }, [acquisitions, materialMap, isHiddenItem])

  // Calculate overall average prices for sales
  const overallSaleAvgPrices = useMemo(() => {
    const result: Record<MaterialCategoryType, { avgPrice: number; quantity: number; amount: number }> = {
      feros: { avgPrice: 0, quantity: 0, amount: 0 },
      neferos: { avgPrice: 0, quantity: 0, amount: 0 },
      deee: { avgPrice: 0, quantity: 0, amount: 0 },
      altele: { avgPrice: 0, quantity: 0, amount: 0 },
    }

    sales.forEach(sale => {
      sale.items?.forEach(item => {
        const material = materialMap.get(item.material_id) || item.material
        if (!material) return

        const category = getMaterialCategory(material)
        const qty = item.final_quantity || item.quantity || 0
        const amt = item.line_total || 0

        result[category].quantity += qty
        result[category].amount += amt
      })
    })

    Object.keys(result).forEach(cat => {
      const c = cat as MaterialCategoryType
      result[c].avgPrice = result[c].quantity > 0 ? result[c].amount / result[c].quantity : 0
    })

    return result
  }, [sales, materialMap])

  // Calculate total expenses (excluding TRANSFER CASE)
  const totalExpenses = useMemo(() => {
    const currentMonthStart = getCurrentMonthStart()

    return expenses
      .filter(e => e.date >= currentMonthStart)
      .filter(e => !e.name?.toUpperCase().includes('TRANSFER'))
      .reduce((sum, e) => sum + (e.amount || 0), 0)
  }, [expenses])

  // Calculate period stats
  const calculatePeriodStats = useMemo(() => {
    return (period: 'today' | 'week' | 'month') => {
      const range = getDateRange(period)

      const periodAcquisitions = acquisitions.filter(a => isInDateRange(a.date, range))
      const periodSales = sales.filter(s => isInDateRange(s.date, range))

      // Calculate stats by category for acquisitions
      const acqMaterialStats = new Map<string, MaterialStats>()
      periodAcquisitions.forEach(acq => {
        acq.items?.forEach(item => {
          const material = materialMap.get(item.material_id) || item.material
          if (!material) return

          const category = getMaterialCategory(material)
          const key = item.material_id
          const existing = acqMaterialStats.get(key)

          if (existing) {
            existing.totalQuantity += item.final_quantity || item.quantity || 0
            existing.totalAmount += item.line_total || 0
          } else {
            acqMaterialStats.set(key, {
              materialId: item.material_id,
              materialName: material.name,
              category,
              totalQuantity: item.final_quantity || item.quantity || 0,
              totalAmount: item.line_total || 0,
              avgPrice: 0,
            })
          }
        })
      })

      // Calculate stats by category for sales
      const saleMaterialStats = new Map<string, MaterialStats>()
      periodSales.forEach(sale => {
        sale.items?.forEach(item => {
          const material = materialMap.get(item.material_id) || item.material
          if (!material) return

          const category = getMaterialCategory(material)
          const key = item.material_id
          const existing = saleMaterialStats.get(key)

          if (existing) {
            existing.totalQuantity += item.final_quantity || item.quantity || 0
            existing.totalAmount += item.line_total || 0
          } else {
            saleMaterialStats.set(key, {
              materialId: item.material_id,
              materialName: material.name,
              category,
              totalQuantity: item.final_quantity || item.quantity || 0,
              totalAmount: item.line_total || 0,
              avgPrice: 0,
            })
          }
        })
      })

      // Calculate average prices
      acqMaterialStats.forEach(stat => {
        stat.avgPrice = stat.totalQuantity > 0 ? stat.totalAmount / stat.totalQuantity : 0
      })
      saleMaterialStats.forEach(stat => {
        stat.avgPrice = stat.totalQuantity > 0 ? stat.totalAmount / stat.totalQuantity : 0
      })

      // Group by category
      const groupByCategory = (statsMap: Map<string, MaterialStats>): CategoryStats[] => {
        const categoryMap = new Map<MaterialCategoryType, CategoryStats>()

        ;(['feros', 'neferos', 'deee', 'altele'] as MaterialCategoryType[]).forEach(cat => {
          categoryMap.set(cat, {
            category: cat,
            label: CATEGORY_LABELS[cat],
            totalQuantity: 0,
            totalAmount: 0,
            avgPrice: 0,
            materials: [],
          })
        })

        statsMap.forEach(stat => {
          const catStats = categoryMap.get(stat.category)!
          catStats.totalQuantity += stat.totalQuantity
          catStats.totalAmount += stat.totalAmount
          catStats.materials.push(stat)
        })

        categoryMap.forEach(cat => {
          cat.avgPrice = cat.totalQuantity > 0 ? cat.totalAmount / cat.totalQuantity : 0
          cat.materials.sort((a, b) => b.totalAmount - a.totalAmount)
        })

        return Array.from(categoryMap.values())
      }

      return {
        acquisitions: {
          total: periodAcquisitions.reduce((sum, a) => sum + (a.total_amount || 0), 0),
          quantity: Array.from(acqMaterialStats.values()).reduce((sum, m) => sum + m.totalQuantity, 0),
          categories: groupByCategory(acqMaterialStats),
        },
        sales: {
          total: periodSales.reduce((sum, s) => sum + (s.total_amount || 0), 0),
          quantity: Array.from(saleMaterialStats.values()).reduce((sum, m) => sum + m.totalQuantity, 0),
          categories: groupByCategory(saleMaterialStats),
        },
      }
    }
  }, [acquisitions, sales, materialMap])

  const todayStats = useMemo(() => calculatePeriodStats('today'), [calculatePeriodStats])
  const weekStats = useMemo(() => calculatePeriodStats('week'), [calculatePeriodStats])
  const monthStats = useMemo(() => calculatePeriodStats('month'), [calculatePeriodStats])

  // Calculate main stats (existing logic)
  const stats = useMemo(() => {
    const currentMonthStart = getCurrentMonthStart()
    const { start: prevMonthStart, end: prevMonthEnd } = getPreviousMonthDates()

    const currentMonthAcquisitions = acquisitions.filter(a => a.date >= currentMonthStart)
    const prevMonthAcquisitions = acquisitions.filter(a => a.date >= prevMonthStart && a.date <= prevMonthEnd)

    const currentMonthSales = sales.filter(s => s.date >= currentMonthStart)
    const prevMonthSales = sales.filter(s => s.date >= prevMonthStart && s.date <= prevMonthEnd)

    const currentAcquisitionsTotal = currentMonthAcquisitions.reduce((sum, a) => sum + a.total_amount, 0)
    const prevAcquisitionsTotal = prevMonthAcquisitions.reduce((sum, a) => sum + a.total_amount, 0)

    const currentSalesTotal = currentMonthSales.reduce((sum, s) => sum + s.total_amount, 0)
    const prevSalesTotal = prevMonthSales.reduce((sum, s) => sum + s.total_amount, 0)

    const totalStock = inventory.reduce((sum, item) => sum + item.quantity, 0)
    const uniqueMaterials = new Set(inventory.map(item => item.material_id)).size

    const currentProfit = currentSalesTotal - currentAcquisitionsTotal
    const prevProfit = prevSalesTotal - prevAcquisitionsTotal

    const acquisitionsChange = prevAcquisitionsTotal > 0
      ? ((currentAcquisitionsTotal - prevAcquisitionsTotal) / prevAcquisitionsTotal * 100).toFixed(0)
      : currentAcquisitionsTotal > 0 ? '+100' : '0'

    const salesChange = prevSalesTotal > 0
      ? ((currentSalesTotal - prevSalesTotal) / prevSalesTotal * 100).toFixed(0)
      : currentSalesTotal > 0 ? '+100' : '0'

    const profitChange = prevProfit !== 0
      ? ((currentProfit - prevProfit) / Math.abs(prevProfit) * 100).toFixed(0)
      : currentProfit > 0 ? '+100' : currentProfit < 0 ? '-100' : '0'

    return [
      {
        name: 'Achizitii luna curenta',
        value: formatCurrency(currentAcquisitionsTotal),
        change: `${Number(acquisitionsChange) >= 0 ? '+' : ''}${acquisitionsChange}%`,
        trend: Number(acquisitionsChange) >= 0 ? 'up' : 'down',
        icon: ShoppingCart,
      },
      {
        name: 'Vanzari luna curenta',
        value: formatCurrency(currentSalesTotal),
        change: `${Number(salesChange) >= 0 ? '+' : ''}${salesChange}%`,
        trend: Number(salesChange) >= 0 ? 'up' : 'down',
        icon: TrendingUp,
      },
      {
        name: 'Stoc total',
        value: formatQuantity(totalStock),
        change: `${uniqueMaterials} materiale`,
        trend: 'neutral' as const,
        icon: Package,
      },
      {
        name: 'Profit luna curenta',
        value: formatCurrency(currentProfit),
        change: `${Number(profitChange) >= 0 ? '+' : ''}${profitChange}%`,
        trend: currentProfit >= 0 ? 'up' : 'down',
        icon: Banknote,
      },
    ]
  }, [inventory, acquisitions, sales])

  // Recent acquisitions (last 5)
  const recentAcquisitions = useMemo(() => {
    return [...acquisitions]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [acquisitions])

  // Recent sales (last 5)
  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
  }, [sales])

  const openMaterialDetails = (materials: MaterialStats[], categoryLabel: string, type: 'acquisition' | 'sale') => {
    setDetailDialog({
      open: true,
      data: materials,
      title: `${categoryLabel} - ${type === 'acquisition' ? 'Achizitii' : 'Vanzari'}`,
      type,
    })
  }

  const renderCategoryBadges = (
    categories: CategoryStats[],
    type: 'acquisition' | 'sale'
  ) => {
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {categories.map(cat => (
          cat.totalAmount > 0 && (
            <button
              key={cat.category}
              onClick={() => openMaterialDetails(cat.materials, cat.label, type)}
              className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-80 ${CATEGORY_COLORS[cat.category]}`}
            >
              {cat.label}
              <span className="font-bold">{formatNumber(cat.avgPrice)} RON/kg</span>
              <ChevronDown className="h-3 w-3" />
            </button>
          )
        ))}
      </div>
    )
  }

  const renderPeriodCard = (
    periodStats: ReturnType<typeof calculatePeriodStats>,
    periodKey: string,
    periodLabel: string
  ) => {
    const isExpanded = expandedPeriod === periodKey

    return (
      <Card className="cursor-pointer" onClick={() => setExpandedPeriod(isExpanded ? null : periodKey)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {periodLabel}
            </CardTitle>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Achizitii</div>
              <div className="text-lg font-bold text-destructive">{formatCurrency(periodStats.acquisitions.total)}</div>
              <div className="text-xs text-muted-foreground">{formatNumber(periodStats.acquisitions.quantity)} kg</div>
              {isExpanded && renderCategoryBadges(periodStats.acquisitions.categories, 'acquisition')}
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Vanzari</div>
              <div className="text-lg font-bold text-green-600">{formatCurrency(periodStats.sales.total)}</div>
              <div className="text-xs text-muted-foreground">{formatNumber(periodStats.sales.quantity)} kg</div>
              {isExpanded && renderCategoryBadges(periodStats.sales.categories, 'sale')}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6">
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

        {/* Main stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.name}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="flex items-center text-xs text-muted-foreground">
                        {stat.trend === 'up' && (
                          <ArrowUpRight className="mr-1 h-4 w-4 text-green-500" />
                        )}
                        {stat.trend === 'down' && (
                          <ArrowDownRight className="mr-1 h-4 w-4 text-red-500" />
                        )}
                        {stat.change}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Average Acquisition Prices */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Preturi Medii Achizitii (Total)
          </h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {(['feros', 'neferos', 'deee', 'altele'] as MaterialCategoryType[]).map(cat => (
              <Card key={cat} className="p-3">
                <div className="flex items-center justify-between">
                  <Badge className={CATEGORY_COLORS[cat]}>{CATEGORY_LABELS[cat]}</Badge>
                  <span className="text-sm font-bold">
                    {overallAcqAvgPrices[cat].quantity > 0
                      ? `${formatNumber(overallAcqAvgPrices[cat].avgPrice)} RON/kg`
                      : '-'
                    }
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatNumber(overallAcqAvgPrices[cat].quantity)} kg
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Average Sale Prices */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Preturi Medii Vanzari (Total)
          </h3>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            {(['feros', 'neferos', 'deee', 'altele'] as MaterialCategoryType[]).map(cat => (
              <Card key={cat} className="p-3">
                <div className="flex items-center justify-between">
                  <Badge className={CATEGORY_COLORS[cat]}>{CATEGORY_LABELS[cat]}</Badge>
                  <span className="text-sm font-bold text-green-600">
                    {overallSaleAvgPrices[cat].quantity > 0
                      ? `${formatNumber(overallSaleAvgPrices[cat].avgPrice)} RON/kg`
                      : '-'
                    }
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {formatNumber(overallSaleAvgPrices[cat].quantity)} kg
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cheltuieli luna curenta
              </CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingExpenses ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(totalExpenses)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fara transferuri intre case
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Period Stats - Today, Week, Month */}
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Activitate pe Perioade (click pentru detalii)
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            {renderPeriodCard(todayStats, 'today', 'Astazi')}
            {renderPeriodCard(weekStats, 'week', 'Saptamana aceasta')}
            {renderPeriodCard(monthStats, 'month', 'Luna aceasta')}
          </div>
        </div>

        {/* Recent transactions */}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Achizitii recente</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingAcquisitions ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentAcquisitions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nu exista achizitii recente. Adauga prima achizitie pentru a incepe.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentAcquisitions.map((acquisition) => {
                    const totalQty = acquisition.items?.reduce((sum, i) => sum + (i.final_quantity || i.quantity || 0), 0) || 0
                    const avgPrice = totalQty > 0 ? acquisition.total_amount / totalQty : 0
                    return (
                      <div
                        key={acquisition.id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {acquisition.supplier?.name || 'Furnizor necunoscut'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(acquisition.date).toLocaleDateString('ro-RO')}
                            {acquisition.receipt_number && ` - ${acquisition.receipt_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(totalQty)} kg • {formatNumber(avgPrice)} RON/kg
                          </p>
                        </div>
                        <p className="text-sm font-semibold">
                          {formatCurrency(acquisition.total_amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Vanzari recente</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingSales ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : recentSales.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nu exista vanzari recente. Adauga prima vanzare pentru a incepe.
                </p>
              ) : (
                <div className="space-y-3">
                  {recentSales.map((sale) => {
                    const totalQty = sale.items?.reduce((sum, i) => sum + (i.final_quantity || i.quantity || 0), 0) || 0
                    const avgPrice = totalQty > 0 ? sale.total_amount / totalQty : 0
                    return (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between border-b pb-2 last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {sale.client?.name || 'Client necunoscut'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.date).toLocaleDateString('ro-RO')}
                            {sale.scale_number && ` - ${sale.scale_number}`}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatNumber(totalQty)} kg • {formatNumber(avgPrice)} RON/kg
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-green-600">
                          {formatCurrency(sale.total_amount)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Material Details Dialog */}
      <Dialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, data: null, title: '', type: 'acquisition' })}
        title={detailDialog.title}
      >
        {detailDialog.data && (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Material</th>
                  <th className="text-right py-2">Cantitate</th>
                  <th className="text-right py-2">Pret mediu</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {detailDialog.data.map(mat => (
                  <tr key={mat.materialId} className="border-b">
                    <td className="py-2">{mat.materialName}</td>
                    <td className="text-right py-2">{formatNumber(mat.totalQuantity)} kg</td>
                    <td className="text-right py-2">{formatNumber(mat.avgPrice)} RON/kg</td>
                    <td className="text-right py-2 font-medium">{formatCurrency(mat.totalAmount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td className="py-2">TOTAL</td>
                  <td className="text-right py-2">
                    {formatNumber(detailDialog.data.reduce((sum, m) => sum + m.totalQuantity, 0))} kg
                  </td>
                  <td className="text-right py-2">-</td>
                  <td className="text-right py-2">
                    {formatCurrency(detailDialog.data.reduce((sum, m) => sum + m.totalAmount, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
            <div className="flex justify-end">
              <Button onClick={() => setDetailDialog({ open: false, data: null, title: '', type: 'acquisition' })}>
                Inchide
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  )
}
