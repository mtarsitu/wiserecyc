import { useState, useEffect } from 'react'
import { Button, Input, Label, Select, Textarea } from '@/components/ui'
import { ArrowRight } from 'lucide-react'
import type { CashRegister } from '@/types/database'

interface TransferFormProps {
  registers: CashRegister[]
  selectedDate: string
  isLoading: boolean
  onSubmit: (data: {
    from_register_id: string
    to_register_id: string
    amount: number
    description: string
  }) => void
  onCancel: () => void
}

export function TransferForm({
  registers,
  selectedDate,
  isLoading,
  onSubmit,
  onCancel,
}: TransferFormProps) {
  const [fromRegisterId, setFromRegisterId] = useState('')
  const [toRegisterId, setToRegisterId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')

  // Initialize with first two registers if available
  useEffect(() => {
    if (registers.length > 0 && !fromRegisterId) {
      setFromRegisterId(registers[0].id)
    }
    if (registers.length > 1 && !toRegisterId) {
      setToRegisterId(registers[1].id)
    }
  }, [registers, fromRegisterId, toRegisterId])

  // Get register name for display
  const getRegisterLabel = (register: CashRegister) => {
    const typeLabel = register.type === 'cash' ? 'Numerar' : 'Cont bancar'
    return `${register.name} (${typeLabel})`
  }

  // Filter out selected register from opposite dropdown
  const fromOptions = registers.map((register) => ({
    value: register.id,
    label: getRegisterLabel(register),
  }))

  const toOptions = registers
    .filter((register) => register.id !== fromRegisterId)
    .map((register) => ({
      value: register.id,
      label: getRegisterLabel(register),
    }))

  // Auto-generate description based on selection
  useEffect(() => {
    if (fromRegisterId && toRegisterId) {
      const fromRegister = registers.find((r) => r.id === fromRegisterId)
      const toRegister = registers.find((r) => r.id === toRegisterId)
      if (fromRegister && toRegister) {
        setDescription(`Transfer din ${fromRegister.name} în ${toRegister.name}`)
      }
    }
  }, [fromRegisterId, toRegisterId, registers])

  const handleFromChange = (value: string) => {
    setFromRegisterId(value)
    // Reset toRegisterId if it's the same as the new fromRegisterId
    if (toRegisterId === value) {
      const otherRegister = registers.find((r) => r.id !== value)
      setToRegisterId(otherRegister?.id || '')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      alert('Suma trebuie sa fie mai mare decat 0')
      return
    }
    if (fromRegisterId === toRegisterId) {
      alert('Casa sursa si destinatie trebuie sa fie diferite')
      return
    }
    onSubmit({
      from_register_id: fromRegisterId,
      to_register_id: toRegisterId,
      amount: parsedAmount,
      description: description.trim(),
    })
  }

  const canSubmit =
    fromRegisterId &&
    toRegisterId &&
    fromRegisterId !== toRegisterId &&
    amount &&
    parseFloat(amount) > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Data transfer</Label>
        <Input value={selectedDate} disabled className="bg-muted" />
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <div className="space-y-2">
          <Label htmlFor="from_register">Din casa</Label>
          <Select
            id="from_register"
            value={fromRegisterId}
            onChange={(e) => handleFromChange(e.target.value)}
            options={fromOptions}
          />
        </div>

        <div className="pb-2">
          <ArrowRight className="h-5 w-5 text-muted-foreground" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="to_register">In casa</Label>
          <Select
            id="to_register"
            value={toRegisterId}
            onChange={(e) => setToRegisterId(e.target.value)}
            options={toOptions}
            disabled={!fromRegisterId || toOptions.length === 0}
          />
        </div>
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
          placeholder="Descriere transfer..."
          rows={2}
        />
      </div>

      <div className="rounded-lg bg-muted p-3 text-sm">
        <p className="text-muted-foreground">
          Transferul va crea doua tranzactii:
        </p>
        <ul className="mt-1 list-disc list-inside text-muted-foreground">
          <li>Plata (iesire) din casa sursa</li>
          <li>Incasare (intrare) in casa destinatie</li>
        </ul>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading || !canSubmit}>
          {isLoading ? 'Se proceseaza...' : 'Efectueaza transfer'}
        </Button>
      </div>
    </form>
  )
}
