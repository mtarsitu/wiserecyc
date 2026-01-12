import { Button } from '@/components/ui'
import { Pencil, Trash2, Truck, Building2, Package } from 'lucide-react'
import type { Vehicle, Transporter, Supplier } from '@/types/database'

interface VehicleWithRelations extends Vehicle {
  transporter?: Transporter | null
  supplier?: Supplier | null
}

interface VehicleTableProps {
  vehicles: VehicleWithRelations[]
  isLoading?: boolean
  onEdit: (vehicle: VehicleWithRelations) => void
  onDelete: (id: string) => void
}

export function VehicleTable({ vehicles, isLoading, onEdit, onDelete }: VehicleTableProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  if (vehicles.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nu exista vehicule inregistrate.
      </div>
    )
  }

  const getOwnerDisplay = (vehicle: VehicleWithRelations) => {
    switch (vehicle.owner_type) {
      case 'own_fleet':
        return (
          <span className="inline-flex items-center gap-1 text-green-600">
            <Truck className="h-4 w-4" />
            Flota proprie
          </span>
        )
      case 'transporter':
        return (
          <span className="inline-flex items-center gap-1 text-blue-600">
            <Building2 className="h-4 w-4" />
            {vehicle.transporter?.name || 'Transportator extern'}
          </span>
        )
      case 'supplier':
        return (
          <span className="inline-flex items-center gap-1 text-orange-600">
            <Package className="h-4 w-4" />
            {vehicle.supplier?.name || 'Furnizor'}
          </span>
        )
      default:
        return <span className="text-muted-foreground">-</span>
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="text-left py-3 px-2 font-medium">Nr. Inmatriculare</th>
            <th className="text-left py-3 px-2 font-medium">Tip</th>
            <th className="text-left py-3 px-2 font-medium">Proprietate</th>
            <th className="text-left py-3 px-2 font-medium">Sofer</th>
            <th className="text-right py-3 px-2 font-medium">Actiuni</th>
          </tr>
        </thead>
        <tbody>
          {vehicles.map((vehicle) => (
            <tr key={vehicle.id} className="border-b hover:bg-muted/50">
              <td className="py-3 px-2 font-mono font-medium">
                {vehicle.vehicle_number}
              </td>
              <td className="py-3 px-2 text-muted-foreground">
                {vehicle.vehicle_type || '-'}
              </td>
              <td className="py-3 px-2">
                {getOwnerDisplay(vehicle)}
              </td>
              <td className="py-3 px-2 text-muted-foreground">
                {vehicle.driver_name || '-'}
              </td>
              <td className="py-3 px-2 text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(vehicle)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Sigur doriti sa stergeti acest vehicul?')) {
                        onDelete(vehicle.id)
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
