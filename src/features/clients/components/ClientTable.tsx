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
import type { Client } from '@/types/database'

interface ClientTableProps {
  clients: Client[]
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (client: Client) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

export function ClientTable({
  clients,
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: ClientTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nume</TableHead>
          <TableHead>CUI</TableHead>
          <TableHead>Localitate</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.name}</TableCell>
            <TableCell>{client.cui || '-'}</TableCell>
            <TableCell>
              {client.city ? `${client.city}${client.county ? `, ${client.county}` : ''}` : '-'}
            </TableCell>
            <TableCell>{client.phone || '-'}</TableCell>
            <TableCell>{client.email || '-'}</TableCell>
            <TableCell>
              <Badge variant={client.is_active ? 'default' : 'secondary'}>
                {client.is_active ? 'Activ' : 'Inactiv'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(client)} title="Editeaza">
                  <Pencil className="h-4 w-4" />
                </Button>
                {deleteConfirmId === client.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteConfirm(client.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeleteCancel}>
                      Nu
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(client.id)} title="Sterge">
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
