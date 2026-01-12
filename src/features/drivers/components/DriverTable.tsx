import { Button } from '@/components/ui'
import { Pencil, Trash2, User, Building2, Package } from 'lucide-react'
import type { Driver, Transporter, Supplier } from '@/types/database'

interface DriverWithRelations extends Driver {
  transporter?: Transporter | null
  supplier?: Supplier | null
}

interface DriverTableProps {
  drivers: DriverWithRelations[]
  isLoading?: boolean
  onEdit: (driver: DriverWithRelations) => void
  onDelete: (id: string) => void
}

export function DriverTable({ drivers, isLoading, onEdit, onDelete }: DriverTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (drivers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nu exista soferi inregistrati.
      </div>
    )
  }

  const getOwnerDisplay = (driver: DriverWithRelations) => {
    switch (driver.owner_type) {
      case 'own_fleet':
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <User className="h-4 w-4" />
            Angajat propriu
          </span>
        )
      case 'transporter':
        return (
          <span className="inline-flex items-center gap-1 text-blue-600">
            <Building2 className="h-4 w-4" />
            {driver.transporter?.name || 'Transportator extern'}
          </span>
        )
      case 'supplier':
        return (
          <span className="inline-flex items-center gap-1 text-orange-600">
            <Package className="h-4 w-4" />
            {driver.supplier?.name || 'Furnizor'}
          </span>
        )
      default:
        return <span className="text-muted-foreground">-</span>
    }
  }

  const formatId = (driver: DriverWithRelations) => {
    if (driver.id_series && driver.id_number) {
      return `${driver.id_series} ${driver.id_number}`
    }
    if (driver.id_series) return driver.id_series
    if (driver.id_number) return driver.id_number
    return '-'
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium">Nume</th>
            <th className="text-left py-3 px-2 font-medium">Serie/Nr. Buletin</th>
            <th className="text-left py-3 px-2 font-medium">Telefon</th>
            <th className="text-left py-3 px-2 font-medium">Angajare</th>
            <th className="text-right py-3 px-2 font-medium">Actiuni</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-b hover:bg-muted/50">
              <td className="py-3 px-2 font-medium">
                {driver.name}
              </td>
              <td className="py-3 px-2 font-mono text-muted-foreground">
                {formatId(driver)}
              </td>
              <td className="py-3 px-2 text-muted-foreground">
                {driver.phone || '-'}
              </td>
              <td className="py-3 px-2">
                {getOwnerDisplay(driver)}
              </td>
              <td className="py-3 px-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(driver)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Sigur doriti sa stergeti acest sofer?')) {
                        onDelete(driver.id)
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
