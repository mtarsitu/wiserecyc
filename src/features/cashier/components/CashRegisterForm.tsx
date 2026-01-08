import { useState, useEffect } from 'react'
import { Button, Input, Label, Select } from '@/components/ui'
import type { CashRegister, CashRegisterType } from '@/types/database'

interface CashRegisterFormProps {
  register?: CashRegister | null
  isLoading: boolean
  onSubmit: (data: { name: string; type: CashRegisterType; initial_balance: number }) => void
  onCancel: () => void
}

export function CashRegisterForm({
  register,
  isLoading,
  onSubmit,
  onCancel,
}: CashRegisterFormProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<CashRegisterType>('cash')
  const [initialBalance, setInitialBalance] = useState('')

  useEffect(() => {
    if (register) {
      setName(register.name)
      setType(register.type as CashRegisterType)
      setInitialBalance(register.initial_balance.toString())
    } else {
      setName('')
      setType('cash')
      setInitialBalance('0')
    }
  }, [register])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      name: name.trim(),
      type,
      initial_balance: parseFloat(initialBalance) || 0,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nume casa</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex: CASA 1, BANCA ING"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tip</Label>
        <Select
          id="type"
          value={type}
          onChange={(e) => setType(e.target.value as CashRegisterType)}
          options={[
            { value: 'cash', label: 'Numerar' },
            { value: 'bank', label: 'Cont bancar' },
          ]}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="initial_balance">Sold initial (RON)</Label>
        <Input
          id="initial_balance"
          type="number"
          step="0.01"
          value={initialBalance}
          onChange={(e) => setInitialBalance(e.target.value)}
          placeholder="0.00"
        />
        <p className="text-xs text-muted-foreground">
          Soldul initial va fi folosit ca punct de plecare pentru calculul soldurilor zilnice
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Anuleaza
        </Button>
        <Button type="submit" disabled={isLoading || !name.trim()}>
          {isLoading ? 'Se salveaza...' : register ? 'Actualizeaza' : 'Adauga casa'}
        </Button>
      </div>
    </form>
  )
}
