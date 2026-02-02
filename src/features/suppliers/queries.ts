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

// Types for supplier balance
export interface SupplierBalance {
  supplier_id: string
  supplier_name: string
  total_purchased: number  // Total achizitionat
  total_paid: number       // Total achitat
  remaining: number        // Rămas de plată
}

// Get balance for all suppliers (total purchased vs total paid)
export const supplierBalancesQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: [...suppliersKeys.list(companyId ?? null), 'balances'] as const,
    queryFn: async (): Promise<SupplierBalance[]> => {
      if (!companyId) return []

      // Get all suppliers
      const { data: suppliers, error: suppliersError } = await supabase
        .from('suppliers')
        .select('id, name')
        .eq('company_id', companyId)
        .order('name')

      if (suppliersError) throw suppliersError
      if (!suppliers || suppliers.length === 0) return []

      // Get all acquisitions grouped by supplier
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: acquisitions, error: acqError } = await (supabase as any)
        .from('acquisitions')
        .select('supplier_id, total_amount, receipt_number')
        .eq('company_id', companyId)
        .not('supplier_id', 'is', null) as { data: { supplier_id: string; total_amount: number; receipt_number: string | null }[] | null; error: Error | null }

      if (acqError) throw acqError

      // Get all payment expenses (type='payment' with notes starting with 'Bon:')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: payments, error: payError } = await (supabase as any)
        .from('expenses')
        .select('amount, notes')
        .eq('company_id', companyId)
        .eq('type', 'payment')
        .ilike('notes', 'Bon:%') as { data: { amount: number; notes: string | null }[] | null; error: Error | null }

      if (payError) throw payError

      // Build a map of receipt_number -> amounts paid
      const paymentsByReceipt = new Map<string, number>()
      for (const payment of payments || []) {
        if (payment.notes) {
          // Extract receipt number from notes like "Bon: 123"
          const match = payment.notes.match(/^Bon:\s*(.+)$/i)
          if (match) {
            const receiptRef = match[1].trim()
            const current = paymentsByReceipt.get(receiptRef) || 0
            paymentsByReceipt.set(receiptRef, current + payment.amount)
          }
        }
      }

      // Calculate balance per supplier
      const balances: SupplierBalance[] = (suppliers as { id: string; name: string }[]).map(supplier => {
        // Total purchased from this supplier
        const supplierAcquisitions = (acquisitions || []).filter(a => a.supplier_id === supplier.id)
        const totalPurchased = supplierAcquisitions.reduce((sum, a) => sum + (a.total_amount || 0), 0)

        // Total paid for this supplier's acquisitions
        let totalPaid = 0
        for (const acq of supplierAcquisitions) {
          const receiptRef = acq.receipt_number || acq.supplier_id // fallback to supplier_id if no receipt
          const paid = paymentsByReceipt.get(receiptRef) || 0
          totalPaid += paid
        }

        return {
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          total_purchased: totalPurchased,
          total_paid: totalPaid,
          remaining: totalPurchased - totalPaid,
        }
      })

      // Return only suppliers with activity (purchased > 0 or remaining != 0)
      return balances.filter(b => b.total_purchased > 0 || b.remaining !== 0)
    },
    enabled: !!companyId,
  })
