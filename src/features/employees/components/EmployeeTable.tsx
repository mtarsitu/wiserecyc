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
import { Pencil, Trash2, Loader2, User } from 'lucide-react'
import type { Employee } from '@/types/database'

interface EmployeeTableProps {
  employees: Employee[]
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (employee: Employee) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

export function EmployeeTable({
  employees,
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: EmployeeTableProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ro-RO')
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nume</TableHead>
          <TableHead>Functie</TableHead>
          <TableHead>Telefon</TableHead>
          <TableHead>Data angajarii</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {employees.map((employee) => (
          <TableRow key={employee.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="font-medium">{employee.full_name}</div>
                  {employee.email && (
                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>{employee.position || '-'}</TableCell>
            <TableCell>{employee.phone || '-'}</TableCell>
            <TableCell>{formatDate(employee.hire_date)}</TableCell>
            <TableCell>
              <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                {employee.is_active ? 'Activ' : 'Inactiv'}
              </Badge>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(employee)} title="Editeaza">
                  <Pencil className="h-4 w-4" />
                </Button>
                {deleteConfirmId === employee.id ? (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => onDeleteConfirm(employee.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDeleteCancel}>
                      Nu
                    </Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => onDeleteClick(employee.id)} title="Sterge">
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
