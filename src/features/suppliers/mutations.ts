import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { suppliersKeys } from './queries'
import type { Supplier, InsertTables, UpdateTables } from '@/types/database'

export function useCreateSupplier() {
  const queryClient = useQueryClient()
  const { companyId } = useAuthContext()

  return useMutation({
    mutationFn: async (supplier: Omit<InsertTables<'suppliers'>, 'company_id'>) => {
      if (!companyId) throw new Error('No company selected')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('suppliers') as any)
        .insert({ ...supplier, company_id: companyId })
        .select()
        .single()
      if (error) throw error
      return data as Supplier
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'suppliers'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('suppliers') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Supplier
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
      queryClient.invalidateQueries({ queryKey: suppliersKeys.detail(data.id) })
    },
  })
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('suppliers').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: suppliersKeys.all })
    },
  })
}
