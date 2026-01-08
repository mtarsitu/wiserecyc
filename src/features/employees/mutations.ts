import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthContext } from '@/contexts/AuthContext'
import { employeesKeys } from './queries'
import type { Employee, InsertTables, UpdateTables } from '@/types/database'

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  const { companyId } = useAuthContext()

  return useMutation({
    mutationFn: async (employee: Omit<InsertTables<'employees'>, 'company_id'>) => {
      if (!companyId) throw new Error('No company selected')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('employees') as any)
        .insert({ ...employee, company_id: companyId })
        .select()
        .single()
      if (error) throw error
      return data as Employee
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.all })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'employees'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('employees') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Employee
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.all })
      queryClient.invalidateQueries({ queryKey: employeesKeys.detail(data.id) })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeesKeys.all })
    },
  })
}
