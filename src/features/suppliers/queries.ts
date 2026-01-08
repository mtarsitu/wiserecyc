import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Supplier } from '@/types/database'

export const suppliersKeys = {
  all: ['suppliers'] as const,
  list: (companyId: string | null) => [...suppliersKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...suppliersKeys.all, 'detail', id] as const,
}

export const suppliersQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: suppliersKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('company_id', companyId)
        .order('name')
      if (error) throw error
      return data as Supplier[]
    },
    enabled: !!companyId,
  })

export const supplierQueryOptions = (id: string | undefined) =>
  queryOptions({
    queryKey: suppliersKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as Supplier
    },
    enabled: !!id,
  })
