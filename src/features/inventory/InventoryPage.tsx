import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui'
import { Package, Loader2, Building2, FileText, Layers } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { inventoryQueryOptions, type InventoryWithMaterial } from './queries'

// Format number with thousands separator and 2 decimals
function formatQuantity(value: number): string {
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Get badge variant based on location type
function getLocationBadge(locationType: string) {
  switch (locationType) {
    case 'curte':
      return { label: 'Curte', variant: 'default' as const }
    case 'contract':
      return { label: 'Contract', variant: 'secondary' as const }
    case 'deee':
      return { label: 'DEEE', variant: 'outline' as const }
    default:
      return { label: locationType, variant: 'default' as const }
  }
}

// Calculate totals by location type
function calculateTotals(inventory: InventoryWithMaterial[]) {
  let curteTotal = 0
  let contractTotal = 0
  let deeeTotal = 0
  const contractTotals = new Map<string, { name: string; quantity: number }>()

  for (const item of inventory) {
    if (item.location_type === 'curte') {
      curteTotal += item.quantity
    } else if (item.location_type === 'contract') {
      contractTotal += item.quantity
      if (item.contract) {
        const existing = contractTotals.get(item.contract_id!)
        if (existing) {
          existing.quantity += item.quantity
        } else {
          contractTotals.set(item.contract_id!, {
            name: item.contract.contract_number || item.contract.description || 'Contract',
            quantity: item.quantity,
          })
        }
      }
    } else if (item.location_type === 'deee') {
      deeeTotal += item.quantity
    }
  }

  return {
    curteTotal,
    contractTotal,
    deeeTotal,
    grandTotal: curteTotal + contractTotal + deeeTotal,
    contractDetails: Array.from(contractTotals.entries()).map(([id, data]) => ({
      id,
      ...data,
    })),
  }
}

// Group inventory by material and calculate totals
function groupInventoryByMaterial(inventory: InventoryWithMaterial[]) {
  const grouped = new Map<string, {
    material: InventoryWithMaterial['material']
    totalQuantity: number
    locations: Array<{
      locationType: string
      contractId?: string
      contractName?: string
      quantity: number
    }>
  }>()

  for (const item of inventory) {
    const existing = grouped.get(item.material_id)
    const locationInfo = {
      locationType: item.location_type,
      contractId: item.contract_id || undefined,
      contractName: (item.contract?.contract_number || item.contract?.description) ?? undefined,
      quantity: item.quantity,
    }

    if (existing) {
      existing.totalQuantity += item.quantity
      existing.locations.push(locationInfo)
    } else {
      grouped.set(item.material_id, {
        material: item.material,
        totalQuantity: item.quantity,
        locations: [locationInfo],
      })
    }
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.material.name.localeCompare(b.material.name)
  )
}

// Filter inventory by location
function filterByLocation(inventory: InventoryWithMaterial[], filter: 'all' | 'curte' | 'contract' | 'deee', contractId?: string) {
  if (filter === 'all') return inventory
  if (filter === 'contract' && contractId) {
    return inventory.filter(item => item.location_type === 'contract' && item.contract_id === contractId)
  }
  return inventory.filter(item => item.location_type === filter)
}

export function InventoryPage() {
  const { companyId } = useAuthContext()
  const [activeTab, setActiveTab] = useState<'all' | 'curte' | 'contract'>('all')
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>()

  // Query
  const { data: inventory = [], isLoading } = useQuery(inventoryQueryOptions(companyId))

  // Calculate totals
  const totals = useMemo(() => calculateTotals(inventory), [inventory])

  // Filtered inventory based on active tab
  const filteredInventory = useMemo(() => {
    if (activeTab === 'contract' && selectedContractId) {
      return filterByLocation(inventory, 'contract', selectedContractId)
    }
    return filterByLocation(inventory, activeTab)
  }, [inventory, activeTab, selectedContractId])

  // Grouped inventory
  const groupedInventory = useMemo(() => groupInventoryByMaterial(filteredInventory), [filteredInventory])

  // Calculate filtered total
  const filteredTotal = useMemo(() => {
    return filteredInventory.reduce((sum, item) => sum + item.quantity, 0)
  }, [filteredInventory])

  return (
    <div>
      <Header title="Stocuri" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Inventar materiale</h2>
            <p className="text-sm text-muted-foreground">
              Vizualizeaza stocurile curente de materiale
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('all')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total General</p>
                  <p className="text-lg font-bold">{formatQuantity(totals.grandTotal)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => setActiveTab('curte')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stoc Curte</p>
                  <p className="text-lg font-bold">{formatQuantity(totals.curteTotal)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:border-primary transition-colors" onClick={() => { setActiveTab('contract'); setSelectedContractId(undefined); }}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stoc Contracte</p>
                  <p className="text-lg font-bold">{formatQuantity(totals.contractTotal)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Package className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Stoc DEEE</p>
                  <p className="text-lg font-bold">{formatQuantity(totals.deeeTotal)} kg</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contract breakdown if any */}
        {totals.contractDetails.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detaliere stocuri pe contracte</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {totals.contractDetails.map((contract) => (
                  <div
                    key={contract.id}
                    className={`p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors ${
                      activeTab === 'contract' && selectedContractId === contract.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => { setActiveTab('contract'); setSelectedContractId(contract.id); }}
                  >
                    <p className="text-xs text-muted-foreground truncate">{contract.name}</p>
                    <p className="font-semibold">{formatQuantity(contract.quantity)} kg</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                {activeTab === 'all' && 'Toate stocurile'}
                {activeTab === 'curte' && 'Stoc Curte'}
                {activeTab === 'contract' && (selectedContractId ? `Stoc Contract: ${totals.contractDetails.find(c => c.id === selectedContractId)?.name || ''}` : 'Stoc Contracte')}
                {' '}({groupedInventory.length} materiale)
              </CardTitle>
              <Badge variant="outline">{formatQuantity(filteredTotal)} kg</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : groupedInventory.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                {activeTab === 'all'
                  ? 'Nu exista stocuri inregistrate. Stocurile se actualizeaza automat la fiecare achizitie, vanzare sau dezmembrare.'
                  : `Nu exista stocuri pentru ${activeTab === 'curte' ? 'curte' : 'contracte'}.`
                }
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Material</TableHead>
                    {activeTab === 'all' && <TableHead>Locatie</TableHead>}
                    <TableHead className="text-right">Cantitate</TableHead>
                    {activeTab === 'all' && <TableHead className="text-right">Total Material</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTab === 'all' ? (
                    // Detailed view with locations
                    groupedInventory.map((group) => (
                      group.locations.map((location, locationIndex) => (
                        <TableRow key={`${group.material.id}-${location.locationType}-${locationIndex}`}>
                          {locationIndex === 0 ? (
                            <TableCell
                              className="font-medium"
                              rowSpan={group.locations.length}
                            >
                              {group.material.name}
                            </TableCell>
                          ) : null}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={getLocationBadge(location.locationType).variant}>
                                {getLocationBadge(location.locationType).label}
                              </Badge>
                              {location.contractName && (
                                <span className="text-xs text-muted-foreground">
                                  ({location.contractName})
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQuantity(location.quantity)} kg
                          </TableCell>
                          {locationIndex === 0 ? (
                            <TableCell
                              className="text-right font-semibold"
                              rowSpan={group.locations.length}
                            >
                              {formatQuantity(group.totalQuantity)} kg
                            </TableCell>
                          ) : null}
                        </TableRow>
                      ))
                    ))
                  ) : (
                    // Simple view for filtered data
                    groupedInventory.map((group) => (
                      <TableRow key={group.material.id}>
                        <TableCell className="font-medium">{group.material.name}</TableCell>
                        <TableCell className="text-right">{formatQuantity(group.totalQuantity)} kg</TableCell>
                      </TableRow>
                    ))
                  )}
                  {/* Total row */}
                  <TableRow className="bg-muted/50 font-semibold">
                    <TableCell colSpan={activeTab === 'all' ? 3 : 1}>TOTAL</TableCell>
                    <TableCell className="text-right">{formatQuantity(filteredTotal)} kg</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
