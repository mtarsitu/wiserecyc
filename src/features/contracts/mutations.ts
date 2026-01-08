import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { contractsKeys } from './queries'
import type { Contract, InsertTables, UpdateTables } from '@/types/database'

export function useCreateContract() {
  const queryClient = useQueryClient()
  const { companyId } = useAuthContext()

  return useMutation({
    mutationFn: async (contract: Omit<InsertTables<'contracts'>, 'company_id'>) => {
      if (!companyId) throw new Error('No company selected')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contracts')
        .insert({ ...contract, company_id: companyId })
        .select()
        .single()
      if (error) throw error
      return data as Contract
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsKeys.all })
    },
  })
}

export function useUpdateContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'contracts'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contracts')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Contract
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: contractsKeys.all })
      queryClient.invalidateQueries({ queryKey: contractsKeys.detail(data.id) })
    },
  })
}

export function useDeleteContract() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('contracts')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: contractsKeys.all })
    },
  })
}
