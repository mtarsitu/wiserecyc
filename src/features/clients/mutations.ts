import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { clientsKeys } from './queries'
import type { Client, InsertTables, UpdateTables } from '@/types/database'

export function useCreateClient() {
  const queryClient = useQueryClient()
  const { companyId } = useAuthContext()

  return useMutation({
    mutationFn: async (client: Omit<InsertTables<'clients'>, 'company_id'>) => {
      if (!companyId) throw new Error('No company selected')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('clients') as any)
        .insert({ ...client, company_id: companyId })
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.all })
    },
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'clients'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('clients') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Client
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.all })
      queryClient.invalidateQueries({ queryKey: clientsKeys.detail(data.id) })
    },
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: clientsKeys.all })
    },
  })
}
