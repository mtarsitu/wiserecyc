import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, Input, Label, Textarea } from '@/components/ui'
import { Plus, Truck, Building2, Search, Package, Users } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { transportersQueryOptions } from './queries'
import { useCreateTransporter, useUpdateTransporter, useDeleteTransporter } from './mutations'
import { vehiclesQueryOptions, type VehicleWithRelations } from '@/features/vehicles/queries'
import { useCreateVehicle, useUpdateVehicle, useDeleteVehicle } from '@/features/vehicles/mutations'
import { VehicleForm, VehicleTable } from '@/features/vehicles/components'
import { driversQueryOptions, type DriverWithRelations } from '@/features/drivers/queries'
import { useCreateDriver, useUpdateDriver, useDeleteDriver } from '@/features/drivers/mutations'
import { DriverForm, DriverTable } from '@/features/drivers/components'
import type { VehicleOwnerType } from '@/types/database'

type TabType = 'vehicles' | 'transporters' | 'drivers'

export function TransportersPage() {
  const { companyId } = useAuthContext()
  const [activeTab, setActiveTab] = useState<TabType>('vehicles')
  const [search, setSearch] = useState('')

  // UI Store
  const transporterDialog = useUIStore((s) => s.getDialog('transporter'))
  const vehicleDialog = useUIStore((s) => s.getDialog('vehicle'))
  const driverDialog = useUIStore((s) => s.getDialog('driver'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)

  // Queries
  const { data: transporters = [], isLoading: loadingTransporters } = useQuery(
    transportersQueryOptions(companyId ?? null)
  )
  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery(
    vehiclesQueryOptions(companyId ?? null)
  )
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery(
    driversQueryOptions(companyId ?? null)
  )

  // Mutations
  const createTransporter = useCreateTransporter()
  const updateTransporter = useUpdateTransporter()
  const deleteTransporter = useDeleteTransporter()
  const createVehicle = useCreateVehicle()
  const updateVehicle = useUpdateVehicle()
  const deleteVehicle = useDeleteVehicle()
  const createDriver = useCreateDriver()
  const updateDriver = useUpdateDriver()
  const deleteDriver = useDeleteDriver()

  // Current editing items
  const editingTransporter = useMemo(() => {
    if (!transporterDialog.editId) return null
    return transporters.find((t) => t.id === transporterDialog.editId) || null
  }, [transporterDialog.editId, transporters])

  const editingVehicle = useMemo(() => {
    if (!vehicleDialog.editId) return null
    return vehicles.find((v) => v.id === vehicleDialog.editId) || null
  }, [vehicleDialog.editId, vehicles])

  const editingDriver = useMemo(() => {
    if (!driverDialog.editId) return null
    return drivers.find((d) => d.id === driverDialog.editId) || null
  }, [driverDialog.editId, drivers])

  // Filtered data
  const filteredVehicles = useMemo(() => {
    if (!search) return vehicles
    const searchLower = search.toLowerCase()
    return vehicles.filter(
      (v) =>
        v.vehicle_number.toLowerCase().includes(searchLower) ||
        v.driver_name?.toLowerCase().includes(searchLower) ||
        v.transporter?.name?.toLowerCase().includes(searchLower) ||
        v.supplier?.name?.toLowerCase().includes(searchLower)
    )
  }, [vehicles, search])

  const filteredTransporters = useMemo(() => {
    if (!search) return transporters
    const searchLower = search.toLowerCase()
    return transporters.filter(
      (t) =>
        t.name.toLowerCase().includes(searchLower) ||
        t.cui?.toLowerCase().includes(searchLower) ||
        t.vehicle_number?.toLowerCase().includes(searchLower)
    )
  }, [transporters, search])

  const filteredDrivers = useMemo(() => {
    if (!search) return drivers
    const searchLower = search.toLowerCase()
    return drivers.filter(
      (d) =>
        d.name.toLowerCase().includes(searchLower) ||
        d.phone?.toLowerCase().includes(searchLower) ||
        d.transporter?.name?.toLowerCase().includes(searchLower) ||
        d.supplier?.name?.toLowerCase().includes(searchLower)
    )
  }, [drivers, search])

  // Group vehicles by owner type
  const ownFleetVehicles = filteredVehicles.filter((v) => v.owner_type === 'own_fleet')
  const transporterVehicles = filteredVehicles.filter((v) => v.owner_type === 'transporter')
  const supplierVehicles = filteredVehicles.filter((v) => v.owner_type === 'supplier')

  // Group drivers by owner type
  const ownFleetDrivers = filteredDrivers.filter((d) => d.owner_type === 'own_fleet')
  const transporterDrivers = filteredDrivers.filter((d) => d.owner_type === 'transporter')
  const supplierDrivers = filteredDrivers.filter((d) => d.owner_type === 'supplier')

  // Handlers
  const handleTransporterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    const data = {
      name: formData.get('name') as string,
      cui: (formData.get('cui') as string) || null,
      phone: (formData.get('phone') as string) || null,
      email: (formData.get('email') as string) || null,
      vehicle_number: (formData.get('vehicle_number') as string) || null,
      notes: (formData.get('notes') as string) || null,
    }

    try {
      if (editingTransporter) {
        await updateTransporter.mutateAsync({
          id: editingTransporter.id,
          company_id: companyId!,
          ...data,
        })
      } else {
        await createTransporter.mutateAsync({
          company_id: companyId!,
          ...data,
        })
      }
      closeDialog('transporter')
    } catch (error) {
      console.error('Error saving transporter:', error)
      alert('Eroare la salvare')
    }
  }

  const handleVehicleSubmit = async (data: {
    vehicle_number: string
    vehicle_type: string
    owner_type: VehicleOwnerType
    transporter_id: string | null
    supplier_id: string | null
    driver_name: string
    notes: string
    has_transport_license: boolean
    transport_license_number: string | null
    transport_license_expiry: string | null
  }) => {
    try {
      if (editingVehicle) {
        await updateVehicle.mutateAsync({
          id: editingVehicle.id,
          company_id: companyId!,
          ...data,
        })
      } else {
        await createVehicle.mutateAsync({
          company_id: companyId!,
          ...data,
        })
      }
      closeDialog('vehicle')
    } catch (error) {
      console.error('Error saving vehicle:', error)
      alert('Eroare la salvare: ' + (error instanceof Error ? error.message : 'Unknown'))
    }
  }

  const handleDeleteTransporter = async (id: string) => {
    if (!confirm('Sigur doriti sa stergeti acest transportator?')) return
    try {
      await deleteTransporter.mutateAsync({ id, company_id: companyId! })
    } catch (error) {
      console.error('Error deleting transporter:', error)
      alert('Eroare la stergere')
    }
  }

  const handleDeleteVehicle = async (id: string) => {
    try {
      await deleteVehicle.mutateAsync({ id, company_id: companyId! })
    } catch (error) {
      console.error('Error deleting vehicle:', error)
      alert('Eroare la stergere')
    }
  }

  const handleDriverSubmit = async (data: {
    name: string
    id_series: string
    id_number: string
    phone: string
    owner_type: VehicleOwnerType
    transporter_id: string | null
    supplier_id: string | null
    notes: string
  }) => {
    try {
      if (editingDriver) {
        await updateDriver.mutateAsync({
          id: editingDriver.id,
          company_id: companyId!,
          ...data,
        })
      } else {
        await createDriver.mutateAsync({
          company_id: companyId!,
          ...data,
        })
      }
      closeDialog('driver')
    } catch (error) {
      console.error('Error saving driver:', error)
      alert('Eroare la salvare: ' + (error instanceof Error ? error.message : 'Unknown'))
    }
  }

  const handleDeleteDriver = async (id: string) => {
    try {
      await deleteDriver.mutateAsync({ id, company_id: companyId! })
    } catch (error) {
      console.error('Error deleting driver:', error)
      alert('Eroare la stergere')
    }
  }

  return (
    <div>
      <Header title="Transportatori & Vehicule" />
      <div className="p-6">
        {/* Header with search and actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cauta..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <div className="flex gap-2">
            {activeTab === 'vehicles' && (
              <Button onClick={() => openDialog('vehicle')}>
                <Plus className="mr-2 h-4 w-4" />
                Vehicul nou
              </Button>
            )}
            {activeTab === 'transporters' && (
              <Button onClick={() => openDialog('transporter')}>
                <Plus className="mr-2 h-4 w-4" />
                Transportator nou
              </Button>
            )}
            {activeTab === 'drivers' && (
              <Button onClick={() => openDialog('driver')}>
                <Plus className="mr-2 h-4 w-4" />
                Sofer nou
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'vehicles' ? 'default' : 'outline'}
            onClick={() => setActiveTab('vehicles')}
          >
            <Truck className="mr-2 h-4 w-4" />
            Vehicule ({vehicles.length})
          </Button>
          <Button
            variant={activeTab === 'drivers' ? 'default' : 'outline'}
            onClick={() => setActiveTab('drivers')}
          >
            <Users className="mr-2 h-4 w-4" />
            Soferi ({drivers.length})
          </Button>
          <Button
            variant={activeTab === 'transporters' ? 'default' : 'outline'}
            onClick={() => setActiveTab('transporters')}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Transportatori ({transporters.length})
          </Button>
        </div>

        {/* Vehicles Tab */}
        {activeTab === 'vehicles' && (
          <div className="space-y-6">
            {/* Own Fleet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  Flota proprie ({ownFleetVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VehicleTable
                  vehicles={ownFleetVehicles}
                  isLoading={loadingVehicles}
                  onEdit={(v) => openDialog('vehicle', v.id)}
                  onDelete={handleDeleteVehicle}
                />
              </CardContent>
            </Card>

            {/* Transporter Vehicles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Vehicule transportatori externi ({transporterVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VehicleTable
                  vehicles={transporterVehicles}
                  isLoading={loadingVehicles}
                  onEdit={(v) => openDialog('vehicle', v.id)}
                  onDelete={handleDeleteVehicle}
                />
              </CardContent>
            </Card>

            {/* Supplier Vehicles */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Vehicule furnizori ({supplierVehicles.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <VehicleTable
                  vehicles={supplierVehicles}
                  isLoading={loadingVehicles}
                  onEdit={(v) => openDialog('vehicle', v.id)}
                  onDelete={handleDeleteVehicle}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Drivers Tab */}
        {activeTab === 'drivers' && (
          <div className="space-y-6">
            {/* Own Fleet Drivers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  Soferi proprii ({ownFleetDrivers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DriverTable
                  drivers={ownFleetDrivers}
                  isLoading={loadingDrivers}
                  onEdit={(d) => openDialog('driver', d.id)}
                  onDelete={handleDeleteDriver}
                />
              </CardContent>
            </Card>

            {/* Transporter Drivers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Soferi transportatori ({transporterDrivers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DriverTable
                  drivers={transporterDrivers}
                  isLoading={loadingDrivers}
                  onEdit={(d) => openDialog('driver', d.id)}
                  onDelete={handleDeleteDriver}
                />
              </CardContent>
            </Card>

            {/* Supplier Drivers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-orange-600" />
                  Soferi furnizori ({supplierDrivers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DriverTable
                  drivers={supplierDrivers}
                  isLoading={loadingDrivers}
                  onEdit={(d) => openDialog('driver', d.id)}
                  onDelete={handleDeleteDriver}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Transporters Tab */}
        {activeTab === 'transporters' && (
          <Card>
            <CardHeader>
              <CardTitle>Transportatori externi</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTransporters ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : filteredTransporters.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  Nu exista transportatori inregistrati.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 font-medium">Nume</th>
                        <th className="text-left py-3 px-2 font-medium">CUI</th>
                        <th className="text-left py-3 px-2 font-medium">Telefon</th>
                        <th className="text-left py-3 px-2 font-medium">Nr. Masina</th>
                        <th className="text-right py-3 px-2 font-medium">Actiuni</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransporters.map((t) => (
                        <tr key={t.id} className="border-b hover:bg-muted/50">
                          <td className="py-3 px-2 font-medium">{t.name}</td>
                          <td className="py-3 px-2 text-muted-foreground">{t.cui || '-'}</td>
                          <td className="py-3 px-2 text-muted-foreground">{t.phone || '-'}</td>
                          <td className="py-3 px-2 font-mono">{t.vehicle_number || '-'}</td>
                          <td className="py-3 px-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDialog('transporter', t.id)}
                              >
                                Editeaza
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTransporter(t.id)}
                              >
                                Sterge
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Transporter Dialog */}
      <Dialog
        open={transporterDialog.isOpen}
        onClose={() => closeDialog('transporter')}
        title={editingTransporter ? 'Editeaza transportator' : 'Transportator nou'}
        maxWidth="md"
      >
        <form onSubmit={handleTransporterSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nume *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={editingTransporter?.name || ''}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cui">CUI</Label>
              <Input
                id="cui"
                name="cui"
                defaultValue={editingTransporter?.cui || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={editingTransporter?.phone || ''}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={editingTransporter?.email || ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_number">Nr. masina implicit</Label>
              <Input
                id="vehicle_number"
                name="vehicle_number"
                defaultValue={editingTransporter?.vehicle_number || ''}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observatii</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={editingTransporter?.notes || ''}
              rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeDialog('transporter')}
            >
              Anuleaza
            </Button>
            <Button
              type="submit"
              disabled={createTransporter.isPending || updateTransporter.isPending}
            >
              {createTransporter.isPending || updateTransporter.isPending
                ? 'Se salveaza...'
                : 'Salveaza'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Vehicle Dialog */}
      <Dialog
        open={vehicleDialog.isOpen}
        onClose={() => closeDialog('vehicle')}
        title={editingVehicle ? 'Editeaza vehicul' : 'Vehicul nou'}
        maxWidth="md"
      >
        <VehicleForm
          companyId={companyId!}
          vehicle={editingVehicle as VehicleWithRelations}
          isLoading={createVehicle.isPending || updateVehicle.isPending}
          onSubmit={handleVehicleSubmit}
          onCancel={() => closeDialog('vehicle')}
        />
      </Dialog>

      {/* Driver Dialog */}
      <Dialog
        open={driverDialog.isOpen}
        onClose={() => closeDialog('driver')}
        title={editingDriver ? 'Editeaza sofer' : 'Sofer nou'}
        maxWidth="md"
      >
        <DriverForm
          companyId={companyId!}
          driver={editingDriver as DriverWithRelations}
          isLoading={createDriver.isPending || updateDriver.isPending}
          onSubmit={handleDriverSubmit}
          onCancel={() => closeDialog('driver')}
        />
      </Dialog>
    </div>
  )
}
