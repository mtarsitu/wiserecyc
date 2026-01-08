import { useMemo } from 'react'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
} from '@/components/ui'
import { Search, Pencil, Trash2, Loader2 } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import type { Expense } from '@/types/database'

interface ExpenseTableProps {
  expenses: Expense[]
  isLoading: boolean
  onEdit: (expense: Expense) => void
  onDelete: (id: string) => void
  deleteLoading: boolean
}

const typeLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  payment: { label: 'Plata', variant: 'destructive' },
  collection: { label: 'Incasare', variant: 'default' },
}

const paymentMethodLabels: Record<string, string> = {
  bank: 'Virament',
  cash: 'Numerar',
}

const attributionTypeLabels: Record<string, string> = {
  contract: 'Contract',
  punct_lucru: 'Punct lucru',
  deee: 'DEEE',
}

export function ExpenseTable({ expenses, isLoading, onEdit, onDelete, deleteLoading }: ExpenseTableProps) {
  const searchQuery = useUIStore((s) => s.getSearchQuery('expenses'))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const deleteConfirm = useUIStore((s) => s.getDeleteConfirm('expenses'))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  const filteredExpenses = useMemo(() => {
    if (!searchQuery) return expenses
    const q = searchQuery.toLowerCase()
    return expenses.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.date.includes(q) ||
        (e.notes && e.notes.toLowerCase().includes(q))
    )
  }, [expenses, searchQuery])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cauta cheltuiala..."
          value={searchQuery}
          onChange={(e) => setSearchQuery('expenses', e.target.value)}
          className="pl-8"
        />
      </div>

      {filteredExpenses.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nu exista cheltuieli inregistrate.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Denumire</TableHead>
                <TableHead>Tip</TableHead>
                <TableHead className="text-right">Suma</TableHead>
                <TableHead>Plata</TableHead>
                <TableHead>Atribuire</TableHead>
                <TableHead className="text-right">Actiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{formatDate(expense.date)}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{expense.name}</div>
                      {expense.notes && (
                        <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {expense.notes}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={typeLabels[expense.type]?.variant || 'secondary'}>
                      {typeLabels[expense.type]?.label || expense.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    <span className={expense.type === 'payment' ? 'text-destructive' : 'text-green-600'}>
                      {expense.type === 'payment' ? '-' : '+'}
                      {formatCurrency(expense.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {expense.payment_method ? paymentMethodLabels[expense.payment_method] : '-'}
                  </TableCell>
                  <TableCell>
                    {expense.attribution_type ? attributionTypeLabels[expense.attribution_type] : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onEdit(expense)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {deleteConfirm === expense.id ? (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(expense.id)}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm('expenses', null)}
                          >
                            Nu
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm('expenses', expense.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
