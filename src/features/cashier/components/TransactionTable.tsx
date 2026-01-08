import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, Badge, Button } from '@/components/ui'
import { Trash2 } from 'lucide-react'
import type { CashTransactionWithDetails } from '../queries'

interface TransactionTableProps {
  transactions: CashTransactionWithDetails[]
  isLoading: boolean
  onDelete: (id: string) => void
  deleteLoading: boolean
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('ro-RO', { style: 'currency', currency: 'RON' }).format(amount)

const getSourceLabel = (source: string) => {
  const labels: Record<string, string> = {
    manual: 'Manual',
    acquisition: 'Achizitie',
    sale: 'Vanzare',
    expense: 'Cheltuiala',
  }
  return labels[source] || source
}

export function TransactionTable({
  transactions,
  isLoading,
  onDelete,
  deleteLoading,
}: TransactionTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nu exista tranzactii pentru aceasta data
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Casa</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead className="text-right">Suma</TableHead>
          <TableHead>Descriere</TableHead>
          <TableHead>Sursa</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {transactions.map((transaction) => (
          <TableRow key={transaction.id}>
            <TableCell className="font-medium">
              {transaction.cash_register?.name || '-'}
            </TableCell>
            <TableCell>
              <Badge
                variant={transaction.type === 'income' ? 'success' : 'destructive'}
              >
                {transaction.type === 'income' ? 'Incasare' : 'Plata'}
              </Badge>
            </TableCell>
            <TableCell
              className={`text-right font-medium ${
                transaction.type === 'income' ? 'text-green-600' : 'text-destructive'
              }`}
            >
              {transaction.type === 'income' ? '+' : '-'}
              {formatCurrency(transaction.amount)}
            </TableCell>
            <TableCell className="max-w-xs truncate">
              {transaction.description || '-'}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">
                {getSourceLabel(transaction.source_type)}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              {transaction.source_type === 'manual' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(transaction.id)}
                  disabled={deleteLoading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
