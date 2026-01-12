import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { driverKeys } from './queries'
import { vehicleKeys } from '@/features/vehicles/queries'
import type { Driver, InsertTables, UpdateTables } from '@/types/database'

// Create driver
export function useCreateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InsertTables<'drivers'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .insert(input)
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .single()

      if (error) throw error
      return data as Driver
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: driverKeys.ownFleet(variables.company_id) })
      if (variables.transporter_id) {
        queryClient.invalidateQueries({ queryKey: driverKeys.byTransporter(variables.transporter_id) })
      }
      if (variables.supplier_id) {
        queryClient.invalidateQueries({ queryKey: driverKeys.bySupplier(variables.supplier_id) })
      }
    },
  })
}

// Update driver
export function useUpdateDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...updates
    }: UpdateTables<'drivers'> & { id: string; company_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('drivers')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .single()

      if (error) throw error
      return data as Driver
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: driverKeys.ownFleet(variables.company_id) })
      if (variables.transporter_id) {
        queryClient.invalidateQueries({ queryKey: driverKeys.byTransporter(variables.transporter_id) })
      }
      if (variables.supplier_id) {
        queryClient.invalidateQueries({ queryKey: driverKeys.bySupplier(variables.supplier_id) })
      }
    },
  })
}

// Delete driver (soft delete)
export function useDeleteDriver() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, company_id: _company_id }: { id: string; company_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('drivers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: driverKeys.ownFleet(variables.company_id) })
    },
  })
}

// Assign driver to vehicle
export function useAssignDriverToVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      vehicle_id,
      driver_id,
      is_primary = false,
    }: {
      vehicle_id: string
      driver_id: string
      is_primary?: boolean
    }) => {
      // If setting as primary, first unset any existing primary
      if (is_primary) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('vehicle_drivers')
          .update({ is_primary: false })
          .eq('vehicle_id', vehicle_id)
          .eq('is_primary', true)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicle_drivers')
        .upsert(
          { vehicle_id, driver_id, is_primary },
          { onConflict: 'vehicle_id,driver_id' }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.byVehicle(variables.vehicle_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
    },
  })
}

// Remove driver from vehicle
export function useRemoveDriverFromVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      vehicle_id,
      driver_id,
    }: {
      vehicle_id: string
      driver_id: string
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicle_drivers')
        .delete()
        .eq('vehicle_id', vehicle_id)
        .eq('driver_id', driver_id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: driverKeys.byVehicle(variables.vehicle_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.all })
    },
  })
}
