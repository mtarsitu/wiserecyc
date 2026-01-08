import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select } from '@/components/ui'
import { Plus, Trash2, Loader2, AlertTriangle } from 'lucide-react'
import { availableInventoryQueryOptions } from '@/features/inventory/queries'
import { materialsQueryOptions } from '@/features/materials/queries'

interface OutputInput {
  material_id: string
  quantity: number
  notes: string
}

interface FormData {
  date: string
  location_type: 'curte' | 'contract'
  contract_id: string
  source_inventory_id: string
  source_material_id: string
  source_quantity: number
  available_quantity: number
  notes: string
  outputs: OutputInput[]
}

const emptyOutput: OutputInput = {
  material_id: '',
  quantity: 0,
  notes: '',
}

const initialFormData: FormData = {
  date: new Date().toISOString().split('T')[0],
  location_type: 'curte',
  contract_id: '',
  source_inventory_id: '',
  source_material_id: '',
  source_quantity: 0,
  available_quantity: 0,
  notes: '',
  outputs: [{ ...emptyOutput }],
}

interface DismantlingFormProps {
  companyId: string
  isLoading?: boolean
  onSubmit: (data: {
    date: string
    location_type: 'curte' | 'contract'
    contract_id: string | null
    source_material_id: string
    source_quantity: number
    notes: string
    outputs: { material_id: string; quantity: number; notes?: string | null }[]
  }) => void
  onCancel: () => void
}

export function DismantlingForm({ companyId, isLoading, onSubmit, onCancel }: DismantlingFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  const { data: inventory = [] } = useQuery(availableInventoryQueryOptions(companyId))
  const { data: materials = [] } = useQuery(materialsQueryOptions())

  // Grupăm inventarul după locație pentru afișare
  const inventoryOptions = useMemo(() => {
    return inventory.map((inv) => {
      const locationLabel = inv.location_type === 'curte'
        ? 'Curte'
        : inv.location_type === 'contract'
          ? `Contract: ${inv.contract?.contract_number || 'N/A'}`
          : 'DEEE'
      return {
        value: inv.id,
        label: `${inv.material.name} - ${inv.quantity.toFixed(2)} kg (${locationLabel})`,
        inventory: inv,
      }
    })
  }, [inventory])

  // Materialele disponibile pentru output (exclude materialul sursă)
  const outputMaterialOptions = useMemo(() => {
    return materials
      .filter((m) => m.id !== formData.source_material_id)
      .map((m) => ({ value: m.id, label: m.name }))
  }, [materials, formData.source_material_id])

  // Selectare inventar sursă
  const handleInventorySelect = (inventoryId: string) => {
    const selected = inventory.find((inv) => inv.id === inventoryId)
    if (selected) {
      setFormData((prev) => ({
        ...prev,
        source_inventory_id: inventoryId,
        source_material_id: selected.material_id,
        location_type: selected.location_type as 'curte' | 'contract',
        contract_id: selected.contract_id || '',
        available_quantity: selected.quantity,
        source_quantity: 0,
      }))
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleOutputChange = (index: number, field: keyof OutputInput, value: string | number) => {
    setFormData((prev) => {
      const newOutputs = [...prev.outputs]
      newOutputs[index] = { ...newOutputs[index], [field]: value }
      return { ...prev, outputs: newOutputs }
    })
  }

  const addOutput = () => {
    setFormData((prev) => ({
      ...prev,
      outputs: [...prev.outputs, { ...emptyOutput }],
    }))
  }

  const removeOutput = (index: number) => {
    if (formData.outputs.length > 1) {
      setFormData((prev) => ({
        ...prev,
        outputs: prev.outputs.filter((_, i) => i !== index),
      }))
    }
  }

  // Calculăm totalul output-urilor
  const totalOutputQuantity = useMemo(() => {
    return formData.outputs.reduce((sum, o) => sum + Number(o.quantity || 0), 0)
  }, [formData.outputs])

  // Verificăm dacă cantitatea sursă este validă
  const isQuantityValid = formData.source_quantity > 0 && formData.source_quantity <= formData.available_quantity

  // Verificăm dacă toate output-urile au material selectat și cantitate
  const hasValidOutputs = formData.outputs.every((o) => o.material_id && o.quantity > 0)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      date: formData.date,
      location_type: formData.location_type,
      contract_id: formData.contract_id || null,
      source_material_id: formData.source_material_id,
      source_quantity: Number(formData.source_quantity),
      notes: formData.notes,
      outputs: formData.outputs.map((o) => ({
        material_id: o.material_id,
        quantity: Number(o.quantity),
        notes: o.notes || null,
      })),
    })
  }

  const canSubmit = formData.source_material_id && isQuantityValid && hasValidOutputs

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Data */}
      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      {/* Selectare material sursă din stocuri */}
      <div className="space-y-2">
        <Label htmlFor="source_inventory_id">Material sursă din stoc *</Label>
        {inventory.length === 0 ? (
          <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">
              Nu există materiale în stoc disponibile pentru dezmembrare.
              Adaugă mai întâi achiziții pentru a avea stoc.
            </span>
          </div>
        ) : (
          <Select
            id="source_inventory_id"
            value={formData.source_inventory_id}
            onChange={(e) => handleInventorySelect(e.target.value)}
            options={inventoryOptions}
            placeholder="Selectează material din stoc"
          />
        )}
      </div>

      {/* Cantitate sursă */}
      {formData.source_inventory_id && (
        <div className="space-y-2">
          <Label htmlFor="source_quantity">
            Cantitate de dezmembrat (kg) *
            <span className="text-muted-foreground ml-2">
              (Disponibil: {formData.available_quantity.toFixed(2)} kg)
            </span>
          </Label>
          <Input
            id="source_quantity"
            name="source_quantity"
            type="number"
            step="0.01"
            min="0"
            max={formData.available_quantity}
            value={formData.source_quantity || ''}
            onChange={handleChange}
            className={!isQuantityValid && formData.source_quantity > 0 ? 'border-destructive' : ''}
          />
          {formData.source_quantity > formData.available_quantity && (
            <p className="text-sm text-destructive">
              Cantitatea depășește stocul disponibil!
            </p>
          )}
        </div>
      )}

      {/* Materiale rezultate */}
      {formData.source_inventory_id && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold">Materiale rezultate din dezmembrare</Label>
            <Button type="button" variant="outline" size="sm" onClick={addOutput}>
              <Plus className="mr-1 h-4 w-4" />
              Adaugă material
            </Button>
          </div>

          <div className="space-y-3">
            {formData.outputs.map((output, index) => (
              <div key={index} className="flex gap-3 items-start p-3 border rounded-lg bg-muted/30">
                <div className="flex-1 space-y-2">
                  <Label>Material rezultat</Label>
                  <Select
                    value={output.material_id}
                    onChange={(e) => handleOutputChange(index, 'material_id', e.target.value)}
                    options={outputMaterialOptions}
                    placeholder="Selectează material"
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Cantitate (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={output.quantity || ''}
                    onChange={(e) => handleOutputChange(index, 'quantity', e.target.value)}
                  />
                </div>
                <div className="pt-7">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeOutput(index)}
                    disabled={formData.outputs.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Sumar */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Cantitate sursă:</span>
              <span className="font-medium">{Number(formData.source_quantity || 0).toFixed(2)} kg</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span>Total materiale rezultate:</span>
              <span className="font-medium">{totalOutputQuantity.toFixed(2)} kg</span>
            </div>
            {formData.source_quantity > 0 && (
              <div className="flex justify-between text-sm mt-1 pt-1 border-t">
                <span>Diferență (pierderi/deșeuri):</span>
                <span className={`font-medium ${Number(formData.source_quantity) - totalOutputQuantity < 0 ? 'text-destructive' : ''}`}>
                  {(Number(formData.source_quantity) - totalOutputQuantity).toFixed(2)} kg
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Observații */}
      <div className="space-y-2">
        <Label htmlFor="notes">Observații</Label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={2}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {/* Acțiuni */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anulează
        </Button>
        <Button type="submit" disabled={isLoading || !canSubmit}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvează dezmembrarea
        </Button>
      </div>
    </form>
  )
}
