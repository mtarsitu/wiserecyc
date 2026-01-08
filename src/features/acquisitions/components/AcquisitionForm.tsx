import { useState, useEffect, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Dialog } from '@/components/ui'
import { Plus, Trash2, Loader2, Eye, EyeOff } from 'lucide-react'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import { materialsQueryOptions } from '@/features/materials/queries'
import { cashRegistersQueryOptions } from '@/features/cashier/queries'
import { activeContractsQueryOptions } from '@/features/contracts/queries'
import { useCreateSupplier } from '@/features/suppliers/mutations'
import { SupplierForm } from '@/features/suppliers/components/SupplierForm'
import type { AcquisitionWithDetails } from '../queries'
import type { PaymentStatus, InsertTables, LocationType, AcquisitionType } from '@/types/database'

interface AcquisitionItemInput {
  id?: string
  material_id: string
  quantity: number
  impurities_percent: number
  final_quantity: number
  price_per_kg: number
  line_total: number
  acquisition_type: AcquisitionType
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
}

const emptyItem: AcquisitionItemInput = {
  material_id: '',
  quantity: 0,
  impurities_percent: 0,
  final_quantity: 0,
  price_per_kg: 0,
  line_total: 0,
  acquisition_type: 'normal',
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

export function AcquisitionForm({ companyId, acquisition, isLoading, onSubmit, onCancel }: AcquisitionFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [showSupplierDialog, setShowSupplierDialog] = useState(false)
  const [showHiddenOptions, setShowHiddenOptions] = useState(false)

  // Keyboard shortcut handler for Ctrl+M / Cmd+M to show hidden options
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault()
      setShowHiddenOptions(prev => !prev)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const { data: suppliers = [] } = useQuery(suppliersQueryOptions(companyId))
  const { data: materials = [] } = useQuery(materialsQueryOptions())
  const { data: cashRegisters = [] } = useQuery(cashRegistersQueryOptions(companyId))
  const { data: contracts = [] } = useQuery(activeContractsQueryOptions(companyId))
  const createSupplier = useCreateSupplier()

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
      // Check if acquisition has location_type and contract_id (cast to access potential extra fields)
      const acq = acquisition as AcquisitionWithDetails & {
        location_type?: LocationType
        contract_id?: string | null
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
                Mod ascuns activ - coloana "Tip" este vizibila in tabel (Ctrl+M pentru a ascunde)
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
                  <th className="px-3 py-2 text-right font-medium">Cantitate (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Impuritati (%)</th>
                  <th className="px-3 py-2 text-right font-medium">Cant. finala (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Pret/kg (RON)</th>
                  <th className="px-3 py-2 text-right font-medium">Total linie (RON)</th>
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
                        className="w-full"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="text-right"
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
                        className="text-right"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        value={item.final_quantity.toFixed(2)}
                        readOnly
                        className="text-right bg-muted/50"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.price_per_kg || ''}
                        onChange={(e) => handleItemChange(index, 'price_per_kg', e.target.value)}
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
                  <td colSpan={showHiddenOptions ? 6 : 5} className="px-3 py-2 text-right font-semibold">
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
    </>
  )
}
