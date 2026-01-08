import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Dialog } from '@/components/ui'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { clientsQueryOptions } from '@/features/clients/queries'
import { materialsQueryOptions } from '@/features/materials/queries'
import { cashRegistersQueryOptions } from '@/features/cashier/queries'
import { availableInventoryQueryOptions } from '@/features/inventory/queries'
import { useCreateClient } from '@/features/clients/mutations'
import { ClientForm } from '@/features/clients/components/ClientForm'
import type { SaleWithDetails } from '../queries'
import type { PaymentMethod, TransportType, SaleStatus, InsertTables } from '@/types/database'

interface SaleItemInput {
  id?: string
  material_id: string
  quantity: number
  impurities_percent: number
  final_quantity: number
  price_per_ton_usd: number | null
  exchange_rate: number | null
  price_per_kg_ron: number
  line_total: number
}

interface FormData {
  date: string
  client_id: string
  payment_method: PaymentMethod | null
  transport_type: TransportType | null
  transport_price: number
  scale_number: string
  notes: string
  status: SaleStatus
  cash_register_id: string | null
  items: SaleItemInput[]
}

const emptyItem: SaleItemInput = {
  material_id: '',
  quantity: 0,
  impurities_percent: 0,
  final_quantity: 0,
  price_per_ton_usd: null,
  exchange_rate: null,
  price_per_kg_ron: 0,
  line_total: 0,
}

const initialFormData: FormData = {
  date: new Date().toISOString().split('T')[0],
  client_id: '',
  payment_method: 'bank',
  transport_type: 'intern',
  transport_price: 0,
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

  const { data: clients = [] } = useQuery(clientsQueryOptions(companyId))
  const { data: materials = [] } = useQuery(materialsQueryOptions())
  const { data: cashRegisters = [] } = useQuery(cashRegistersQueryOptions(companyId))
  const { data: inventory = [] } = useQuery(availableInventoryQueryOptions(companyId))
  const createClient = useCreateClient()

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
    { value: 'intern', label: 'Transport intern' },
    { value: 'extern', label: 'Transport extern' },
  ]

  const statusOptions = [
    { value: 'pending', label: 'In asteptare' },
    { value: 'reception_done', label: 'Receptie efectuata' },
    { value: 'cancelled', label: 'Anulat' },
  ]

  useEffect(() => {
    if (sale) {
      setFormData({
        date: sale.date.split('T')[0],
        client_id: sale.client_id || '',
        payment_method: sale.payment_method,
        transport_type: sale.transport_type,
        transport_price: sale.transport_price,
        scale_number: sale.scale_number || '',
        notes: sale.notes || '',
        status: sale.status,
        cash_register_id: null,
        items: sale.items.map((item) => ({
          id: item.id,
          material_id: item.material_id,
          quantity: item.quantity,
          impurities_percent: item.impurities_percent,
          final_quantity: item.final_quantity,
          price_per_ton_usd: item.price_per_ton_usd,
          exchange_rate: item.exchange_rate,
          price_per_kg_ron: item.price_per_kg_ron,
          line_total: item.line_total,
        })),
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
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleItemChange = (index: number, field: keyof SaleItemInput, value: string | number | null) => {
    setFormData((prev) => {
      const newItems = [...prev.items]
      const item = { ...newItems[index], [field]: value }

      // Recalculate final_quantity and line_total when relevant fields change
      if (field === 'quantity' || field === 'impurities_percent') {
        const quantity = field === 'quantity' ? Number(value) : item.quantity
        const impurities = field === 'impurities_percent' ? Number(value) : item.impurities_percent
        item.final_quantity = quantity * (1 - impurities / 100)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      transport_price: Number(formData.transport_price),
      total_amount: totalAmount,
      items: formData.items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        impurities_percent: Number(item.impurities_percent),
        final_quantity: Number(item.final_quantity),
        price_per_ton_usd: item.price_per_ton_usd ? Number(item.price_per_ton_usd) : null,
        exchange_rate: item.exchange_rate ? Number(item.exchange_rate) : null,
        price_per_kg_ron: Number(item.price_per_kg_ron),
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

        {/* Transport info */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="transport_type">Tip transport</Label>
            <Select
              id="transport_type"
              name="transport_type"
              value={formData.transport_type || ''}
              onChange={handleChange}
              options={transportTypeOptions}
              placeholder="Selecteaza"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="transport_price">Cost transport (RON)</Label>
            <Input
              id="transport_price"
              name="transport_price"
              type="number"
              step="0.01"
              min="0"
              value={formData.transport_price || ''}
              onChange={handleChange}
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

        {/* Cash register selector - for recording income */}
        {formData.status === 'reception_done' && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cash_register_id">Casa/Cont pentru incasare</Label>
              <Select
                id="cash_register_id"
                name="cash_register_id"
                value={formData.cash_register_id || ''}
                onChange={handleChange}
                options={cashRegisterOptions}
                placeholder="Selecteaza casa (optional)"
              />
              <p className="text-xs text-muted-foreground">
                Selecteaza casa pentru a inregistra automat incasarea in casierie
              </p>
            </div>
          </div>
        )}

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
                  <th className="px-3 py-2 text-right font-medium">Cantitate (kg)</th>
                  <th className="px-3 py-2 text-right font-medium">Impuritati (%)</th>
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
                        className="w-full"
                      />
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
                  <td colSpan={5} className="px-3 py-2 text-right font-semibold">
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
    </>
  )
}
