import { useEffect, useState } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { Profile, Company, UserRole } from '@/types/database'

interface UserFormData {
  email: string
  password: string
  full_name: string
  phone: string
  company_id: string
  role: UserRole
  is_active: boolean
}

const initialFormData: UserFormData = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
  company_id: '',
  role: 'operator',
  is_active: true,
}

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Administrator' },
  { value: 'operator', label: 'Operator' },
  { value: 'viewer', label: 'Vizualizator' },
]

interface UserFormProps {
  user?: (Profile & { company: { id: string; name: string } | null }) | null
  companies: Company[]
  isLoading?: boolean
  isNew?: boolean
  onSubmit: (data: UserFormData) => void
  onCancel: () => void
}

export function UserForm({ user, companies, isLoading, isNew = true, onSubmit, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState<UserFormData>(initialFormData)

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        full_name: user.full_name || '',
        phone: user.phone || '',
        company_id: user.company_id || '',
        role: user.role,
        is_active: user.is_active,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [user])

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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="full_name">Nume complet *</Label>
          <Input id="full_name" name="full_name" value={formData.full_name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required disabled={!isNew} />
        </div>
      </div>

      {isNew && (
        <div className="space-y-2">
          <Label htmlFor="password">Parola *</Label>
          <Input id="password" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={6} />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Rol *</Label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="company_id">Companie *</Label>
        <select
          id="company_id"
          name="company_id"
          value={formData.company_id}
          onChange={handleChange}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          required
        >
          <option value="">Selecteaza compania</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>{company.name}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
        <Label htmlFor="is_active" className="cursor-pointer">Utilizator activ</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Anuleaza</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {user ? 'Salveaza' : 'Adauga utilizator'}
        </Button>
      </div>
    </form>
  )
}
