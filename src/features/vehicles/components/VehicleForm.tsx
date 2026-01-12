import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Textarea, Checkbox } from '@/components/ui'
import { transportersQueryOptions } from '@/features/transporters/queries'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import type { Vehicle, Transporter, Supplier, VehicleOwnerType } from '@/types/database'

interface VehicleFormProps {
  companyId: string
  vehicle?: (Vehicle & { transporter?: Transporter | null; supplier?: Supplier | null }) | null
  isLoading?: boolean
  /** Pre-set owner type for quick-add from forms */
  defaultOwnerType?: VehicleOwnerType
  /** Pre-set transporter ID when adding from extern transport */
  defaultTransporterId?: string | null
  /** Hide owner type selector for simplified quick-add */
  simplified?: boolean
  onSubmit: (data: {
    vehicle_number: string
    vehicle_type: string
    owner_type: VehicleOwnerType
    transporter_id: string | null
    supplier_id: string | null
    driver_name: string
    notes: string
    has_transport_license: boolean
    transport_license_number: string | null
    transport_license_expiry: string | null
  }) => void
  onCancel: () => void
}

export function VehicleForm({
  companyId,
  vehicle,
  isLoading,
  defaultOwnerType,
  defaultTransporterId,
  simplified = false,
  onSubmit,
  onCancel,
}: VehicleFormProps) {
  const [vehicleNumber, setVehicleNumber] = useState('')
  const [vehicleType, setVehicleType] = useState('')
  const [ownerType, setOwnerType] = useState<VehicleOwnerType>(defaultOwnerType || 'own_fleet')
  const [transporterId, setTransporterId] = useState(defaultTransporterId || '')
  const [supplierId, setSupplierId] = useState('')
  const [driverName, setDriverName] = useState('')
  const [notes, setNotes] = useState('')
  const [hasTransportLicense, setHasTransportLicense] = useState(false)
  const [transportLicenseNumber, setTransportLicenseNumber] = useState('')
  const [transportLicenseExpiry, setTransportLicenseExpiry] = useState('')

  // Query transporters and suppliers for dropdowns
  const { data: transporters = [] } = useQuery(transportersQueryOptions(companyId))
  const { data: suppliers = [] } = useQuery(suppliersQueryOptions(companyId))

  // Populate form when editing
  useEffect(() => {
    if (vehicle) {
      setVehicleNumber(vehicle.vehicle_number || '')
      setVehicleType(vehicle.vehicle_type || '')
      setOwnerType(vehicle.owner_type || 'own_fleet')
      setTransporterId(vehicle.transporter_id || '')
      setSupplierId(vehicle.supplier_id || '')
      setDriverName(vehicle.driver_name || '')
      setNotes(vehicle.notes || '')
      setHasTransportLicense(vehicle.has_transport_license || false)
      setTransportLicenseNumber(vehicle.transport_license_number || '')
      setTransportLicenseExpiry(vehicle.transport_license_expiry || '')
    }
  }, [vehicle])

  // Update from defaults when they change (for quick-add mode)
  useEffect(() => {
    if (!vehicle && defaultOwnerType) {
      setOwnerType(defaultOwnerType)
    }
  }, [vehicle, defaultOwnerType])

  useEffect(() => {
    if (!vehicle && defaultTransporterId) {
      setTransporterId(defaultTransporterId)
    }
  }, [vehicle, defaultTransporterId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!vehicleNumber.trim()) {
      alert('Numarul de inmatriculare este obligatoriu')
      return
    }
    if (ownerType === 'transporter' && !transporterId) {
      alert('Selecteaza transportatorul pentru vehiculele externe')
      return
    }
    if (ownerType === 'supplier' && !supplierId) {
      alert('Selecteaza furnizorul pentru vehiculele furnizorului')
      return
    }
    onSubmit({
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      vehicle_type: vehicleType.trim(),
      owner_type: ownerType,
      transporter_id: ownerType === 'transporter' ? transporterId : null,
      supplier_id: ownerType === 'supplier' ? supplierId : null,
      driver_name: driverName.trim(),
      notes: notes.trim(),
      has_transport_license: hasTransportLicense,
      transport_license_number: hasTransportLicense ? transportLicenseNumber.trim() || null : null,
      transport_license_expiry: hasTransportLicense ? transportLicenseExpiry || null : null,
    })
  }

  const handleOwnerTypeChange = (value: string) => {
    setOwnerType(value as VehicleOwnerType)
    // Reset related fields
    if (value !== 'transporter') setTransporterId('')
    if (value !== 'supplier') setSupplierId('')
  }

  const vehicleTypeOptions = [
    { value: '', label: 'Selecteaza tipul' },
    { value: 'Camion', label: 'Camion' },
    { value: 'Autoutilitara', label: 'Autoutilitara' },
    { value: 'Remorca', label: 'Remorca' },
    { value: 'Autoturism', label: 'Autoturism' },
    { value: 'Altul', label: 'Altul' },
  ]

  const ownerTypeOptions = [
    { value: 'own_fleet', label: 'Flota proprie' },
    { value: 'transporter', label: 'Transportator extern' },
    { value: 'supplier', label: 'Furnizor (masina proprie)' },
  ]

  const transporterOptions = [
    { value: '', label: 'Selecteaza transportatorul' },
    ...transporters.map((t) => ({
      value: t.id,
      label: t.name,
    })),
  ]

  const supplierOptions = [
    { value: '', label: 'Selecteaza furnizorul' },
    ...suppliers.map((s) => ({
      value: s.id,
      label: s.name,
    })),
  ]

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="vehicle_number">Numar inmatriculare *</Label>
        <Input
          id="vehicle_number"
          value={vehicleNumber}
          onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
          placeholder="ex: B-123-ABC"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="vehicle_type">Tip vehicul</Label>
        <Select
          id="vehicle_type"
          value={vehicleType}
          onChange={(e) => setVehicleType(e.target.value)}
          options={vehicleTypeOptions}
        />
      </div>

      {!simplified && (
        <div className="space-y-2">
          <Label htmlFor="owner_type">Tip proprietate *</Label>
          <Select
            id="owner_type"
            value={ownerType}
            onChange={(e) => handleOwnerTypeChange(e.target.value)}
            options={ownerTypeOptions}
          />
        </div>
      )}

      {ownerType === 'transporter' && !simplified && (
        <div className="space-y-2">
          <Label htmlFor="transporter">Transportator *</Label>
          <Select
            id="transporter"
            value={transporterId}
            onChange={(e) => setTransporterId(e.target.value)}
            options={transporterOptions}
            required
          />
          {transporters.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nu exista transportatori. Adauga mai intai un transportator.
            </p>
          )}
        </div>
      )}

      {ownerType === 'supplier' && !simplified && (
        <div className="space-y-2">
          <Label htmlFor="supplier">Furnizor *</Label>
          <Select
            id="supplier"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={supplierOptions}
            required
          />
          {suppliers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Nu exista furnizori. Adauga mai intai un furnizor.
            </p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="driver_name">Sofer implicit</Label>
        <Input
          id="driver_name"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          placeholder="Numele soferului"
        />
      </div>

      {/* Transport License Section */}
      <div className="border-t pt-4 mt-4">
        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="has_transport_license"
            checked={hasTransportLicense}
            onCheckedChange={(checked) => setHasTransportLicense(checked === true)}
          />
          <Label htmlFor="has_transport_license" className="cursor-pointer">
            Are licenta de transport
          </Label>
        </div>

        {hasTransportLicense && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="transport_license_number">Numar licenta</Label>
              <Input
                id="transport_license_number"
                value={transportLicenseNumber}
                onChange={(e) => setTransportLicenseNumber(e.target.value)}
                placeholder="ex: LT-12345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transport_license_expiry">Data expirare</Label>
              <Input
                id="transport_license_expiry"
                type="date"
                value={transportLicenseExpiry}
                onChange={(e) => setTransportLicenseExpiry(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observatii</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observatii..."
          rows={2}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Se salveaza...' : vehicle ? 'Salveaza' : 'Adauga vehicul'}
        </Button>
      </div>
    </form>
  )
}
