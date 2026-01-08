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
import type { Material } from '@/types/database'

interface MaterialTableProps {
  materials: Material[]
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (material: Material) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

export function MaterialTable({
  materials,
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: MaterialTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Denumire</TableHead>
          <TableHead>Unitate</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {materials.map((material) => (
          <TableRow key={material.id}>
            <TableCell className="font-medium">{material.name}</TableCell>
            <TableCell>{material.unit}</TableCell>
            <TableCell>
              <Badge variant={material.is_active ? 'default' : 'secondary'}>
                {material.is_active ? 'Activ' : 'Inactiv'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(material)} title="Editeaza">
                  <Pencil className="h-4 w-4" />
                </Button>
                {deleteConfirmId === material.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteConfirm(material.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeleteCancel}>Nu</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(material.id)} title="Sterge">
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
