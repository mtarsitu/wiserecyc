import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Material, Contract, LocationType } from '@/types/database'

export interface InventoryWithMaterial {
  id: string
  company_id: string
  material_id: string
  location_type: LocationType
  contract_id: string | null
  quantity: number
  updated_at: string
  material: Material
  contract: Contract | null
}

export const inventoryKeys = {
  all: ['inventory'] as const,
  list: (companyId: string | null) => [...inventoryKeys.all, 'list', companyId] as const,
  available: (companyId: string | null) => [...inventoryKeys.all, 'available', companyId] as const,
}

export function inventoryQueryOptions(companyId: string | null | undefined) {
  return queryOptions({
    queryKey: inventoryKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('inventory')
        .select(`
          *,
          material:materials(*),
          contract:contracts(*)
        `)
        .eq('company_id', companyId)
        .gt('quantity', 0)
        .order('updated_at', { ascending: false })

      if (error) throw error
      return data as InventoryWithMaterial[]
    },
    enabled: !!companyId,
  })
}

// Query pentru stocuri disponibile pentru dezmembrare (quantity > 0)
export function availableInventoryQueryOptions(companyId: string | null | undefined) {
  return queryOptions({
    queryKey: inventoryKeys.available(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('inventory')
        .select(`
          *,
          material:materials(*),
          contract:contracts(*)
        `)
        .eq('company_id', companyId)
        .gt('quantity', 0)
        .order('material_id', { ascending: true })

      if (error) throw error
      return data as InventoryWithMaterial[]
    },
    enabled: !!companyId,
  })
}
