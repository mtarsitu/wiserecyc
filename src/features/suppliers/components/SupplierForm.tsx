import { useEffect, useState } from 'react'
import { Button, Input, Label, Textarea } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import type { Supplier, InsertTables } from '@/types/database'

type FormData = Omit<InsertTables<'suppliers'>, 'company_id' | 'id'>

const initialFormData: FormData = {
  name: '',
  cui: '',
  reg_com: '',
  address: '',
  city: '',
  county: '',
  country: 'Romania',
  work_point_address: '',
  work_point_city: '',
  work_point_county: '',
  phone: '',
  email: '',
  contact_person: '',
  iban: '',
  bank: '',
  environment_auth: '',
  environment_auth_expiry: '',
  is_contract: false,
  is_punct_lucru: false,
  is_deee: false,
  notes: '',
  is_active: true,
}

interface SupplierFormProps {
  supplier?: Supplier | null
  isLoading?: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function SupplierForm({ supplier, isLoading, onSubmit, onCancel }: SupplierFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [showWorkPoint, setShowWorkPoint] = useState(false)

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name,
        cui: supplier.cui || '',
        reg_com: supplier.reg_com || '',
        address: supplier.address || '',
        city: supplier.city || '',
        county: supplier.county || '',
        country: supplier.country || 'Romania',
        work_point_address: supplier.work_point_address || '',
        work_point_city: supplier.work_point_city || '',
        work_point_county: supplier.work_point_county || '',
        phone: supplier.phone || '',
        email: supplier.email || '',
        contact_person: supplier.contact_person || '',
        iban: supplier.iban || '',
        bank: supplier.bank || '',
        environment_auth: supplier.environment_auth || '',
        environment_auth_expiry: supplier.environment_auth_expiry || '',
        is_contract: supplier.is_contract,
        is_punct_lucru: supplier.is_punct_lucru,
        is_deee: supplier.is_deee,
        notes: supplier.notes || '',
        is_active: supplier.is_active,
      })
      setShowWorkPoint(!!(supplier.work_point_address || supplier.work_point_city))
    } else {
      setFormData(initialFormData)
      setShowWorkPoint(false)
    }
  }, [supplier])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Convert empty date strings to null for database
    const dataToSubmit = {
      ...formData,
      environment_auth_expiry: formData.environment_auth_expiry || null,
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
      {/* Informatii de baza */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Informatii de baza</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nume furnizor *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cui">CUI</Label>
            <Input id="cui" name="cui" value={formData.cui || ''} onChange={handleChange} placeholder="RO12345678" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reg_com">Reg. Comertului</Label>
            <Input id="reg_com" name="reg_com" value={formData.reg_com || ''} onChange={handleChange} placeholder="J40/1234/2020" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contact_person">Persoana de contact</Label>
            <Input id="contact_person" name="contact_person" value={formData.contact_person || ''} onChange={handleChange} />
          </div>
        </div>
      </fieldset>

      {/* Adresa sediu */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Adresa sediu social</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-3">
            <Label htmlFor="address">Adresa</Label>
            <Input id="address" name="address" value={formData.address || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Oras</Label>
            <Input id="city" name="city" value={formData.city || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="county">Judet</Label>
            <Input id="county" name="county" value={formData.county || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Tara</Label>
            <Input id="country" name="country" value={formData.country || ''} onChange={handleChange} />
          </div>
        </div>
      </fieldset>

      {/* Punct de lucru */}
      <fieldset className="space-y-4">
        <div className="flex items-center gap-2">
          <input type="checkbox" id="showWorkPoint" checked={showWorkPoint} onChange={(e) => setShowWorkPoint(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
          <Label htmlFor="showWorkPoint" className="cursor-pointer">Punct de lucru diferit de sediu</Label>
        </div>
        {showWorkPoint && (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="work_point_address">Adresa punct de lucru</Label>
              <Input id="work_point_address" name="work_point_address" value={formData.work_point_address || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_point_city">Oras</Label>
              <Input id="work_point_city" name="work_point_city" value={formData.work_point_city || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_point_county">Judet</Label>
              <Input id="work_point_county" name="work_point_county" value={formData.work_point_county || ''} onChange={handleChange} />
            </div>
          </div>
        )}
      </fieldset>

      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} />
          </div>
        </div>
      </fieldset>

      {/* Date bancare */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Date bancare</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="iban">IBAN</Label>
            <Input id="iban" name="iban" value={formData.iban || ''} onChange={handleChange} placeholder="RO49AAAA1B31007593840000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank">Banca</Label>
            <Input id="bank" name="bank" value={formData.bank || ''} onChange={handleChange} />
          </div>
        </div>
      </fieldset>

      {/* Autorizatie de mediu */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Autorizatie de mediu</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="environment_auth">Nr. autorizatie</Label>
            <Input id="environment_auth" name="environment_auth" value={formData.environment_auth || ''} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="environment_auth_expiry">Data expirare</Label>
            <Input id="environment_auth_expiry" name="environment_auth_expiry" type="date" value={formData.environment_auth_expiry || ''} onChange={handleChange} />
          </div>
        </div>
      </fieldset>

      {/* Tipuri furnizor */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Tip furnizor</legend>
        <div className="flex flex-wrap gap-6">
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="is_contract" checked={formData.is_contract} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
            <span>Contract / Licitatie</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="is_punct_lucru" checked={formData.is_punct_lucru} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
            <span>Punct de lucru</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="checkbox" name="is_deee" checked={formData.is_deee} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
            <span>DEEE</span>
          </label>
        </div>
      </fieldset>

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea id="notes" name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} />
      </div>

      {/* Activ */}
      <div className="flex items-center gap-2">
        <input type="checkbox" id="is_active" name="is_active" checked={formData.is_active} onChange={handleChange} className="h-4 w-4 rounded border-gray-300" />
        <Label htmlFor="is_active" className="cursor-pointer">Furnizor activ</Label>
      </div>

      {/* Butoane */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Anuleaza</Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {supplier ? 'Salveaza' : 'Adauga furnizor'}
        </Button>
      </div>
    </form>
  )
}
