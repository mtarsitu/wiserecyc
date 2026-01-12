import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Sale, SaleItem, Client, Transporter, Material, Vehicle, Driver } from '@/types/database'

export type SaleWithDetails = Sale & {
  client: Client | null
  transporter: Transporter | null
  vehicle: Vehicle | null
  driver: Driver | null
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

      // Fetch vehicle and driver separately since FK constraints may not exist yet
      const salesWithRelations = await Promise.all(
        (data as SaleWithDetails[]).map(async (sale) => {
          let vehicle = null
          let driver = null

          if (sale.vehicle_id) {
            const { data: v } = await supabase
              .from('vehicles')
              .select('*')
              .eq('id', sale.vehicle_id)
              .single()
            vehicle = v
          }

          if (sale.driver_id) {
            const { data: d } = await supabase
              .from('drivers')
              .select('*')
              .eq('id', sale.driver_id)
              .single()
            driver = d
          }

          return { ...sale, vehicle, driver }
        })
      )

      return salesWithRelations as SaleWithDetails[]
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

      // Fetch vehicle and driver separately since FK constraints may not exist yet
      let vehicle = null
      let driver = null

      if (data.vehicle_id) {
        const { data: v } = await supabase
          .from('vehicles')
          .select('*')
          .eq('id', data.vehicle_id)
          .single()
        vehicle = v
      }

      if (data.driver_id) {
        const { data: d } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', data.driver_id)
          .single()
        driver = d
      }

      return { ...data, vehicle, driver } as SaleWithDetails
    },
    enabled: !!id,
  })
