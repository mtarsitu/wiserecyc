import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Transporter } from '@/types/database'

export const transporterKeys = {
  all: ['transporters'] as const,
  lists: () => [...transporterKeys.all, 'list'] as const,
  list: (companyId: string | null) => [...transporterKeys.lists(), companyId] as const,
  active: (companyId: string | null) => [...transporterKeys.all, 'active', companyId] as const,
}

// Get all transporters for a company
export function transportersQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: transporterKeys.list(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('transporters')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Transporter[]
    },
    enabled: !!companyId,
  })
}

// Get only active transporters
export function activeTransportersQueryOptions(companyId: string | null) {
  return queryOptions({
    queryKey: transporterKeys.active(companyId),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('transporters')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as Transporter[]
    },
    enabled: !!companyId,
  })
}
