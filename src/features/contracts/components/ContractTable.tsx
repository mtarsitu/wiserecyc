import {
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import type { ContractWithSupplier } from '../queries'

interface ContractTableProps {
  contracts: ContractWithSupplier[]
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (contract: ContractWithSupplier) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleDateString('ro-RO')
}

function formatCurrency(value: number | null): string {
  if (value === null) return '-'
  return value.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' RON'
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Activ</Badge>
    case 'completed':
      return <Badge variant="secondary">Finalizat</Badge>
    case 'cancelled':
      return <Badge variant="destructive">Anulat</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export function ContractTable({
  contracts,
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: ContractTableProps) {
  if (contracts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-8 text-center">
        Nu exista contracte inregistrate. Apasa butonul "Contract nou" pentru a adauga.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nr. Contract</TableHead>
          <TableHead>Furnizor / Partener</TableHead>
          <TableHead>Descriere</TableHead>
          <TableHead>Perioada</TableHead>
          <TableHead className="text-right">Valoare</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {contracts.map((contract) => (
          <TableRow key={contract.id}>
            <TableCell className="font-medium">{contract.contract_number}</TableCell>
            <TableCell>{contract.supplier?.name || '-'}</TableCell>
            <TableCell className="max-w-[200px] truncate">
              {contract.description || '-'}
            </TableCell>
            <TableCell>
              <div className="text-sm">
                <div>{formatDate(contract.start_date)}</div>
                {contract.end_date && (
                  <div className="text-muted-foreground">→ {formatDate(contract.end_date)}</div>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">{formatCurrency(contract.value)}</TableCell>
            <TableCell>{getStatusBadge(contract.status)}</TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(contract)} title="Editeaza">
                  <Pencil className="h-4 w-4" />
                </Button>
                {deleteConfirmId === contract.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteConfirm(contract.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeleteCancel}>
                      Nu
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(contract.id)} title="Sterge">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
