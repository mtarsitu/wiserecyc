import { useEffect, useState } from 'react'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { Employee, InsertTables } from '@/types/database'

type FormData = Omit<InsertTables<'employees'>, 'company_id' | 'id'>

const initialFormData: FormData = {
  full_name: '',
  cnp: '',
  phone: '',
  email: '',
  address: '',
  position: '',
  hire_date: '',
  notes: '',
  is_active: true,
}

interface EmployeeFormProps {
  employee?: Employee | null
  isLoading?: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function EmployeeForm({ employee, isLoading, onSubmit, onCancel }: EmployeeFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  useEffect(() => {
    if (employee) {
      setFormData({
        full_name: employee.full_name,
        cnp: employee.cnp || '',
        phone: employee.phone || '',
        email: employee.email || '',
        address: employee.address || '',
        position: employee.position || '',
        hire_date: employee.hire_date || '',
        notes: employee.notes || '',
        is_active: employee.is_active,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [employee])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSubmit = {
      ...formData,
      hire_date: formData.hire_date || null,
    }
    onSubmit(dataToSubmit)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informatii personale */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Informatii personale</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nume complet *</Label>
            <Input
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Ex: Popescu Ion"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cnp">CNP</Label>
            <Input
              id="cnp"
              name="cnp"
              value={formData.cnp || ''}
              onChange={handleChange}
              placeholder="1234567890123"
              maxLength={13}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone || ''}
              onChange={handleChange}
              placeholder="0721 123 456"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email || ''}
              onChange={handleChange}
              placeholder="email@exemplu.ro"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Adresa</Label>
            <Input
              id="address"
              name="address"
              value={formData.address || ''}
              onChange={handleChange}
              placeholder="Strada, Nr., Oras, Judet"
            />
          </div>
        </div>
      </fieldset>

      {/* Informatii angajare */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Informatii angajare</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="position">Functie</Label>
            <Input
              id="position"
              name="position"
              value={formData.position || ''}
              onChange={handleChange}
              placeholder="Ex: Operator, Sofer, etc."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire_date">Data angajarii</Label>
            <Input
              id="hire_date"
              name="hire_date"
              type="date"
              value={formData.hire_date || ''}
              onChange={handleChange}
            />
          </div>
        </div>
      </fieldset>

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          placeholder="Observatii suplimentare..."
        />
      </div>

      {/* Activ */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          name="is_active"
          checked={formData.is_active}
          onChange={handleChange}
          className="h-4 w-4 rounded border-gray-300"
        />
        <Label htmlFor="is_active" className="cursor-pointer">Salariat activ</Label>
      </div>

      {/* Butoane */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Anuleaza</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {employee ? 'Salveaza' : 'Adauga salariat'}
        </Button>
      </div>
    </form>
  )
}
