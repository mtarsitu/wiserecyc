import { useState, useEffect } from 'react'
import { Button, Input, Label, Select, Textarea } from '@/components/ui'
import type { CashRegister, CashTransactionType } from '@/types/database'

interface TransactionFormProps {
  registers: CashRegister[]
  selectedDate: string
  isLoading: boolean
  onSubmit: (data: {
    cash_register_id: string
    type: CashTransactionType
    amount: number
    description: string
  }) => void
  onCancel: () => void
}

export function TransactionForm({
  registers,
  selectedDate,
  isLoading,
  onSubmit,
  onCancel,
}: TransactionFormProps) {
  const [cashRegisterId, setCashRegisterId] = useState('')
  const [type, setType] = useState<CashTransactionType>('income')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (registers.length > 0 && !cashRegisterId) {
      setCashRegisterId(registers[0].id)
    }
  }, [registers, cashRegisterId])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Suma trebuie sa fie mai mare decat 0')
      return
    }
    onSubmit({
      cash_register_id: cashRegisterId,
      type,
      amount: parsedAmount,
      description: description.trim(),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Data tranzactie</Label>
        <Input value={selectedDate} disabled className="bg-muted" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cash_register">Casa</Label>
        <Select
          id="cash_register"
          value={cashRegisterId}
          onChange={(e) => setCashRegisterId(e.target.value)}
          options={registers.map((register) => ({
            value: register.id,
            label: `${register.name} (${register.type === 'cash' ? 'Numerar' : 'Cont bancar'})`,
          }))}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tip tranzactie</Label>
        <Select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as CashTransactionType)}
          options={[
            { value: 'income', label: 'Incasare' },
            { value: 'expense', label: 'Plata' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Suma (RON)</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descriere</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descriere optionala..."
          rows={3}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading || !cashRegisterId || !amount}>
          {isLoading ? 'Se salveaza...' : 'Adauga tranzactie'}
        </Button>
      </div>
    </form>
  )
}
