import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Material, Contract, DismantlingOutput } from '@/types/database'

export interface DismantlingWithDetails {
  id: string
  company_id: string
  date: string
  location_type: 'curte' | 'contract'
  contract_id: string | null
  source_material_id: string
  source_quantity: number
  notes: string | null
  created_by: string | null
  created_at: string
  source_material: Material
  contract: Contract | null
  outputs: (DismantlingOutput & { material: Material })[]
}

export const dismantlingsKeys = {
  all: ['dismantlings'] as const,
  list: (companyId: string | null) => [...dismantlingsKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...dismantlingsKeys.all, 'detail', id] as const,
}

export function dismantlingsQueryOptions(companyId: string | null | undefined) {
  return queryOptions({
    queryKey: dismantlingsKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('dismantlings')
        .select(`
          *,
          source_material:materials!dismantlings_source_material_id_fkey(*),
          contract:contracts(*),
          outputs:dismantling_outputs(
            *,
            material:materials(*)
          )
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as DismantlingWithDetails[]
    },
    enabled: !!companyId,
  })
}
