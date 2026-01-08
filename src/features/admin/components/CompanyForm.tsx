import { useEffect, useState } from 'react'
import { Button, Input, Label } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { Company, InsertTables } from '@/types/database'

type FormData = Omit<InsertTables<'companies'>, 'id'>

const initialFormData: FormData = {
  name: '',
  cui: '',
  reg_com: '',
  address: '',
  city: '',
  county: '',
  country: 'Romania',
  phone: '',
  email: '',
  iban: '',
  bank: '',
  environment_auth: '',
  is_active: true,
}

interface CompanyFormProps {
  company?: Company | null
  isLoading?: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function CompanyForm({ company, isLoading, onSubmit, onCancel }: CompanyFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        cui: company.cui || '',
        reg_com: company.reg_com || '',
        address: company.address || '',
        city: company.city || '',
        county: company.county || '',
        country: company.country || 'Romania',
        phone: company.phone || '',
        email: company.email || '',
        iban: company.iban || '',
        bank: company.bank || '',
        environment_auth: company.environment_auth || '',
        is_active: company.is_active,
      })
    } else {
      setFormData(initialFormData)
    }
  }, [company])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nume companie *</Label>
          <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cui">CUI</Label>
          <Input id="cui" name="cui" value={formData.cui || ''} onChange={handleChange} placeholder="RO12345678" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="reg_com">Reg. Comertului</Label>
          <Input id="reg_com" name="reg_com" value={formData.reg_com || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adresa</Label>
        <Input id="address" name="address" value={formData.address || ''} onChange={handleChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">Oras</Label>
          <Input id="city" name="city" value={formData.city || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="county">Judet</Label>
          <Input id="county" name="county" value={formData.county || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="iban">IBAN</Label>
          <Input id="iban" name="iban" value={formData.iban || ''} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank">Banca</Label>
          <Input id="bank" name="bank" value={formData.bank || ''} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="environment_auth">Nr. autorizatie mediu</Label>
        <Input id="environment_auth" name="environment_auth" value={formData.environment_auth || ''} onChange={handleChange} />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
        <Label htmlFor="is_active" className="cursor-pointer">Companie activa</Label>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Anuleaza</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {company ? 'Salveaza' : 'Adauga companie'}
        </Button>
      </div>
    </form>
  )
}
