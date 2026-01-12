import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Vehicle, Transporter, Supplier } from '@/types/database'

export interface VehicleWithRelations extends Vehicle {
  transporter: Transporter | null
  supplier: Supplier | null
}

export const vehicleKeys = {
  all: ['vehicles'] as const,
  lists: () => [...vehicleKeys.all, 'list'] as const,
  list: (companyId: string | null) => [...vehicleKeys.lists(), companyId] as const,
  ownFleet: (companyId: string | null) => [...vehicleKeys.all, 'own-fleet', companyId] as const,
  external: (companyId: string | null) => [...vehicleKeys.all, 'external', companyId] as const,
  byTransporter: (transporterId: string) => [...vehicleKeys.all, 'transporter', transporterId] as const,
  bySupplier: (supplierId: string) => [...vehicleKeys.all, 'supplier', supplierId] as const,
  byNumber: (companyId: string | null, vehicleNumber: string) => [...vehicleKeys.all, 'number', companyId, vehicleNumber] as const,
}

// Get all vehicles for a company
export function vehiclesQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: vehicleKeys.list(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('owner_type', { ascending: true })
        .order('vehicle_number', { ascending: true })

      if (error) throw error
      return data as VehicleWithRelations[]
    },
    enabled: !!companyId,
  })
}

// Get only own fleet vehicles
export function ownFleetVehiclesQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: vehicleKeys.ownFleet(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .eq('company_id', companyId)
        .eq('owner_type', 'own_fleet')
        .eq('is_active', true)
        .order('vehicle_number', { ascending: true })

      if (error) throw error
      return data as Vehicle[]
    },
    enabled: !!companyId,
  })
}

// Get external transporter and supplier vehicles
export function externalVehiclesQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: vehicleKeys.external(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .eq('company_id', companyId)
        .neq('owner_type', 'own_fleet')
        .eq('is_active', true)
        .order('vehicle_number', { ascending: true })

      if (error) throw error
      return data as VehicleWithRelations[]
    },
    enabled: !!companyId,
  })
}

// Get vehicles by transporter
export function vehiclesByTransporterQueryOptions(transporterId: string) {
  return queryOptions({
    queryKey: vehicleKeys.byTransporter(transporterId),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .eq('transporter_id', transporterId)
        .eq('is_active', true)
        .order('vehicle_number', { ascending: true })

      if (error) throw error
      return data as Vehicle[]
    },
    enabled: !!transporterId,
  })
}

// Get vehicles by supplier
export function vehiclesBySupplierQueryOptions(supplierId: string) {
  return queryOptions({
    queryKey: vehicleKeys.bySupplier(supplierId),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .select('*')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .order('vehicle_number', { ascending: true })

      if (error) throw error
      return data as Vehicle[]
    },
    enabled: !!supplierId,
  })
}

// Find vehicle by number (for auto-detection)
export async function findVehicleByNumber(companyId: string, vehicleNumber: string): Promise<VehicleWithRelations | null> {
  if (!companyId || !vehicleNumber) return null

  const normalizedNumber = vehicleNumber.trim().toUpperCase()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('vehicles')
    .select(`
      *,
      transporter:transporters(*),
      supplier:suppliers(*)
    `)
    .eq('company_id', companyId)
    .ilike('vehicle_number', `%${normalizedNumber}%`)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !data) return null
  return data as VehicleWithRelations
}
