import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { transporterKeys } from './queries'
import type { Transporter, InsertTables, UpdateTables } from '@/types/database'

// Create transporter
export function useCreateTransporter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: InsertTables<'transporters'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('transporters')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data as Transporter
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transporterKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: transporterKeys.active(variables.company_id) })
    },
  })
}

// Update transporter
export function useUpdateTransporter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...updates
    }: UpdateTables<'transporters'> & { id: string; company_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('transporters')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as Transporter
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transporterKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: transporterKeys.active(variables.company_id) })
    },
  })
}

// Delete transporter (soft delete)
export function useDeleteTransporter() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, company_id: _company_id }: { id: string; company_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('transporters')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transporterKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: transporterKeys.active(variables.company_id) })
    },
  })
}
