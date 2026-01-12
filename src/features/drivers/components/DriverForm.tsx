import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Textarea } from '@/components/ui'
import { transportersQueryOptions } from '@/features/transporters/queries'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import type { Driver, Transporter, Supplier, VehicleOwnerType } from '@/types/database'

interface DriverFormProps {
  companyId: string
  driver?: (Driver & { transporter?: Transporter | null; supplier?: Supplier | null }) | null
  isLoading?: boolean
  onSubmit: (data: {
    name: string
    id_series: string
    id_number: string
    phone: string
    owner_type: VehicleOwnerType
    transporter_id: string | null
    supplier_id: string | null
    notes: string
  }) => void
  onCancel: () => void
}

export function DriverForm({
  companyId,
  driver,
  isLoading,
  onSubmit,
  onCancel,
}: DriverFormProps) {
  const [name, setName] = useState('')
  const [idSeries, setIdSeries] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [ownerType, setOwnerType] = useState<VehicleOwnerType>('own_fleet')
  const [transporterId, setTransporterId] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [notes, setNotes] = useState('')

  // Query transporters and suppliers for dropdowns
  const { data: transporters = [] } = useQuery(transportersQueryOptions(companyId))
  const { data: suppliers = [] } = useQuery(suppliersQueryOptions(companyId))

  // Populate form when editing
  useEffect(() => {
    if (driver) {
      setName(driver.name || '')
      setIdSeries(driver.id_series || '')
      setIdNumber(driver.id_number || '')
      setPhone(driver.phone || '')
      setOwnerType(driver.owner_type || 'own_fleet')
      setTransporterId(driver.transporter_id || '')
      setSupplierId(driver.supplier_id || '')
      setNotes(driver.notes || '')
    }
  }, [driver])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('Numele soferului este obligatoriu')
      return
    }
    if (ownerType === 'transporter' && !transporterId) {
      alert('Selecteaza transportatorul pentru soferii externi')
      return
    }
    if (ownerType === 'supplier' && !supplierId) {
      alert('Selecteaza furnizorul pentru soferii furnizorului')
      return
    }
    onSubmit({
      name: name.trim(),
      id_series: idSeries.trim().toUpperCase(),
      id_number: idNumber.trim(),
      phone: phone.trim(),
      owner_type: ownerType,
      transporter_id: ownerType === 'transporter' ? transporterId : null,
      supplier_id: ownerType === 'supplier' ? supplierId : null,
      notes: notes.trim(),
    })
  }

  const handleOwnerTypeChange = (value: string) => {
    setOwnerType(value as VehicleOwnerType)
    // Reset related fields
    if (value !== 'transporter') setTransporterId('')
    if (value !== 'supplier') setSupplierId('')
  }

  const ownerTypeOptions = [
    { value: 'own_fleet', label: 'Angajat propriu' },
    { value: 'transporter', label: 'Sofer transportator extern' },
    { value: 'supplier', label: 'Sofer furnizor' },
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
        <Label htmlFor="name">Nume sofer *</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Numele complet"
          required
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="id_series">Serie buletin</Label>
          <Input
            id="id_series"
            value={idSeries}
            onChange={(e) => setIdSeries(e.target.value.toUpperCase())}
            placeholder="ex: RK"
            maxLength={10}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="id_number">Numar buletin</Label>
          <Input
            id="id_number"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            placeholder="ex: 123456"
            maxLength={20}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefon</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="ex: 0722123456"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="owner_type">Tip angajare *</Label>
        <Select
          id="owner_type"
          value={ownerType}
          onChange={(e) => handleOwnerTypeChange(e.target.value)}
          options={ownerTypeOptions}
        />
      </div>

      {ownerType === 'transporter' && (
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

      {ownerType === 'supplier' && (
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
          {isLoading ? 'Se salveaza...' : driver ? 'Salveaza' : 'Adauga sofer'}
        </Button>
      </div>
    </form>
  )
}
