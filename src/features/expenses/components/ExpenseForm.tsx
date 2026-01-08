import { useState, useEffect, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Input, Label, Select } from '@/components/ui'
import { Loader2 } from 'lucide-react'
import { cashRegistersQueryOptions } from '@/features/cashier/queries'
import { expenseCategoriesQueryOptions } from '@/features/expenses/queries'
import { suppliersQueryOptions } from '@/features/suppliers/queries'
import { contractsQueryOptions } from '@/features/contracts/queries'
import { activeEmployeesQueryOptions } from '@/features/employees/queries'
import type { Expense, ExpenseType, PaymentMethod, AttributionType } from '@/types/database'

interface FormData {
  date: string
  name: string
  amount: number
  type: ExpenseType
  payment_method: PaymentMethod | null
  attribution_type: AttributionType | null
  attribution_id: string | null
  category_id: string | null
  employee_id: string | null
  cash_register_id: string | null
  notes: string
}

const initialFormData: FormData = {
  date: new Date().toISOString().split('T')[0],
  name: '',
  amount: 0,
  type: 'payment',
  payment_method: 'cash',
  attribution_type: null,
  attribution_id: null,
  category_id: null,
  employee_id: null,
  cash_register_id: null,
  notes: '',
}

// Categorii care necesita selectia salariatului
const SALARY_CATEGORY_NAMES = ['avans salariu', 'avans', 'salariu', 'salarii']

interface ExpenseFormProps {
  companyId: string
  expense?: Expense | null
  isLoading?: boolean
  onSubmit: (data: FormData) => void
  onCancel: () => void
}

export function ExpenseForm({ companyId, expense, isLoading, onSubmit, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)

  // Query cash registers
  const { data: cashRegisters = [] } = useQuery(cashRegistersQueryOptions(companyId))

  // Query expense categories
  const { data: categories = [] } = useQuery(expenseCategoriesQueryOptions(companyId))

  // Query suppliers and contracts for attribution
  const { data: suppliers = [] } = useQuery(suppliersQueryOptions(companyId))
  const { data: contracts = [] } = useQuery(contractsQueryOptions(companyId))

  // Query employees for salary/advance payments
  const { data: employees = [] } = useQuery(activeEmployeesQueryOptions(companyId))

  const categoryOptions = useMemo(() => [
    { value: '', label: 'Fara categorie' },
    ...categories.map(c => ({
      value: c.id,
      label: c.name
    }))
  ], [categories])

  // Check if selected category is salary-related
  const selectedCategory = useMemo(() => {
    return categories.find(c => c.id === formData.category_id)
  }, [categories, formData.category_id])

  const isSalaryCategory = useMemo(() => {
    if (!selectedCategory) return false
    return SALARY_CATEGORY_NAMES.some(name =>
      selectedCategory.name.toLowerCase().includes(name)
    )
  }, [selectedCategory])

  const employeeOptions = useMemo(() => [
    { value: '', label: 'Selecteaza salariat' },
    ...employees.map(e => ({
      value: e.id,
      label: `${e.full_name}${e.position ? ` (${e.position})` : ''}`
    }))
  ], [employees])

  const cashRegisterOptions = useMemo(() =>
    cashRegisters.map(r => ({
      value: r.id,
      label: `${r.name} (${r.type === 'cash' ? 'Numerar' : 'Banca'})`
    })),
    [cashRegisters]
  )

  // Attribution options based on attribution_type
  const attributionOptions = useMemo(() => {
    if (formData.attribution_type === 'contract') {
      return [
        { value: '', label: 'Selecteaza contract' },
        ...contracts.map(c => ({
          value: c.id,
          label: `${c.contract_number} - ${c.description || 'Fara descriere'}`
        }))
      ]
    }
    if (formData.attribution_type === 'punct_lucru' || formData.attribution_type === 'deee') {
      // Filter suppliers by type
      const filtered = suppliers.filter(s =>
        formData.attribution_type === 'punct_lucru' ? s.is_punct_lucru : s.is_deee
      )
      return [
        { value: '', label: `Selecteaza ${formData.attribution_type === 'punct_lucru' ? 'punct de lucru' : 'DEEE'}` },
        ...filtered.map(s => ({
          value: s.id,
          label: s.name
        }))
      ]
    }
    return []
  }, [formData.attribution_type, contracts, suppliers])

  const expenseTypeOptions = [
    { value: 'payment', label: 'Plata' },
    { value: 'collection', label: 'Incasare' },
  ]

  const paymentMethodOptions = [
    { value: 'bank', label: 'Virament bancar' },
    { value: 'cash', label: 'Numerar' },
  ]

  const attributionTypeOptions = [
    { value: '', label: 'Fara atribuire' },
    { value: 'contract', label: 'Contract' },
    { value: 'punct_lucru', label: 'Punct de lucru' },
    { value: 'deee', label: 'DEEE' },
  ]

  useEffect(() => {
    if (expense) {
      setFormData({
        date: expense.date.split('T')[0],
        name: expense.name,
        amount: expense.amount,
        type: expense.type,
        payment_method: expense.payment_method,
        attribution_type: expense.attribution_type,
        attribution_id: expense.attribution_id || null,
        category_id: expense.category_id || null,
        employee_id: expense.employee_id || null,
        cash_register_id: null, // Will be selected on edit if needed
        notes: expense.notes || '',
      })
    } else {
      setFormData(initialFormData)
    }
  }, [expense])

  // Reset employee_id when category changes to non-salary category
  useEffect(() => {
    if (!isSalaryCategory && formData.employee_id) {
      setFormData(prev => ({ ...prev, employee_id: null }))
    }
  }, [isSalaryCategory])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    // Reset attribution_id when attribution_type changes
    if (name === 'attribution_type') {
      setFormData((prev) => ({ ...prev, [name]: value, attribution_id: null }))
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      amount: Number(formData.amount),
      attribution_type: formData.attribution_type || null,
      attribution_id: formData.attribution_id || null,
      category_id: formData.category_id || null,
      employee_id: formData.employee_id || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

        <div className="space-y-2">
          <Label htmlFor="type">Tip *</Label>
          <Select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            options={expenseTypeOptions}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Denumire *</Label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Ex: Motorina, Reparatie utilaj, Salariu"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_id">Categorie</Label>
          <Select
            id="category_id"
            name="category_id"
            value={formData.category_id || ''}
            onChange={handleChange}
            options={categoryOptions}
          />
        </div>
      </div>

      {/* Selectie salariat pentru avans/salariu */}
      {isSalaryCategory && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="space-y-2">
            <Label htmlFor="employee_id" className="text-blue-900">
              Salariat *
            </Label>
            <Select
              id="employee_id"
              name="employee_id"
              value={formData.employee_id || ''}
              onChange={handleChange}
              options={employeeOptions}
            />
            <p className="text-xs text-blue-700">
              Selecteaza salariatul pentru care se inregistreaza{' '}
              {selectedCategory?.name.toLowerCase().includes('avans') ? 'avansul' : 'salariul'}
            </p>
            {employees.length === 0 && (
              <p className="text-xs text-orange-600">
                Nu exista salariati inregistrati. Adauga salariati din meniul Salariati.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="amount">Suma (RON) *</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            value={formData.amount || ''}
            onChange={handleChange}
            required
          />
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
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="attribution_type">Atribuire</Label>
          <Select
            id="attribution_type"
            name="attribution_type"
            value={formData.attribution_type || ''}
            onChange={handleChange}
            options={attributionTypeOptions}
          />
        </div>

        {formData.attribution_type && (
          <div className="space-y-2">
            <Label htmlFor="attribution_id">
              {formData.attribution_type === 'contract' ? 'Contract' :
               formData.attribution_type === 'punct_lucru' ? 'Punct de lucru' : 'DEEE'}
            </Label>
            <Select
              id="attribution_id"
              name="attribution_id"
              value={formData.attribution_id || ''}
              onChange={handleChange}
              options={attributionOptions}
            />
            <p className="text-xs text-muted-foreground">
              {formData.attribution_type === 'contract'
                ? 'Plata va fi inregistrata pe acest contract'
                : 'Plata va fi inregistrata pe acest furnizor'}
            </p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cash_register_id">Casa/Cont pentru inregistrare</Label>
        <Select
          id="cash_register_id"
          name="cash_register_id"
          value={formData.cash_register_id || ''}
          onChange={handleChange}
          options={cashRegisterOptions}
          placeholder="Selecteaza casa (optional)"
        />
        <p className="text-xs text-muted-foreground">
          Selecteaza casa pentru a inregistra automat tranzactia in casierie
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Observatii</Label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows={3}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name || !formData.amount}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {expense ? 'Salveaza modificarile' : 'Adauga cheltuiala'}
        </Button>
      </div>
    </form>
  )
}
