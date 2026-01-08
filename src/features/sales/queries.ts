import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sale, SaleItem, Client, Transporter, Material } from '@/types/database'

export type SaleWithDetails = Sale & {
  client: Client | null
  transporter: Transporter | null
  items: (SaleItem & { material: Material })[]
}

export const salesKeys = {
  all: ['sales'] as const,
  list: (companyId: string | null) => [...salesKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...salesKeys.all, 'detail', id] as const,
}

export const salesQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: salesKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sales')
        .select(`
          *,
          client:clients(*),
          transporter:transporters(*),
          items:sale_items(
            *,
            material:materials(*)
          )
        `)
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as SaleWithDetails[]
    },
    enabled: !!companyId,
  })

export const saleDetailQueryOptions = (id: string | null | undefined) =>
  queryOptions({
    queryKey: salesKeys.detail(id ?? ''),
    queryFn: async () => {
      if (!id) return null

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('sales')
        .select(`
          *,
          client:clients(*),
          transporter:transporters(*),
          items:sale_items(
            *,
            material:materials(*)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as SaleWithDetails
    },
    enabled: !!id,
  })
