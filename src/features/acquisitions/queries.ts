import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Acquisition, AcquisitionItem, Supplier, Material } from '@/types/database'

export type AcquisitionWithDetails = Acquisition & {
  supplier: Supplier | null
  items: (AcquisitionItem & { material: Material })[]
}

export const acquisitionsKeys = {
  all: ['acquisitions'] as const,
  list: (companyId: string | null) => [...acquisitionsKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...acquisitionsKeys.all, 'detail', id] as const,
}

export const acquisitionsQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: acquisitionsKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('acquisitions')
        .select(`
          *,
          supplier:suppliers(*),
          items:acquisition_items(
            *,
            material:materials(*)
          )
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as AcquisitionWithDetails[]
    },
    enabled: !!companyId,
  })

export const acquisitionDetailQueryOptions = (id: string | null | undefined) =>
  queryOptions({
    queryKey: acquisitionsKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('acquisitions')
        .select(`
          *,
          supplier:suppliers(*),
          items:acquisition_items(
            *,
            material:materials(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as AcquisitionWithDetails
    },
    enabled: !!id,
  })
