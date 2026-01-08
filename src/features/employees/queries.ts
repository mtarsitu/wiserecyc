import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Employee } from '@/types/database'

export const employeesKeys = {
  all: ['employees'] as const,
  list: (companyId: string | null) => [...employeesKeys.all, 'list', companyId] as const,
  active: (companyId: string | null) => [...employeesKeys.all, 'active', companyId] as const,
  detail: (id: string) => [...employeesKeys.all, 'detail', id] as const,
}

export const employeesQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: employeesKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .order('full_name')

      if (error) throw error
      return data as Employee[]
    },
    enabled: !!companyId,
  })

export const activeEmployeesQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: employeesKeys.active(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('full_name')

      if (error) throw error
      return data as Employee[]
    },
    enabled: !!companyId,
  })

export const employeeQueryOptions = (id: string | undefined) =>
  queryOptions({
    queryKey: employeesKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', id!)
        .single()

      if (error) throw error
      return data as Employee
    },
    enabled: !!id,
  })
