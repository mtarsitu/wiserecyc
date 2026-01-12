import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Driver, Transporter, Supplier, Vehicle, VehicleOwnerType } from '@/types/database'

export interface DriverWithRelations extends Driver {
  transporter: Transporter | null
  supplier: Supplier | null
}

export const driverKeys = {
  all: ['drivers'] as const,
  lists: () => [...driverKeys.all, 'list'] as const,
  list: (companyId: string | null) => [...driverKeys.lists(), companyId] as const,
  ownFleet: (companyId: string | null) => [...driverKeys.all, 'own-fleet', companyId] as const,
  byTransporter: (transporterId: string) => [...driverKeys.all, 'transporter', transporterId] as const,
  bySupplier: (supplierId: string) => [...driverKeys.all, 'supplier', supplierId] as const,
  byVehicle: (vehicleId: string) => [...driverKeys.all, 'vehicle', vehicleId] as const,
  byOwnerType: (companyId: string | null, ownerType: VehicleOwnerType) => [...driverKeys.all, 'owner-type', companyId, ownerType] as const,
}

// Get all drivers for a company
export function driversQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: driverKeys.list(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as DriverWithRelations[]
    },
    enabled: !!companyId,
  })
}

// Get own fleet drivers
export function ownFleetDriversQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: driverKeys.ownFleet(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .select('*')
        .eq('company_id', companyId)
        .eq('owner_type', 'own_fleet')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Driver[]
    },
    enabled: !!companyId,
  })
}

// Get drivers by transporter
export function driversByTransporterQueryOptions(transporterId: string | null) {
  return queryOptions({
    queryKey: driverKeys.byTransporter(transporterId ?? ''),
    queryFn: async () => {
      if (!transporterId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .select('*')
        .eq('transporter_id', transporterId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Driver[]
    },
    enabled: !!transporterId,
  })
}

// Get drivers by supplier
export function driversBySupplierQueryOptions(supplierId: string | null) {
  return queryOptions({
    queryKey: driverKeys.bySupplier(supplierId ?? ''),
    queryFn: async () => {
      if (!supplierId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Driver[]
    },
    enabled: !!supplierId,
  })
}

// Get drivers associated with a vehicle
export function driversByVehicleQueryOptions(vehicleId: string | null) {
  return queryOptions({
    queryKey: driverKeys.byVehicle(vehicleId ?? ''),
    queryFn: async () => {
      if (!vehicleId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_drivers')
        .select(`
          *,
          driver:drivers(*)
        `)
        .eq('vehicle_id', vehicleId)

      if (error) throw error
      return (data as Array<{ driver: Driver; is_primary: boolean }>).map(vd => ({
        ...vd.driver,
        is_primary: vd.is_primary
      }))
    },
    enabled: !!vehicleId,
  })
}

// Get drivers by owner type (useful for filtering in forms)
export function driversByOwnerTypeQueryOptions(companyId: string | null, ownerType: VehicleOwnerType) {
  return queryOptions({
    queryKey: driverKeys.byOwnerType(companyId, ownerType),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .eq('company_id', companyId)
        .eq('owner_type', ownerType)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as DriverWithRelations[]
    },
    enabled: !!companyId,
  })
}

// Get vehicles associated with a driver
export function vehiclesByDriverQueryOptions(driverId: string | null) {
  return queryOptions({
    queryKey: ['vehicles', 'by-driver', driverId],
    queryFn: async () => {
      if (!driverId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_drivers')
        .select(`
          *,
          vehicle:vehicles(*)
        `)
        .eq('driver_id', driverId)

      if (error) throw error
      return (data as Array<{ vehicle: Vehicle; is_primary: boolean }>).map(vd => ({
        ...vd.vehicle,
        is_primary: vd.is_primary
      }))
    },
    enabled: !!driverId,
  })
}
