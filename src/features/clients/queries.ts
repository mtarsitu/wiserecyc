import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Client } from '@/types/database'

export const clientsKeys = {
  all: ['clients'] as const,
  list: (companyId: string | null) => [...clientsKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...clientsKeys.all, 'detail', id] as const,
}

export const clientsQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: clientsKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return data as Client[]
    },
    enabled: !!companyId,
  })
