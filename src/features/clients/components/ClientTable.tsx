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
import type { ClientBalance } from '../queries'

interface ClientTableProps {
  clients: Client[]
  balances?: ClientBalance[]  // Optional balance data
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (client: Client) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

export function ClientTable({
  clients,
  balances = [],
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: ClientTableProps) {
  // Create a map for quick balance lookup
  const balanceMap = new Map(balances.map(b => [b.client_id, b]))

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nume</TableHead>
          <TableHead>CUI</TableHead>
          <TableHead>Localitate</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead className="text-right">Sold</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => {
          const balance = balanceMap.get(client.id)
          const remaining = balance?.remaining || 0

          return (
          <TableRow key={client.id}>
            <TableCell className="font-medium">{client.name}</TableCell>
            <TableCell>{client.cui || '-'}</TableCell>
            <TableCell>
              {client.city ? `${client.city}${client.county ? `, ${client.county}` : ''}` : '-'}
            </TableCell>
            <TableCell>{client.phone || '-'}</TableCell>
            <TableCell className="text-right">
              {balance ? (
                <div className="text-sm">
                  {remaining > 0 ? (
                    <span className="text-green-600 font-medium" title={`Vândut: ${balance.total_sold.toFixed(2)} RON\nÎncasat: ${balance.total_collected.toFixed(2)} RON`}>
                      +{remaining.toFixed(2)} RON
                    </span>
                  ) : remaining < 0 ? (
                    <span className="text-red-600 font-medium" title="Încasat în avans">
                      {remaining.toFixed(2)} RON
                    </span>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </div>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
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
          )
        })}
      </TableBody>
    </Table>
  )
}
