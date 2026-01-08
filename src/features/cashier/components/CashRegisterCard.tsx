import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui'
import { Banknote, Building2, Edit, Trash2 } from 'lucide-react'
import type { CashRegisterWithBalance } from '../queries'

interface CashRegisterCardProps {
  register: CashRegisterWithBalance
  onEdit?: () => void
  onDelete?: () => void
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount)

export function CashRegisterCard({ register, onEdit, onDelete }: CashRegisterCardProps) {
  const Icon = register.type === 'cash' ? Banknote : Building2

  return (
    <Card className="relative">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{register.name}</CardTitle>
          </div>
          <div className="flex gap-1">
            {onEdit && (
              <button
                onClick={onEdit}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                title="Editeaza"
              >
                <Edit className="h-4 w-4" />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                title="Sterge"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <span className="text-xs text-muted-foreground">
          {register.type === 'cash' ? 'Numerar' : 'Cont bancar'}
        </span>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Opening Balance */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">Sold inceput zi</span>
          <span className="font-medium">{formatCurrency(register.opening_balance)}</span>
        </div>

        {/* Separator */}
        <div className="border-t" />

        {/* Daily Income */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-green-600">+ Incasari</span>
          <span className="font-medium text-green-600">
            {formatCurrency(register.daily_income)}
          </span>
        </div>

        {/* Daily Expense */}
        <div className="flex justify-between items-center text-sm">
          <span className="text-destructive">- Plati</span>
          <span className="font-medium text-destructive">
            {formatCurrency(register.daily_expense)}
          </span>
        </div>

        {/* Separator */}
        <div className="border-t" />

        {/* Closing Balance */}
        <div className="flex justify-between items-center">
          <span className="font-semibold">Sold final</span>
          <span
            className={`text-lg font-bold ${
              register.closing_balance >= 0 ? 'text-green-600' : 'text-destructive'
            }`}
          >
            {formatCurrency(register.closing_balance)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
