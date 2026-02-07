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

// Types for client balance
export interface ClientBalance {
  client_id: string
  client_name: string
  total_kg: number         // Total kg vândut
  total_sold: number       // Total vândut (RON)
  total_collected: number  // Total încasat
  remaining: number        // Rămas de încasat
}

// Get balance for all clients (total sold vs total collected)
export const clientBalancesQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: [...clientsKeys.list(companyId ?? null), 'balances'] as const,
    queryFn: async (): Promise<ClientBalance[]> => {
      if (!companyId) return []

      // Get all clients
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')

      if (clientsError) throw clientsError
      if (!clients || clients.length === 0) return []

      // Get all sales with items grouped by client
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sales, error: salesError } = await (supabase as any)
        .from('sales')
        .select('client_id, total_amount, scale_number, items:sale_items(final_quantity)')
        .eq('company_id', companyId)
        .not('client_id', 'is', null) as { data: { client_id: string; total_amount: number; scale_number: string | null; items: { final_quantity: number }[] }[] | null; error: Error | null }

      if (salesError) throw salesError

      // Get all collection expenses (type='collection' with notes starting with 'Cântar:')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: collections, error: collError } = await (supabase as any)
        .from('expenses')
        .select('amount, notes')
        .eq('company_id', companyId)
        .eq('type', 'collection')
        .ilike('notes', 'Cântar:%') as { data: { amount: number; notes: string | null }[] | null; error: Error | null }

      if (collError) throw collError

      // Build a map of scale_number -> amounts collected
      const collectionsByScale = new Map<string, number>()
      for (const coll of collections || []) {
        if (coll.notes) {
          // Extract scale number from notes like "Cântar: 456"
          const match = coll.notes.match(/^Cântar:\s*(.+)$/i)
          if (match) {
            const scaleRef = match[1].trim()
            const current = collectionsByScale.get(scaleRef) || 0
            collectionsByScale.set(scaleRef, current + coll.amount)
          }
        }
      }

      // Calculate balance per client
      const balances: ClientBalance[] = (clients as { id: string; name: string }[]).map(client => {
        // Total sold to this client
        const clientSales = (sales || []).filter(s => s.client_id === client.id)
        const totalSold = clientSales.reduce((sum, s) => sum + (s.total_amount || 0), 0)

        // Total kg sold to this client (sum of final_quantity from all items)
        const totalKg = clientSales.reduce((sum, s) => {
          const itemsKg = (s.items || []).reduce((itemSum, item) => itemSum + (item.final_quantity || 0), 0)
          return sum + itemsKg
        }, 0)

        // Total collected from this client's sales
        let totalCollected = 0
        for (const sale of clientSales) {
          const scaleRef = sale.scale_number || sale.client_id // fallback to client_id if no scale
          const collected = collectionsByScale.get(scaleRef) || 0
          totalCollected += collected
        }

        return {
          client_id: client.id,
          client_name: client.name,
          total_kg: totalKg,
          total_sold: totalSold,
          total_collected: totalCollected,
          remaining: totalSold - totalCollected,
        }
      })

      // Return only clients with activity (sold > 0 or remaining != 0)
      return balances.filter(b => b.total_sold > 0 || b.remaining !== 0)
    },
    enabled: !!companyId,
  })
