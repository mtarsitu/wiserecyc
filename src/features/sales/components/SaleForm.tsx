import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Dialog } from '@/components/ui'
import { Plus, Trash2, Loader2, AlertTriangle, Truck, Scale } from 'lucide-react'
import { clientsQueryOptions } from '@/features/clients/queries'
import { materialsQueryOptions } from '@/features/materials/queries'
import { cashRegistersQueryOptions } from '@/features/cashier/queries'
import { availableInventoryQueryOptions } from '@/features/inventory/queries'
import { transportersQueryOptions } from '@/features/transporters/queries'
import { vehiclesQueryOptions, findVehicleByNumber, type VehicleWithRelations } from '@/features/vehicles/queries'
import { driversQueryOptions } from '@/features/drivers/queries'
import { useCreateClient } from '@/features/clients/mutations'
import { useCreateTransporter } from '@/features/transporters/mutations'
import { useCreateVehicle } from '@/features/vehicles/mutations'
import { useCreateDriver } from '@/features/drivers/mutations'
import { ClientForm } from '@/features/clients/components/ClientForm'
import { TransporterForm } from '@/features/transporters/components/TransporterForm'
import { VehicleForm } from '@/features/vehicles/components/VehicleForm'
import { DriverForm } from '@/features/drivers/components/DriverForm'
import { useScale } from '@/contexts/ScaleContext'
import type { SaleWithDetails } from '../queries'
import type { PaymentMethod, TransportType, SaleStatus, PaymentStatus, InsertTables } from '@/types/database'

interface SaleItemInput {
  id?: string
  material_id: string
  quantity: number
  impurities_kg: number  // Impurități în KG (UI input)
  impurities_percent: number  // Calculat automat pentru DB
  final_quantity: number
  price_per_ton_usd: number | null
  exchange_rate: number | null
  price_per_kg_ron: number
  line_total: number
  // Weight fields per line
  weight_brut: number | null
  weight_tara: number | null
  weight_brut_time: string | null
  weight_tara_time: string | null
}

interface FormData {
  date: string
  client_id: string
  payment_method: PaymentMethod | null
  payment_status: PaymentStatus  // Status încasare: unpaid, partial, paid
  partial_amount: number  // Suma încasată pentru încasări parțiale
  transport_type: TransportType | null
  transport_price: number
  transporter_id: string | null
  vehicle_id: string | null
  vehicle_number: string
  driver_id: string | null
  scale_number: string
  notes: string
  status: SaleStatus
  cash_register_id: string | null
  items: SaleItemInput[]
}

const emptyItem: SaleItemInput = {
  material_id: '',
  quantity: 0,
  impurities_kg: 0,  // Input în KG
  impurities_percent: 0,  // Calculat automat
  final_quantity: 0,
  price_per_ton_usd: null,
  exchange_rate: null,
  price_per_kg_ron: 0,
  line_total: 0,
  weight_brut: null,
  weight_tara: null,
  weight_brut_time: null,
  weight_tara_time: null,
}

const initialFormData: FormData = {
  date: new Date().toISOString().split('T')[0],
  client_id: '',
  payment_method: 'bank',
  payment_status: 'unpaid',
  partial_amount: 0,
  transport_type: 'intern',
  transport_price: 0,
  transporter_id: null,
  vehicle_id: null,
  vehicle_number: '',
  driver_id: null,
  scale_number: '',
  notes: '',
  status: 'pending',
  cash_register_id: null,
  items: [{ ...emptyItem }],
}

interface SaleFormProps {
  companyId: string
  sale?: SaleWithDetails | null
  isLoading?: boolean
  onSubmit: (data: FormData & { total_amount: number }) => void
  onCancel: () => void
}

export function SaleForm({ companyId, sale, isLoading, onSubmit, onCancel }: SaleFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [showClientDialog, setShowClientDialog] = useState(false)
  const [showTransporterDialog, setShowTransporterDialog] = useState(false)
  const [showVehicleDialog, setShowVehicleDialog] = useState(false)
  const [showDriverDialog, setShowDriverDialog] = useState(false)
  const [detectedVehicle, setDetectedVehicle] = useState<VehicleWithRelations | null>(null)
  const [isDetectingVehicle, setIsDetectingVehicle] = useState(false)

  // Global scale context
  const scale = useScale()

  const { data: clients = [] } = useQuery(clientsQueryOptions(companyId))
  const { data: materials = [] } = useQuery(materialsQueryOptions())
  const { data: cashRegisters = [] } = useQuery(cashRegistersQueryOptions(companyId))
  const { data: inventory = [] } = useQuery(availableInventoryQueryOptions(companyId))
  const { data: transporters = [] } = useQuery(transportersQueryOptions(companyId))
  const { data: vehicles = [] } = useQuery(vehiclesQueryOptions(companyId))
  const { data: drivers = [] } = useQuery(driversQueryOptions(companyId))
  const createClient = useCreateClient()
  const createTransporter = useCreateTransporter()
  const createVehicle = useCreateVehicle()
  const createDriver = useCreateDriver()

  // Calculate available stock per material (only from 'curte' location)
  const availableStock = useMemo(() => {
    const stock = new Map<string, number>()
    for (const item of inventory) {
      if (item.location_type === 'curte') {
        const current = stock.get(item.material_id) || 0
        stock.set(item.material_id, current + item.quantity)
      }
    }
    return stock
  }, [inventory])

  // Get stock for a specific material
  const getAvailableStock = (materialId: string): number => {
    return availableStock.get(materialId) || 0
  }

  // Check if item exceeds available stock
  const exceedsStock = (materialId: string, finalQuantity: number): boolean => {
    if (!materialId) return false
    const available = getAvailableStock(materialId)
    return finalQuantity > available
  }

  // Check if any item has stock issues
  const hasStockIssues = useMemo(() => {
    return formData.items.some(item =>
      item.material_id && exceedsStock(item.material_id, item.final_quantity)
    )
  }, [formData.items, availableStock])

  // Prepare options for selects
  const clientOptions = useMemo(() =>
    clients.map(c => ({ value: c.id, label: c.name })),
    [clients]
  )

  const materialOptions = useMemo(() =>
    materials.map(m => {
      const stock = getAvailableStock(m.id)
      return {
        value: m.id,
        label: `${m.name} (${stock.toFixed(2)} kg disponibil)`
      }
    }),
    [materials, availableStock]
  )

  const cashRegisterOptions = useMemo(() =>
    cashRegisters.map(r => ({
      value: r.id,
      label: `${r.name} (${r.type === 'cash' ? 'Numerar' : 'Banca'})`
    })),
    [cashRegisters]
  )

  const paymentMethodOptions = [
    { value: 'bank', label: 'Virament bancar' },
    { value: 'cash', label: 'Numerar' },
  ]

  const transportTypeOptions = [
    { value: 'intern', label: 'Transport intern (flota proprie)' },
    { value: 'extern', label: 'Transport extern (transportator)' },
  ]

  const transporterOptions = useMemo(() =>
    transporters.map(t => ({ value: t.id, label: t.name })),
    [transporters]
  )

  // Filter vehicles based on transport type
  const filteredVehicleOptions = useMemo(() => {
    if (formData.transport_type === 'intern') {
      // Own fleet vehicles
      return vehicles
        .filter(v => v.owner_type === 'own_fleet')
        .map(v => ({ value: v.id, label: `${v.vehicle_number} - ${v.vehicle_type || 'Vehicul'}` }))
    } else if (formData.transport_type === 'extern' && formData.transporter_id) {
      // Transporter vehicles
      return vehicles
        .filter(v => v.owner_type === 'transporter' && v.transporter_id === formData.transporter_id)
        .map(v => ({ value: v.id, label: `${v.vehicle_number} - ${v.vehicle_type || 'Vehicul'}` }))
    }
    return []
  }, [vehicles, formData.transport_type, formData.transporter_id])

  // Filter drivers based on transport type
  const filteredDriverOptions = useMemo(() => {
    if (formData.transport_type === 'intern') {
      // Own fleet drivers
      return drivers
        .filter(d => d.owner_type === 'own_fleet')
        .map(d => ({ value: d.id, label: d.name }))
    } else if (formData.transport_type === 'extern' && formData.transporter_id) {
      // Transporter drivers
      return drivers
        .filter(d => d.owner_type === 'transporter' && d.transporter_id === formData.transporter_id)
        .map(d => ({ value: d.id, label: d.name }))
    }
    return []
  }, [drivers, formData.transport_type, formData.transporter_id])

  const statusOptions = [
    { value: 'pending', label: 'In asteptare' },
    { value: 'reception_done', label: 'Receptie efectuata' },
    { value: 'cancelled', label: 'Anulat' },
  ]

  useEffect(() => {
    if (sale) {
      // Get payment_status from sale - cast to access the new field
      const saleWithPaymentStatus = sale as SaleWithDetails & { payment_status?: PaymentStatus }
      setFormData({
        date: sale.date.split('T')[0],
        client_id: sale.client_id || '',
        payment_method: sale.payment_method,
        payment_status: saleWithPaymentStatus.payment_status || 'unpaid',
        partial_amount: 0,  // Se va calcula din tranzacțiile existente dacă e nevoie
        transport_type: sale.transport_type,
        transport_price: sale.transport_price,
        transporter_id: sale.transporter_id || null,
        vehicle_id: sale.vehicle_id || null,
        vehicle_number: sale.vehicle?.vehicle_number || '',
        driver_id: sale.driver_id || null,
        scale_number: sale.scale_number || '',
        notes: sale.notes || '',
        status: sale.status,
        cash_register_id: null,
        items: sale.items.map((item) => {
          // Convert percent back to KG for display
          const impuritiesKg = item.quantity * (item.impurities_percent / 100)
          return {
            id: item.id,
            material_id: item.material_id,
            quantity: item.quantity,
            impurities_kg: impuritiesKg,
            impurities_percent: item.impurities_percent,
            final_quantity: item.final_quantity,
            price_per_ton_usd: item.price_per_ton_usd,
            exchange_rate: item.exchange_rate,
            price_per_kg_ron: item.price_per_kg_ron,
            line_total: item.line_total,
            // Weight fields per item
            weight_brut: null,
            weight_tara: null,
            weight_brut_time: null,
            weight_tara_time: null,
          }
        }),
      })
    } else {
      setFormData(initialFormData)
    }
  }, [sale])

  const totalAmount = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + item.line_total, 0)
  }, [formData.items])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target

    // Reset dependent fields when transport_type changes
    if (name === 'transport_type') {
      setFormData((prev) => ({
        ...prev,
        transport_type: value as TransportType,
        transporter_id: null,
        vehicle_id: null,
        driver_id: null,
      }))
      return
    }

    // Reset vehicle and driver when transporter changes
    if (name === 'transporter_id') {
      setFormData((prev) => ({
        ...prev,
        transporter_id: value || null,
        vehicle_id: null,
        driver_id: null,
      }))
      return
    }

    setFormData((prev) => ({ ...prev, [name]: value || null }))
  }

  const handleItemChange = (index: number, field: keyof SaleItemInput, value: string | number | null) => {
    setFormData((prev) => {
      const newItems = [...prev.items]
      const item = { ...newItems[index], [field]: value }

      // Recalculate final_quantity and line_total when relevant fields change
      // Impurities are now in KG, not percent
      if (field === 'quantity' || field === 'impurities_kg') {
        const quantity = field === 'quantity' ? Number(value) : item.quantity
        const impuritiesKg = field === 'impurities_kg' ? Number(value) : (item.impurities_kg || 0)
        // Calculate final quantity: quantity - impurities (in KG)
        item.final_quantity = Math.max(0, quantity - impuritiesKg)
        // Calculate percent for DB storage
        item.impurities_percent = quantity > 0 ? (impuritiesKg / quantity) * 100 : 0
        item.line_total = item.final_quantity * item.price_per_kg_ron
      }

      if (field === 'price_per_kg_ron' || field === 'final_quantity') {
        const finalQty = field === 'final_quantity' ? Number(value) : item.final_quantity
        const pricePerKg = field === 'price_per_kg_ron' ? Number(value) : item.price_per_kg_ron
        item.line_total = finalQty * pricePerKg
      }

      // Auto-calculate price_per_kg_ron from USD price and exchange rate
      if (field === 'price_per_ton_usd' || field === 'exchange_rate') {
        const priceUsd = field === 'price_per_ton_usd' ? Number(value) : item.price_per_ton_usd
        const rate = field === 'exchange_rate' ? Number(value) : item.exchange_rate
        if (priceUsd && rate) {
          item.price_per_kg_ron = (priceUsd * rate) / 1000 // Convert from ton to kg
          item.line_total = item.final_quantity * item.price_per_kg_ron
        }
      }

      newItems[index] = item
      return { ...prev, items: newItems }
    })
  }

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }))
  }

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData((prev) => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index),
      }))
    }
  }

  const handleClientSubmit = async (data: Omit<InsertTables<'clients'>, 'company_id' | 'id'>) => {
    try {
      const newClient = await createClient.mutateAsync(data)
      setFormData((prev) => ({ ...prev, client_id: newClient.id }))
      setShowClientDialog(false)
    } catch (error) {
      console.error('Error creating client:', error)
      alert('Eroare la crearea clientului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  // Auto-detect vehicle when vehicle number changes
  const handleVehicleNumberChange = useCallback(async (vehicleNumber: string) => {
    setFormData(prev => ({ ...prev, vehicle_number: vehicleNumber }))

    if (vehicleNumber.length >= 3) {
      setIsDetectingVehicle(true)
      try {
        const vehicle = await findVehicleByNumber(companyId, vehicleNumber)
        if (vehicle) {
          setDetectedVehicle(vehicle)
          setFormData(prev => ({
            ...prev,
            vehicle_id: vehicle.id,
            transporter_id: vehicle.transporter_id,
            transport_type: vehicle.owner_type === 'own_fleet' ? 'intern' : 'extern',
          }))
        } else {
          setDetectedVehicle(null)
          setFormData(prev => ({ ...prev, vehicle_id: null }))
        }
      } catch (error) {
        console.error('Error detecting vehicle:', error)
        setDetectedVehicle(null)
      }
      setIsDetectingVehicle(false)
    } else {
      setDetectedVehicle(null)
      setFormData(prev => ({ ...prev, vehicle_id: null }))
    }
  }, [companyId])

  const handleTransporterSubmit = async (data: { name: string; cui: string; phone: string; email: string; vehicle_number: string; notes: string }) => {
    try {
      const newTransporter = await createTransporter.mutateAsync({
        company_id: companyId,
        ...data,
      })
      setFormData((prev) => ({ ...prev, transporter_id: newTransporter.id }))
      setShowTransporterDialog(false)
    } catch (error) {
      console.error('Error creating transporter:', error)
      alert('Eroare la crearea transportatorului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleVehicleSubmit = async (data: {
    vehicle_number: string
    vehicle_type: string
    owner_type: 'own_fleet' | 'transporter' | 'supplier'
    transporter_id: string | null
    supplier_id: string | null
    driver_name: string
    notes: string
    has_transport_license: boolean
    transport_license_number: string | null
    transport_license_expiry: string | null
  }) => {
    try {
      const newVehicle = await createVehicle.mutateAsync({
        company_id: companyId,
        ...data,
      })
      setFormData((prev) => ({
        ...prev,
        vehicle_id: newVehicle.id,
        vehicle_number: newVehicle.vehicle_number,
      }))
      setDetectedVehicle(null)
      setShowVehicleDialog(false)
    } catch (error) {
      console.error('Error creating vehicle:', error)
      alert('Eroare la crearea vehiculului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDriverSubmit = async (data: {
    name: string
    id_series: string
    id_number: string
    phone: string
    owner_type: 'own_fleet' | 'transporter' | 'supplier'
    transporter_id: string | null
    supplier_id: string | null
    notes: string
  }) => {
    try {
      const newDriver = await createDriver.mutateAsync({
        company_id: companyId,
        ...data,
      })
      setFormData((prev) => ({ ...prev, driver_id: newDriver.id }))
      setShowDriverDialog(false)
    } catch (error) {
      console.error('Error creating driver:', error)
      alert('Eroare la crearea soferului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      transport_price: Number(formData.transport_price),
      total_amount: totalAmount,
      // Explicitly map only DB fields, excluding UI-only weight fields
      items: formData.items.map((item) => ({
        id: item.id,
        material_id: item.material_id,
        quantity: Number(item.quantity),
        impurities_percent: Number(item.impurities_percent),
        final_quantity: Number(item.final_quantity),
        price_per_ton_usd: item.price_per_ton_usd ? Number(item.price_per_ton_usd) : null,
        exchange_rate: item.exchange_rate ? Number(item.exchange_rate) : null,
        price_per_kg_ron: Number(item.price_per_kg_ron),
        line_total: Number(item.line_total),
        // These are UI-only, not saved to DB
        weight_brut: null,
        weight_tara: null,
        weight_brut_time: null,
        weight_tara_time: null,
      })),
    })
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header info */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="client_id">Client</Label>
            <div className="flex gap-2">
              <Select
                id="client_id"
                name="client_id"
                value={formData.client_id}
                onChange={handleChange}
                options={clientOptions}
                placeholder="Selecteaza client"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowClientDialog(true)}
                title="Adauga client nou"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_method">Metoda plata</Label>
            <Select
              id="payment_method"
              name="payment_method"
              value={formData.payment_method || ''}
              onChange={handleChange}
              options={paymentMethodOptions}
              placeholder="Selecteaza"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              options={statusOptions}
            />
          </div>
        </div>

        {/* Transport section */}
        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-5 w-5 text-primary" />
            <Label className="text-base font-semibold">Transport</Label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="transport_type">Tip transport</Label>
              <Select
                id="transport_type"
                value={formData.transport_type || ''}
                onChange={(e) => {
                  const value = e.target.value as TransportType
                  setFormData(prev => ({
                    ...prev,
                    transport_type: value,
                    transporter_id: value === 'intern' ? null : prev.transporter_id,
                    vehicle_id: null,
                    vehicle_number: '',
                    driver_id: null,
                  }))
                }}
                options={transportTypeOptions}
              />
            </div>

            {formData.transport_type === 'extern' && (
              <div className="space-y-2">
                <Label htmlFor="transporter_id">Transportator</Label>
                <div className="flex gap-2">
                  <Select
                    id="transporter_id"
                    value={formData.transporter_id || ''}
                    onChange={(e) => {
                      setFormData(prev => ({
                        ...prev,
                        transporter_id: e.target.value || null,
                        vehicle_id: null,
                        vehicle_number: '',
                        driver_id: null,
                      }))
                    }}
                    options={transporterOptions}
                    placeholder="Selecteaza transportator"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowTransporterDialog(true)}
                    title="Adauga transportator nou"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="vehicle_number">Nr. inmatriculare</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="vehicle_number"
                    value={formData.vehicle_number}
                    onChange={(e) => handleVehicleNumberChange(e.target.value.toUpperCase())}
                    placeholder="ex: B-123-ABC"
                    className={detectedVehicle ? 'border-green-500' : ''}
                  />
                  {isDetectingVehicle && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowVehicleDialog(true)}
                  title="Adauga vehicul nou"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {detectedVehicle && (
                <p className="text-xs text-green-600">
                  Vehicul detectat: {detectedVehicle.vehicle_type || 'N/A'}
                  {detectedVehicle.transporter?.name ? ` (${detectedVehicle.transporter.name})` : ''}
                </p>
              )}
              {!detectedVehicle && filteredVehicleOptions.length > 0 && (
                <Select
                  id="vehicle_id"
                  value={formData.vehicle_id || ''}
                  onChange={(e) => {
                    const vehicle = vehicles.find(v => v.id === e.target.value)
                    setFormData(prev => ({
                      ...prev,
                      vehicle_id: e.target.value || null,
                      vehicle_number: vehicle?.vehicle_number || prev.vehicle_number,
                    }))
                  }}
                  options={filteredVehicleOptions}
                  placeholder="Sau selecteaza vehicul"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="driver_id">Sofer</Label>
              <div className="flex gap-2">
                <Select
                  id="driver_id"
                  value={formData.driver_id || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, driver_id: e.target.value || null }))}
                  options={filteredDriverOptions}
                  placeholder="Selecteaza sofer"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDriverDialog(true)}
                  title="Adauga sofer nou"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="transport_price">Cost transport (RON)</Label>
              <Input
                id="transport_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.transport_price || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, transport_price: Number(e.target.value) || 0 }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="scale_number">Nr. cantar</Label>
              <Input
                id="scale_number"
                name="scale_number"
                value={formData.scale_number}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>


        {/* Scale indicator bar */}
        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
          <div className="flex items-center gap-3">
            <Scale className="h-5 w-5 text-primary" />
            <Label className="font-semibold">Cântar</Label>

            {/* Status indicator - green/red circle */}
            <div className={`h-3 w-3 rounded-full ${
              scale.isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} title={scale.isConnected ? 'Conectat' : 'Neconectat - conectați din Setări'} />

            {!scale.isConnected && (
              <span className="text-xs text-muted-foreground">
                Conectați cântarul din Setări
              </span>
            )}
          </div>

          {/* Live reading - always show when connected */}
          {scale.isConnected && (
            <div className="flex items-center gap-2 rounded-md bg-black px-4 py-2">
              <span className="font-mono text-xl font-bold text-green-400">
                {scale.lastReading ? `${scale.lastReading.value.toFixed(2)} ${scale.lastReading.unit}` : '0.00 kg'}
              </span>
            </div>
          )}
        </div>

        {/* Items table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Materiale vandute</Label>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1 h-4 w-4" />
              Adauga linie
            </Button>
          </div>

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Material</th>
                  <th className="px-3 py-2 text-right font-medium">Brut (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Tara (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Cantitate (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Impuritati (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Cant. finala</th>
                  <th className="px-3 py-2 text-right font-medium">Pret/kg (RON)</th>
                  <th className="px-3 py-2 text-right font-medium">Total (RON)</th>
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => {
                  const itemExceedsStock = item.material_id && exceedsStock(item.material_id, item.final_quantity)
                  const availableForItem = item.material_id ? getAvailableStock(item.material_id) : 0
                  return (
                    <tr key={index} className={`border-t ${itemExceedsStock ? 'bg-destructive/10' : ''}`}>
                    <td className="px-2 py-2">
                      <Select
                        value={item.material_id}
                        onChange={(e) => handleItemChange(index, 'material_id', e.target.value)}
                        options={materialOptions}
                        placeholder="Selecteaza"
                        className="w-full min-w-[120px]"
                      />
                    </td>
                    {/* Brut (masina plina) */}
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.weight_brut ?? ''}
                          onChange={(e) => {
                            const brut = parseFloat(e.target.value) || null
                            const tara = item.weight_tara
                            const net = brut !== null && tara !== null ? Math.max(0, brut - tara) : null
                            setFormData(prev => {
                              const newItems = [...prev.items]
                              const impuritiesKg = newItems[index].impurities_kg || 0
                              newItems[index] = {
                                ...newItems[index],
                                weight_brut: brut,
                                quantity: net ?? newItems[index].quantity,
                                final_quantity: net !== null ? Math.max(0, net - impuritiesKg) : newItems[index].final_quantity,
                                impurities_percent: net !== null && net > 0 ? (impuritiesKg / net) * 100 : 0,
                                line_total: net !== null ? Math.max(0, net - impuritiesKg) * newItems[index].price_per_kg_ron : newItems[index].line_total,
                              }
                              return { ...prev, items: newItems }
                            })
                          }}
                          className="text-right w-20"
                          title={item.weight_brut_time ? `Ora: ${new Date(item.weight_brut_time).toLocaleTimeString('ro-RO')}` : ''}
                        />
                        {scale.isConnected && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              if (scale.lastReading) {
                                const brut = scale.lastReading.value
                                const tara = item.weight_tara
                                const net = tara !== null ? Math.max(0, brut - tara) : null
                                setFormData(prev => {
                                  const newItems = [...prev.items]
                                  const impuritiesKg = newItems[index].impurities_kg || 0
                                  newItems[index] = {
                                    ...newItems[index],
                                    weight_brut: brut,
                                    weight_brut_time: new Date().toISOString(),
                                    quantity: net ?? newItems[index].quantity,
                                    final_quantity: net !== null ? Math.max(0, net - impuritiesKg) : newItems[index].final_quantity,
                                    impurities_percent: net !== null && net > 0 ? (impuritiesKg / net) * 100 : 0,
                                    line_total: net !== null ? Math.max(0, net - impuritiesKg) * newItems[index].price_per_kg_ron : newItems[index].line_total,
                                  }
                                  return { ...prev, items: newItems }
                                })
                              }
                            }}
                            title="Preia brut de la cântar"
                          >
                            <Truck className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                    {/* Tara (masina goala) */}
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.weight_tara ?? ''}
                          onChange={(e) => {
                            const tara = parseFloat(e.target.value) || null
                            const brut = item.weight_brut
                            const net = brut !== null && tara !== null ? Math.max(0, brut - tara) : null
                            setFormData(prev => {
                              const newItems = [...prev.items]
                              const impuritiesKg = newItems[index].impurities_kg || 0
                              newItems[index] = {
                                ...newItems[index],
                                weight_tara: tara,
                                quantity: net ?? newItems[index].quantity,
                                final_quantity: net !== null ? Math.max(0, net - impuritiesKg) : newItems[index].final_quantity,
                                impurities_percent: net !== null && net > 0 ? (impuritiesKg / net) * 100 : 0,
                                line_total: net !== null ? Math.max(0, net - impuritiesKg) * newItems[index].price_per_kg_ron : newItems[index].line_total,
                              }
                              return { ...prev, items: newItems }
                            })
                          }}
                          className="text-right w-20"
                          title={item.weight_tara_time ? `Ora: ${new Date(item.weight_tara_time).toLocaleTimeString('ro-RO')}` : ''}
                        />
                        {scale.isConnected && (
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-9 w-9 shrink-0"
                            onClick={() => {
                              if (scale.lastReading) {
                                const tara = scale.lastReading.value
                                const brut = item.weight_brut
                                const net = brut !== null ? Math.max(0, brut - tara) : null
                                setFormData(prev => {
                                  const newItems = [...prev.items]
                                  const impuritiesKg = newItems[index].impurities_kg || 0
                                  newItems[index] = {
                                    ...newItems[index],
                                    weight_tara: tara,
                                    weight_tara_time: new Date().toISOString(),
                                    quantity: net ?? newItems[index].quantity,
                                    final_quantity: net !== null ? Math.max(0, net - impuritiesKg) : newItems[index].final_quantity,
                                    impurities_percent: net !== null && net > 0 ? (impuritiesKg / net) * 100 : 0,
                                    line_total: net !== null ? Math.max(0, net - impuritiesKg) * newItems[index].price_per_kg_ron : newItems[index].line_total,
                                  }
                                  return { ...prev, items: newItems }
                                })
                              }
                            }}
                            title="Preia tara de la cântar"
                          >
                            <Truck className="h-4 w-4 opacity-50" />
                          </Button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="space-y-1">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className={`text-right ${itemExceedsStock ? 'border-destructive' : ''}`}
                        />
                        {itemExceedsStock && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Max: {availableForItem.toFixed(2)} kg
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.impurities_kg || ''}
                        onChange={(e) => handleItemChange(index, 'impurities_kg', e.target.value)}
                        className="text-right w-20"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-end">
                        <div className="rounded-md bg-green-100 px-3 py-2 text-right">
                          <span className="text-lg font-bold text-green-800">
                            {item.final_quantity.toFixed(2)}
                          </span>
                          <span className="ml-1 text-xs text-green-600">kg</span>
                        </div>
                        {item.quantity > 0 && Number(item.impurities_kg || 0) > 0 && (
                          <span className="text-xs text-muted-foreground mt-1">
                            -{Number(item.impurities_kg || 0).toFixed(2)} kg impurități
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price_per_kg_ron || ''}
                        onChange={(e) => handleItemChange(index, 'price_per_kg_ron', e.target.value)}
                        className="text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={item.line_total.toFixed(2)}
                        readOnly
                        className="text-right bg-muted/50 font-medium"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        disabled={formData.items.length === 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr className="border-t-2">
                  <td colSpan={7} className="px-3 py-2 text-right font-semibold">
                    Total vanzare:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-lg">
                    {totalAmount.toFixed(2)} RON
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Payment/Collection section - AFTER materials so user knows the total */}
        <div className="space-y-4 rounded-lg border-2 border-green-500/30 p-4 bg-green-50/50 dark:bg-green-950/20">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Încasare</Label>
            <div className="text-right">
              <span className="text-sm text-muted-foreground">Total de încasat:</span>
              <span className="ml-2 text-xl font-bold text-green-600">{totalAmount.toFixed(2)} RON</span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="payment_status">Status încasare *</Label>
              <Select
                id="payment_status"
                name="payment_status"
                value={formData.payment_status}
                onChange={(e) => {
                  const value = e.target.value as PaymentStatus
                  setFormData(prev => ({
                    ...prev,
                    payment_status: value,
                    partial_amount: value === 'partial' ? prev.partial_amount : (value === 'paid' ? totalAmount : 0),
                  }))
                }}
                options={[
                  { value: 'unpaid', label: 'Neîncasat' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'paid', label: 'Încasat' },
                ]}
              />
            </div>

            {formData.payment_status !== 'unpaid' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="partial_amount">
                    {formData.payment_status === 'paid' ? 'Sumă încasată' : 'Sumă încasată acum'} (RON) *
                  </Label>
                  <Input
                    id="partial_amount"
                    name="partial_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    max={totalAmount}
                    value={formData.payment_status === 'paid' ? totalAmount : (formData.partial_amount || '')}
                    onChange={(e) => setFormData(prev => ({ ...prev, partial_amount: Number(e.target.value) || 0 }))}
                    placeholder="0.00"
                    disabled={formData.payment_status === 'paid'}
                    className={formData.payment_status === 'paid' ? 'bg-muted' : ''}
                  />
                  {formData.payment_status === 'partial' && (
                    <p className="text-xs text-muted-foreground">
                      Rest de încasat: {(totalAmount - (formData.partial_amount || 0)).toFixed(2)} RON
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cash_register_id">Casa/Cont *</Label>
                  <Select
                    id="cash_register_id"
                    name="cash_register_id"
                    value={formData.cash_register_id || ''}
                    onChange={handleChange}
                    options={cashRegisterOptions}
                    placeholder="Selectează casa"
                  />
                  {cashRegisters.length === 0 && (
                    <p className="text-xs text-destructive">
                      Nu există case. Adaugă una din meniul Casierie.
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Observatii</Label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Stock warning */}
        {hasStockIssues && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Atentie: Cantitate depasita</p>
              <p>Unul sau mai multe materiale depasesc stocul disponibil. Vanzarea poate fi salvata, dar stocul va deveni negativ.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Anuleaza
          </Button>
          <Button type="submit" disabled={isLoading || formData.items.every((i) => !i.material_id)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {sale ? 'Salveaza modificarile' : 'Adauga vanzarea'}
          </Button>
        </div>
      </form>

      {/* Client Dialog */}
      <Dialog
        open={showClientDialog}
        onClose={() => setShowClientDialog(false)}
        title="Adauga client"
        maxWidth="3xl"
      >
        <ClientForm
          isLoading={createClient.isPending}
          onSubmit={handleClientSubmit}
          onCancel={() => setShowClientDialog(false)}
        />
      </Dialog>

      {/* Transporter Dialog */}
      <Dialog
        open={showTransporterDialog}
        onClose={() => setShowTransporterDialog(false)}
        title="Adauga transportator"
        maxWidth="md"
      >
        <TransporterForm
          isLoading={createTransporter.isPending}
          onSubmit={handleTransporterSubmit}
          onCancel={() => setShowTransporterDialog(false)}
        />
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog
        open={showVehicleDialog}
        onClose={() => setShowVehicleDialog(false)}
        title="Adauga vehicul"
        maxWidth="lg"
      >
        <VehicleForm
          companyId={companyId}
          defaultOwnerType={formData.transport_type === 'intern' ? 'own_fleet' : 'transporter'}
          defaultTransporterId={formData.transporter_id}
          simplified
          isLoading={createVehicle.isPending}
          onSubmit={handleVehicleSubmit}
          onCancel={() => setShowVehicleDialog(false)}
        />
      </Dialog>

      {/* Driver Dialog */}
      <Dialog
        open={showDriverDialog}
        onClose={() => setShowDriverDialog(false)}
        title="Adauga sofer"
        maxWidth="lg"
      >
        <DriverForm
          companyId={companyId}
          defaultOwnerType={formData.transport_type === 'intern' ? 'own_fleet' : 'transporter'}
          defaultTransporterId={formData.transporter_id}
          simplified
          isLoading={createDriver.isPending}
          onSubmit={handleDriverSubmit}
          onCancel={() => setShowDriverDialog(false)}
        />
      </Dialog>
    </>
  )
}
