import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { vehicleKeys } from './queries'
import type { Vehicle, InsertTables, UpdateTables } from '@/types/database'

// Create vehicle
export function useCreateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InsertTables<'vehicles'>) => {
      // Normalize vehicle number
      const normalizedInput = {
        ...input,
        vehicle_number: input.vehicle_number.trim().toUpperCase(),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .insert(normalizedInput)
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .single()

      if (error) throw error
      return data as Vehicle
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.ownFleet(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.external(variables.company_id) })
      if (variables.transporter_id) {
        queryClient.invalidateQueries({ queryKey: vehicleKeys.byTransporter(variables.transporter_id) })
      }
      if (variables.supplier_id) {
        queryClient.invalidateQueries({ queryKey: vehicleKeys.bySupplier(variables.supplier_id) })
      }
    },
  })
}

// Update vehicle
export function useUpdateVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...updates
    }: UpdateTables<'vehicles'> & { id: string; company_id: string }) => {
      // Normalize vehicle number if provided
      const normalizedUpdates = {
        ...updates,
        ...(updates.vehicle_number && {
          vehicle_number: updates.vehicle_number.trim().toUpperCase(),
        }),
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('vehicles')
        .update(normalizedUpdates)
        .eq('id', id)
        .select(`
          *,
          transporter:transporters(*),
          supplier:suppliers(*)
        `)
        .single()

      if (error) throw error
      return data as Vehicle
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.ownFleet(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.external(variables.company_id) })
      if (variables.transporter_id) {
        queryClient.invalidateQueries({ queryKey: vehicleKeys.byTransporter(variables.transporter_id) })
      }
      if (variables.supplier_id) {
        queryClient.invalidateQueries({ queryKey: vehicleKeys.bySupplier(variables.supplier_id) })
      }
    },
  })
}

// Delete vehicle (soft delete)
export function useDeleteVehicle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, company_id: _company_id }: { id: string; company_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('vehicles')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: vehicleKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.ownFleet(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: vehicleKeys.external(variables.company_id) })
    },
  })
}
