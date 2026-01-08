import { useEffect, useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select, Textarea } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import type { InsertTables } from '@/types/database'
import type { ContractWithSupplier } from '../queries'

type FormData = Omit<InsertTables<'contracts'>, 'company_id' | 'id'>

const initialFormData: FormData = {
  supplier_id: null,
  contract_number: '',
  description: '',
  start_date: new Date().toISOString().split('T')[0],
  end_date: '',
  value: null,
  status: 'active',
  notes: '',
}

interface ContractFormProps {
  companyId: string
  contract?: ContractWithSupplier | null
  isLoading?: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function ContractForm({ companyId, contract, isLoading, onSubmit, onCancel }: ContractFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  // Query pentru furnizori (doar cei cu is_contract = true sau toti)
  const { data: suppliers = [] } = useQuery(suppliersQueryOptions(companyId))

  // Filtreaza furnizori care pot avea contracte
  const contractSuppliers = useMemo(() =>
    suppliers.filter(s => s.is_contract || s.is_punct_lucru),
    [suppliers]
  )

  const supplierOptions = useMemo(() => [
    { value: '', label: 'Fara furnizor asociat' },
    ...contractSuppliers.map(s => ({ value: s.id, label: s.name }))
  ], [contractSuppliers])

  const statusOptions = [
    { value: 'active', label: 'Activ' },
    { value: 'completed', label: 'Finalizat' },
    { value: 'cancelled', label: 'Anulat' },
  ]

  useEffect(() => {
    if (contract) {
      setFormData({
        supplier_id: contract.supplier_id,
        contract_number: contract.contract_number,
        description: contract.description || '',
        start_date: contract.start_date || '',
        end_date: contract.end_date || '',
        value: contract.value,
        status: contract.status,
        notes: contract.notes || '',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [contract])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dataToSubmit = {
      ...formData,
      supplier_id: formData.supplier_id || null,
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      value: formData.value ? Number(formData.value) : null,
    }
    onSubmit(dataToSubmit)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Informatii contract */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Informatii contract</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contract_number">Numar contract *</Label>
            <Input
              id="contract_number"
              name="contract_number"
              value={formData.contract_number}
              onChange={handleChange}
              placeholder="ex: CTR-2024-001"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier_id">Furnizor / Partener</Label>
            <Select
              id="supplier_id"
              name="supplier_id"
              value={formData.supplier_id || ''}
              onChange={handleChange}
              options={supplierOptions}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descriere</Label>
          <Input
            id="description"
            name="description"
            value={formData.description || ''}
            onChange={handleChange}
            placeholder="Descriere contract sau obiect licitatie"
          />
        </div>
      </fieldset>

      {/* Perioada si valoare */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-medium text-muted-foreground">Perioada si valoare</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="start_date">Data inceput</Label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              value={formData.start_date || ''}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_date">Data sfarsit</Label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              value={formData.end_date || ''}
              onChange={handleChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="value">Valoare contract (RON)</Label>
            <Input
              id="value"
              name="value"
              type="number"
              step="0.01"
              min="0"
              value={formData.value || ''}
              onChange={handleChange}
              placeholder="0.00"
            />
          </div>
        </div>
      </fieldset>

      {/* Status */}
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

      {/* Note */}
      <div className="space-y-2">
        <Label htmlFor="notes">Note</Label>
        <Textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          rows={3}
          placeholder="Informatii suplimentare despre contract"
        />
      </div>

      {/* Butoane */}
      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {contract ? 'Salveaza modificarile' : 'Adauga contract'}
        </Button>
      </div>
    </form>
  )
}
