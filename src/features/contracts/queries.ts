import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Contract, Supplier } from '@/types/database'

export interface ContractWithSupplier extends Contract {
  supplier: Supplier | null
}

export const contractsKeys = {
  all: ['contracts'] as const,
  list: (companyId: string | null) => [...contractsKeys.all, 'list', companyId] as const,
  active: (companyId: string | null) => [...contractsKeys.all, 'active', companyId] as const,
  detail: (id: string) => [...contractsKeys.all, 'detail', id] as const,
}

export const contractsQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: contractsKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contracts')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as ContractWithSupplier[]
    },
    enabled: !!companyId,
  })

// Query pentru contracte active (pentru dropdown-uri)
export const activeContractsQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: contractsKeys.active(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contracts')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('company_id', companyId)
        .eq('status', 'active')
        .order('contract_number')
      if (error) throw error
      return data as ContractWithSupplier[]
    },
    enabled: !!companyId,
  })

export const contractQueryOptions = (id: string | undefined) =>
  queryOptions({
    queryKey: contractsKeys.detail(id!),
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('contracts')
        .select(`
          *,
          supplier:suppliers(*)
        `)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as ContractWithSupplier
    },
    enabled: !!id,
  })
