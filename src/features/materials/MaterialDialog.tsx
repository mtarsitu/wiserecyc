import { useEffect, useState } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { X, Loader2 } from 'lucide-react'
import type { Material, InsertTables } from '@/types/database'

interface MaterialDialogProps {
  open: boolean
  onClose: () => void
  onSubmit: (data: InsertTables<'materials'>) => Promise<void>
  material?: Material | null
  isLoading?: boolean
}

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

export function MaterialDialog({
  open,
  onClose,
  onSubmit,
  material,
  isLoading,
}: MaterialDialogProps) {
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
  }, [material, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData((prev) => ({ ...prev, [name]: checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-50 w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {material ? 'Editeaza material' : 'Material nou'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

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
            <div className="relative">
              <select
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                className="flex h-9 w-full appearance-none rounded-md border border-input bg-transparent px-3 py-1 pr-8 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                required
              >
                {commonUnits.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </select>
            </div>
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
            <Label htmlFor="is_active" className="cursor-pointer">
              Material activ
            </Label>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Anuleaza
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {material ? 'Salveaza' : 'Adauga material'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
