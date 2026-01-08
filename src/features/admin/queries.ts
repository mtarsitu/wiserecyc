import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Company, Profile } from '@/types/database'

// Keys
export const adminKeys = {
  companies: ['admin', 'companies'] as const,
  users: ['admin', 'users'] as const,
  companyUsers: (companyId: string) => ['admin', 'users', companyId] as const,
}

// Companies
export const companiesQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.companies,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Company[]
    },
  })

// All Users (for super admin)
export const allUsersQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.users,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, company:companies(id, name)')
        .order('full_name')
      if (error) throw error
      return data as (Profile & { company: { id: string; name: string } | null })[]
    },
  })

// Users by Company
export const companyUsersQueryOptions = (companyId: string | null) =>
  queryOptions({
    queryKey: adminKeys.companyUsers(companyId!),
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('profiles')
        .select('*, company:companies(id, name)')
        .eq('company_id', companyId)
        .order('full_name')
      if (error) throw error
      return data as (Profile & { company: { id: string; name: string } | null })[]
    },
    enabled: !!companyId,
  })
