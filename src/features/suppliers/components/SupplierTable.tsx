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
import type { Supplier } from '@/types/database'

interface SupplierTableProps {
  suppliers: Supplier[]
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (supplier: Supplier) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

function SupplierTypeBadges({ supplier }: { supplier: Supplier }) {
  const badges = []
  if (supplier.is_contract) {
    badges.push(<Badge key="contract" variant="default" className="mr-1">Contract</Badge>)
  }
  if (supplier.is_punct_lucru) {
    badges.push(<Badge key="punct" variant="secondary" className="mr-1">Punct lucru</Badge>)
  }
  if (supplier.is_deee) {
    badges.push(<Badge key="deee" variant="outline" className="mr-1">DEEE</Badge>)
  }
  return badges.length > 0 ? <>{badges}</> : <span className="text-muted-foreground">-</span>
}

export function SupplierTable({
  suppliers,
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: SupplierTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nume</TableHead>
          <TableHead>CUI</TableHead>
          <TableHead>Localitate</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell>{supplier.cui || '-'}</TableCell>
            <TableCell>
              {supplier.city
                ? `${supplier.city}${supplier.county ? `, ${supplier.county}` : ''}`
                : '-'}
            </TableCell>
            <TableCell>{supplier.phone || '-'}</TableCell>
            <TableCell><SupplierTypeBadges supplier={supplier} /></TableCell>
            <TableCell>
              <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                {supplier.is_active ? 'Activ' : 'Inactiv'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(supplier)} title="Editeaza">
                  <Pencil className="h-4 w-4" />
                </Button>
                {deleteConfirmId === supplier.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteConfirm(supplier.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeleteCancel}>
                      Nu
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(supplier.id)} title="Sterge">
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
