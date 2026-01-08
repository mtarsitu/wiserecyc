import { useEffect, useState } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { Material, InsertTables } from '@/types/database'

type FormData = Omit<InsertTables<'materials'>, 'id'>

const initialFormData: FormData = {
  name: '',
  unit: 'kg',
  is_active: true,
}

const commonUnits = [
  { value: 'kg', label: 'Kilograme (kg)' },
  { value: 'buc', label: 'Bucati (buc)' },
  { value: 't', label: 'Tone (t)' },
  { value: 'm', label: 'Metri (m)' },
  { value: 'mp', label: 'Metri patrati (mp)' },
  { value: 'l', label: 'Litri (l)' },
]

interface MaterialFormProps {
  material?: Material | null
  isLoading?: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function MaterialForm({ material, isLoading, onSubmit, onCancel }: MaterialFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  useEffect(() => {
    if (material) {
      setFormData({
        name: material.name,
        unit: material.unit,
        is_active: material.is_active,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [material])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Denumire material *</Label>
        <Input
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          required
          placeholder="ex: Fier vechi, Cupru, Aluminiu"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="unit">Unitate de masura *</Label>
        <select
          id="unit"
          name="unit"
          value={formData.unit}
          onChange={handleChange}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          {commonUnits.map((unit) => (
            <option key={unit.value} value={unit.value}>{unit.label}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="is_active" className="cursor-pointer">Material activ</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Anuleaza</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {material ? 'Salveaza' : 'Adauga material'}
        </Button>
      </div>
    </form>
  )
}
