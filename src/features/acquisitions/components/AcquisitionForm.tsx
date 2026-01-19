import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Dialog } from '@/components/ui'
import { Plus, Trash2, Loader2, Eye, EyeOff, Truck, Scale } from 'lucide-react'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import { materialsQueryOptions } from '@/features/materials/queries'
import { cashRegistersQueryOptions } from '@/features/cashier/queries'
import { activeContractsQueryOptions } from '@/features/contracts/queries'
import { vehiclesQueryOptions, findVehicleByNumber, type VehicleWithRelations } from '@/features/vehicles/queries'
import { transportersQueryOptions } from '@/features/transporters/queries'
import { driversQueryOptions } from '@/features/drivers/queries'
import { useCreateSupplier } from '@/features/suppliers/mutations'
import { useCreateTransporter } from '@/features/transporters/mutations'
import { useCreateVehicle } from '@/features/vehicles/mutations'
import { useCreateDriver } from '@/features/drivers/mutations'
import { SupplierForm } from '@/features/suppliers/components/SupplierForm'
import { TransporterForm } from '@/features/transporters/components/TransporterForm'
import { VehicleForm } from '@/features/vehicles/components/VehicleForm'
import { DriverForm } from '@/features/drivers/components/DriverForm'
import { useScale } from '@/contexts/ScaleContext'
import type { AcquisitionWithDetails } from '../queries'
import type { PaymentStatus, InsertTables, LocationType, AcquisitionType, TransportType } from '@/types/database'

interface AcquisitionItemInput {
  id?: string
  material_id: string
  quantity: number
  impurities_percent: number
  final_quantity: number
  price_per_kg: number
  line_total: number
  acquisition_type: AcquisitionType
  // Weight fields per line
  weight_brut: number | null
  weight_tara: number | null
  weight_brut_time: string | null
  weight_tara_time: string | null
}

interface FormData {
  date: string
  supplier_id: string
  receipt_number: string
  payment_status: PaymentStatus
  cash_register_id: string | null
  location_type: LocationType
  contract_id: string | null
  environment_fund: number
  info: string
  notes: string
  items: AcquisitionItemInput[]
  // Transport fields
  vehicle_number: string
  vehicle_id: string | null
  transporter_id: string | null
  driver_id: string | null
  transport_type: TransportType
  transport_price: number
}

const emptyItem: AcquisitionItemInput = {
  material_id: '',
  quantity: 0,
  impurities_percent: 0,
  final_quantity: 0,
  price_per_kg: 0,
  line_total: 0,
  acquisition_type: 'normal',
  weight_brut: null,
  weight_tara: null,
  weight_brut_time: null,
  weight_tara_time: null,
}

const initialFormData: FormData = {
  date: new Date().toISOString().split('T')[0],
  supplier_id: '',
  receipt_number: '',
  payment_status: 'unpaid',
  cash_register_id: null,
  location_type: 'curte',
  contract_id: null,
  environment_fund: 0,
  info: '',
  notes: '',
  items: [{ ...emptyItem }],
  // Transport defaults
  vehicle_number: '',
  vehicle_id: null,
  transporter_id: null,
  driver_id: null,
  transport_type: 'intern',
  transport_price: 0,
}

// Options for acquisition type (hidden by default, shown with Ctrl+M)
const acquisitionTypeOptions = [
  { value: 'normal', label: 'Normal' },
  { value: 'zero', label: '0 - Plusuri (nu apare pe tichet)' },
  { value: 'director', label: 'D - Director (nu apare pe tichet)' },
]

interface AcquisitionFormProps {
  companyId: string
  acquisition?: AcquisitionWithDetails | null
  isLoading?: boolean
  onSubmit: (data: FormData & { total_amount: number }) => void
  onCancel: () => void
}

// Password for hidden options
const HIDDEN_OPTIONS_PASSWORD = '1234'

export function AcquisitionForm({ companyId, acquisition, isLoading, onSubmit, onCancel }: AcquisitionFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [showTransporterDialog, setShowTransporterDialog] = useState(false)
  const [showVehicleDialog, setShowVehicleDialog] = useState(false)
  const [showDriverDialog, setShowDriverDialog] = useState(false)
  const [showHiddenOptions, setShowHiddenOptions] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [detectedVehicle, setDetectedVehicle] = useState<VehicleWithRelations | null>(null)
  const [isDetectingVehicle, setIsDetectingVehicle] = useState(false)

  // Global scale context
  const scale = useScale()

  // Keyboard shortcut handler for Ctrl+Shift+H / Cmd+Shift+H to show hidden options
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      e.stopPropagation()
      if (showHiddenOptions) {
        // If already showing, just hide
        setShowHiddenOptions(false)
      } else {
        // Show password dialog
        setShowPasswordDialog(true)
        setPasswordInput('')
        setPasswordError(false)
      }
    }
  }, [showHiddenOptions])

  const handlePasswordSubmit = () => {
    if (passwordInput === HIDDEN_OPTIONS_PASSWORD) {
      setShowHiddenOptions(true)
      setShowPasswordDialog(false)
      setPasswordInput('')
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const { data: suppliers = [] } = useQuery(suppliersQueryOptions(companyId))
  const { data: materials = [] } = useQuery(materialsQueryOptions())
  const { data: cashRegisters = [] } = useQuery(cashRegistersQueryOptions(companyId))
  const { data: contracts = [] } = useQuery(activeContractsQueryOptions(companyId))
  const { data: vehicles = [] } = useQuery(vehiclesQueryOptions(companyId))
  const { data: transporters = [] } = useQuery(transportersQueryOptions(companyId))
  const { data: drivers = [] } = useQuery(driversQueryOptions(companyId))
  const createSupplier = useCreateSupplier()
  const createTransporter = useCreateTransporter()
  const createVehicle = useCreateVehicle()
  const createDriver = useCreateDriver()

  // Transporter options for dropdown
  const transporterOptions = useMemo(() =>
    transporters.map(t => ({ value: t.id, label: t.name })),
    [transporters]
  )

  // Transport type options
  const transportTypeOptions = [
    { value: 'intern', label: 'Transport intern (flota proprie)' },
    { value: 'extern', label: 'Transport extern' },
  ]

  // Filter vehicles based on transport type and transporter
  const filteredVehicleOptions = useMemo(() => {
    let filtered = vehicles
    if (formData.transport_type === 'intern') {
      filtered = vehicles.filter(v => v.owner_type === 'own_fleet')
    } else if (formData.transporter_id) {
      filtered = vehicles.filter(v => v.transporter_id === formData.transporter_id)
    }
    return filtered.map(v => ({
      value: v.id,
      label: `${v.vehicle_number}${v.driver_name ? ` - ${v.driver_name}` : ''}`
    }))
  }, [vehicles, formData.transport_type, formData.transporter_id])

  // Filter drivers based on selected vehicle or transport type
  const filteredDriverOptions = useMemo(() => {
    let filtered = drivers
    if (formData.transport_type === 'intern') {
      filtered = drivers.filter(d => d.owner_type === 'own_fleet')
    } else if (formData.transporter_id) {
      filtered = drivers.filter(d => d.transporter_id === formData.transporter_id)
    }
    return filtered.map(d => ({
      value: d.id,
      label: `${d.name}${d.id_series ? ` (${d.id_series} ${d.id_number})` : ''}`
    }))
  }, [drivers, formData.transport_type, formData.transporter_id])

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
          // Clear related fields if no match
          setFormData(prev => ({
            ...prev,
            vehicle_id: null,
          }))
        }
      } catch (error) {
        console.error('Error detecting vehicle:', error)
        setDetectedVehicle(null)
      }
      setIsDetectingVehicle(false)
    } else {
      setDetectedVehicle(null)
      setFormData(prev => ({
        ...prev,
        vehicle_id: null,
      }))
    }
  }, [companyId])

  // Prepare options for selects
  const supplierOptions = useMemo(() =>
    suppliers.map(s => ({ value: s.id, label: s.name })),
    [suppliers]
  )

  const materialOptions = useMemo(() =>
    materials.map(m => ({ value: m.id, label: m.name })),
    [materials]
  )

  const cashRegisterOptions = useMemo(() =>
    cashRegisters.map(r => ({
      value: r.id,
      label: `${r.name} (${r.type === 'cash' ? 'Numerar' : 'Banca'})`
    })),
    [cashRegisters]
  )

  const paymentStatusOptions = [
    { value: 'unpaid', label: 'Neplatit' },
    { value: 'partial', label: 'Partial' },
    { value: 'paid', label: 'Platit' },
  ]

  const locationTypeOptions = [
    { value: 'curte', label: 'Curte (stoc propriu)' },
    { value: 'contract', label: 'Contract' },
  ]

  const contractOptions = useMemo(() =>
    contracts.map(c => ({
      value: c.id,
      label: `${c.contract_number}${c.supplier ? ` - ${c.supplier.name}` : ''}`
    })),
    [contracts]
  )

  useEffect(() => {
    if (acquisition) {
      // Check if acquisition has extended fields (cast to access potential extra fields)
      const acq = acquisition as AcquisitionWithDetails & {
        location_type?: LocationType
        contract_id?: string | null
        vehicle_id?: string | null
        transporter_id?: string | null
        driver_id?: string | null
        transport_type?: TransportType
        transport_price?: number
        vehicle?: { vehicle_number: string } | null
      }

      // Check if any item has hidden type
      const hasHiddenItems = acquisition.items.some((item) => {
        const itemWithType = item as typeof item & { acquisition_type?: AcquisitionType }
        return itemWithType.acquisition_type && itemWithType.acquisition_type !== 'normal'
      })

      setFormData({
        date: acquisition.date.split('T')[0],
        supplier_id: acquisition.supplier_id || '',
        receipt_number: acquisition.receipt_number || '',
        payment_status: acquisition.payment_status,
        cash_register_id: null,
        location_type: acq.location_type || 'curte',
        contract_id: acq.contract_id || null,
        environment_fund: acquisition.environment_fund,
        info: acquisition.info || '',
        notes: acquisition.notes || '',
        // Transport fields
        vehicle_number: acq.vehicle?.vehicle_number || '',
        vehicle_id: acq.vehicle_id || null,
        transporter_id: acq.transporter_id || null,
        driver_id: acq.driver_id || null,
        transport_type: acq.transport_type || 'intern',
        transport_price: acq.transport_price || 0,
        items: acquisition.items.map((item) => {
          const itemWithType = item as typeof item & { acquisition_type?: AcquisitionType }
          return {
            id: item.id,
            material_id: item.material_id,
            quantity: item.quantity,
            impurities_percent: item.impurities_percent,
            final_quantity: item.final_quantity,
            price_per_kg: item.price_per_kg,
            line_total: item.line_total,
            acquisition_type: itemWithType.acquisition_type || 'normal',
            // Weight fields per item
            weight_brut: null,
            weight_tara: null,
            weight_brut_time: null,
            weight_tara_time: null,
          }
        }),
      })

      // If editing items with hidden type, show hidden options
      if (hasHiddenItems) {
        setShowHiddenOptions(true)
      }
    } else {
      setFormData(initialFormData)
    }
  }, [acquisition])

  const totalAmount = useMemo(() => {
    return formData.items.reduce((sum, item) => sum + item.line_total, 0)
  }, [formData.items])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index: number, field: keyof AcquisitionItemInput, value: string | number) => {
    setFormData((prev) => {
      const newItems = [...prev.items]
      const item = { ...newItems[index], [field]: value }

      // Recalculate final_quantity and line_total when relevant fields change
      if (field === 'quantity' || field === 'impurities_percent') {
        const quantity = field === 'quantity' ? Number(value) : item.quantity
        const impurities = field === 'impurities_percent' ? Number(value) : item.impurities_percent
        item.final_quantity = quantity * (1 - impurities / 100)
        item.line_total = item.final_quantity * item.price_per_kg
      }

      if (field === 'price_per_kg' || field === 'final_quantity') {
        const finalQty = field === 'final_quantity' ? Number(value) : item.final_quantity
        const pricePerKg = field === 'price_per_kg' ? Number(value) : item.price_per_kg
        item.line_total = finalQty * pricePerKg
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

  const handleSupplierSubmit = async (data: Omit<InsertTables<'suppliers'>, 'company_id' | 'id'>) => {
    try {
      const newSupplier = await createSupplier.mutateAsync(data)
      // Set the new supplier as selected
      setFormData((prev) => ({ ...prev, supplier_id: newSupplier.id }))
      setShowSupplierDialog(false)
    } catch (error) {
      console.error('Error creating supplier:', error)
      alert('Eroare la crearea furnizorului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleTransporterSubmit = async (data: { name: string; cui: string; phone: string; email: string; vehicle_number: string; notes: string }) => {
    try {
      const newTransporter = await createTransporter.mutateAsync({
        company_id: companyId,
        ...data,
      })
      // Set the new transporter as selected
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
      // Set the new vehicle as selected and update vehicle_number
      setFormData((prev) => ({
        ...prev,
        vehicle_id: newVehicle.id,
        vehicle_number: newVehicle.vehicle_number,
      }))
      setDetectedVehicle(null) // Clear detection state
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
      // Set the new driver as selected
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
      environment_fund: Number(formData.environment_fund),
      total_amount: totalAmount,
      items: formData.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        impurities_percent: Number(item.impurities_percent),
        final_quantity: Number(item.final_quantity),
        price_per_kg: Number(item.price_per_kg),
        line_total: Number(item.line_total),
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
            <Label htmlFor="supplier_id">Furnizor</Label>
            <div className="flex gap-2">
              <Select
                id="supplier_id"
                name="supplier_id"
                value={formData.supplier_id}
                onChange={handleChange}
                options={supplierOptions}
                placeholder="Selecteaza furnizor"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowSupplierDialog(true)}
                title="Adauga furnizor nou"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="receipt_number">Nr. bon/factura</Label>
            <Input
              id="receipt_number"
              name="receipt_number"
              value={formData.receipt_number}
              onChange={handleChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment_status">Status plata *</Label>
            <Select
              id="payment_status"
              name="payment_status"
              value={formData.payment_status}
              onChange={handleChange}
              options={paymentStatusOptions}
            />
          </div>
        </div>

        {/* Hidden options indicator - shown only with Ctrl+M */}
        {showHiddenOptions && (
          <div className="flex items-center justify-between rounded-lg border-2 border-dashed border-orange-500 bg-orange-50 dark:bg-orange-950/20 px-4 py-2">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700 dark:text-orange-400">
                Mod ascuns activ - coloana "Tip" este vizibila in tabel (Ctrl+Shift+H pentru a ascunde)
              </span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHiddenOptions(false)}
              className="text-orange-600 hover:text-orange-700"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Location type and contract selector */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="location_type">Destinatie stoc *</Label>
            <Select
              id="location_type"
              name="location_type"
              value={formData.location_type}
              onChange={(e) => {
                const value = e.target.value as LocationType
                setFormData(prev => ({
                  ...prev,
                  location_type: value,
                  contract_id: value === 'curte' ? null : prev.contract_id
                }))
              }}
              options={locationTypeOptions}
            />
            <p className="text-xs text-muted-foreground">
              {formData.location_type === 'curte'
                ? 'Materialele vor fi adaugate in stocul de curte'
                : 'Materialele vor fi adaugate pe contractul selectat'}
            </p>
          </div>

          {formData.location_type === 'contract' && (
            <div className="space-y-2">
              <Label htmlFor="contract_id">Contract *</Label>
              <Select
                id="contract_id"
                name="contract_id"
                value={formData.contract_id || ''}
                onChange={handleChange}
                options={contractOptions}
                placeholder="Selecteaza contract"
              />
              {contracts.length === 0 && (
                <p className="text-xs text-destructive">
                  Nu exista contracte active. Adauga un contract din meniul Contracte.
                </p>
              )}
            </div>
          )}
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
                value={formData.transport_type}
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

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>
        </div>

        {/* Cash register selector - only show when paid */}
        {formData.payment_status === 'paid' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash_register_id">Casa/Cont pentru plata</Label>
              <Select
                id="cash_register_id"
                name="cash_register_id"
                value={formData.cash_register_id || ''}
                onChange={handleChange}
                options={cashRegisterOptions}
                placeholder="Selecteaza casa (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Selecteaza casa pentru a inregistra automat plata in casierie
              </p>
            </div>
          </div>
        )}

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
            <Label className="text-base font-semibold">Materiale achizitionate</Label>
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
                  <th className="px-3 py-2 text-right font-medium">Impuritati (%)</th>
                  <th className="px-3 py-2 text-right font-medium">Cant. finala</th>
                  <th className="px-3 py-2 text-right font-medium">Pret/kg</th>
                  <th className="px-3 py-2 text-right font-medium">Total (RON)</th>
                  {showHiddenOptions && (
                    <th className="px-3 py-2 text-center font-medium text-orange-600">Tip</th>
                  )}
                  <th className="px-3 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, index) => (
                  <tr key={index} className="border-t">
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
                              newItems[index] = {
                                ...newItems[index],
                                weight_brut: brut,
                                quantity: net ?? newItems[index].quantity,
                                final_quantity: net !== null ? net * (1 - newItems[index].impurities_percent / 100) : newItems[index].final_quantity,
                                line_total: net !== null ? net * (1 - newItems[index].impurities_percent / 100) * newItems[index].price_per_kg : newItems[index].line_total,
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
                                  newItems[index] = {
                                    ...newItems[index],
                                    weight_brut: brut,
                                    weight_brut_time: new Date().toISOString(),
                                    quantity: net ?? newItems[index].quantity,
                                    final_quantity: net !== null ? net * (1 - newItems[index].impurities_percent / 100) : newItems[index].final_quantity,
                                    line_total: net !== null ? net * (1 - newItems[index].impurities_percent / 100) * newItems[index].price_per_kg : newItems[index].line_total,
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
                              newItems[index] = {
                                ...newItems[index],
                                weight_tara: tara,
                                quantity: net ?? newItems[index].quantity,
                                final_quantity: net !== null ? net * (1 - newItems[index].impurities_percent / 100) : newItems[index].final_quantity,
                                line_total: net !== null ? net * (1 - newItems[index].impurities_percent / 100) * newItems[index].price_per_kg : newItems[index].line_total,
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
                                  newItems[index] = {
                                    ...newItems[index],
                                    weight_tara: tara,
                                    weight_tara_time: new Date().toISOString(),
                                    quantity: net ?? newItems[index].quantity,
                                    final_quantity: net !== null ? net * (1 - newItems[index].impurities_percent / 100) : newItems[index].final_quantity,
                                    line_total: net !== null ? net * (1 - newItems[index].impurities_percent / 100) * newItems[index].price_per_kg : newItems[index].line_total,
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
                    {/* Cantitate (net = brut - tara) */}
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className={`text-right w-20 ${item.weight_brut !== null && item.weight_tara !== null ? 'bg-green-50 dark:bg-green-950' : ''}`}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={item.impurities_percent || ''}
                        onChange={(e) => handleItemChange(index, 'impurities_percent', e.target.value)}
                        className="text-right w-16"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.final_quantity.toFixed(2)}
                        readOnly
                        className="text-right bg-muted/50 w-20"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price_per_kg || ''}
                        onChange={(e) => handleItemChange(index, 'price_per_kg', e.target.value)}
                        className="text-right w-20"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        value={item.line_total.toFixed(2)}
                        readOnly
                        className="text-right bg-muted/50 font-medium w-24"
                      />
                    </td>
                    {showHiddenOptions && (
                      <td className="px-2 py-2">
                        <Select
                          value={item.acquisition_type}
                          onChange={(e) => handleItemChange(index, 'acquisition_type', e.target.value)}
                          options={acquisitionTypeOptions}
                          className={`w-24 text-center ${
                            item.acquisition_type === 'zero'
                              ? 'bg-blue-50 border-blue-300 dark:bg-blue-950'
                              : item.acquisition_type === 'director'
                                ? 'bg-purple-50 border-purple-300 dark:bg-purple-950'
                                : ''
                          }`}
                        />
                      </td>
                    )}
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
                ))}
              </tbody>
              <tfoot className="bg-muted/30">
                <tr className="border-t-2">
                  <td colSpan={showHiddenOptions ? 8 : 7} className="px-3 py-2 text-right font-semibold">
                    Total achizitie:
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-lg">
                    {totalAmount.toFixed(2)} RON
                  </td>
                  {showHiddenOptions && <td></td>}
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Additional info */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="environment_fund">Fond mediu (RON)</Label>
            <Input
              id="environment_fund"
              name="environment_fund"
              type="number"
              step="0.01"
              min="0"
              value={formData.environment_fund || ''}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="info">Informatii suplimentare</Label>
            <Input
              id="info"
              name="info"
              value={formData.info}
              onChange={handleChange}
            />
          </div>
        </div>

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

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Anuleaza
          </Button>
          <Button type="submit" disabled={isLoading || formData.items.every((i) => !i.material_id)}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {acquisition ? 'Salveaza modificarile' : 'Adauga achizitia'}
          </Button>
        </div>
      </form>

      {/* Supplier Dialog - using the same form as Suppliers page */}
      <Dialog
        open={showSupplierDialog}
        onClose={() => setShowSupplierDialog(false)}
        title="Adauga furnizor"
        maxWidth="3xl"
      >
        <SupplierForm
          isLoading={createSupplier.isPending}
          onSubmit={handleSupplierSubmit}
          onCancel={() => setShowSupplierDialog(false)}
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

      {/* Password Dialog for Hidden Options */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false)
          setPasswordInput('')
          setPasswordError(false)
        }}
        title="Acces opțiuni avansate"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Introduceți parola pentru a accesa opțiunile ascunse (tip achiziție: 0, Director).
          </p>
          <div className="space-y-2">
            <Label htmlFor="hidden-password">Parolă</Label>
            <Input
              id="hidden-password"
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handlePasswordSubmit()
                }
              }}
              placeholder="Introduceți parola"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-destructive">Parolă incorectă</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setPasswordInput('')
                setPasswordError(false)
              }}
            >
              Anulează
            </Button>
            <Button type="button" onClick={handlePasswordSubmit}>
              Confirmă
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  )
}
