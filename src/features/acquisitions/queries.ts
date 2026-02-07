import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Acquisition, AcquisitionItem, Supplier, Material, Vehicle, Driver } from '@/types/database'

export type AcquisitionWithDetails = Acquisition & {
  supplier: Supplier | null
  vehicle: Vehicle | null
  driver: Driver | null
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
          vehicle:vehicles(*),
          driver:drivers(*),
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
          vehicle:vehicles(*),
          driver:drivers(*),
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

// Query pentru plățile legate de o achiziție (prin referința din notes sau name)
export interface LinkedPayment {
  id: string
  date: string
  amount: number
  payment_method: string | null
  notes: string | null
  name: string
}

export async function getLinkedPayments(receiptNumber: string, companyId: string): Promise<LinkedPayment[]> {
  if (!receiptNumber) return []

  // Căutăm în mai multe variante pentru a fi flexibili:
  // - "Bon: wssa", "BON wssa", "bon wssa" în notes sau name
  // - Sau doar "wssa" exact în name (pentru cheltuieli denumite cu nr. bon)
  // - Sau "wssa" în notes (pentru cheltuieli cu observații conținând nr. bon)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('expenses')
    .select('id, date, amount, payment_method, notes, name')
    .eq('company_id', companyId)
    .eq('type', 'payment')
    .or(`notes.ilike.%bon: ${receiptNumber}%,notes.ilike.%bon ${receiptNumber}%,name.ilike.%bon ${receiptNumber}%,name.ilike.%bon: ${receiptNumber}%,notes.ilike.%${receiptNumber}%,name.eq.${receiptNumber}`)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching linked payments:', error)
    return []
  }

  return data || []
}
