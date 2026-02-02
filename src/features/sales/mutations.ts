import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { salesKeys } from './queries'
import { inventoryKeys } from '../inventory/queries'
import { expensesKeys } from '../expenses/queries'
import { cashierKeys } from '../cashier/queries'
import type { PaymentMethod, TransportType, SaleStatus, PaymentStatus } from '@/types/database'

interface SaleItemInput {
  material_id: string
  quantity: number
  impurities_percent: number
  final_quantity: number
  price_per_ton_usd?: number | null
  exchange_rate?: number | null
  price_per_kg_ron: number
  line_total: number
}

interface CreateSaleInput {
  company_id: string
  date: string
  client_id: string | null
  payment_method?: PaymentMethod | null
  payment_status?: PaymentStatus  // Status încasare: unpaid, partial, paid
  partial_amount?: number  // Suma încasată pentru încasări parțiale
  transport_type?: TransportType | null
  transport_price?: number
  transporter_id?: string | null
  vehicle_id?: string | null
  driver_id?: string | null
  scale_number?: string
  notes?: string
  status?: SaleStatus
  total_amount: number
  created_by?: string
  cash_register_id?: string | null  // Casa pentru incasare
  items: SaleItemInput[]
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { items, partial_amount, ...saleData } = input

      // Create sale
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sale, error: saleError } = await (supabase as any)
        .from('sales')
        .insert(saleData)
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      if (items.length > 0) {
        const itemsWithSaleId = items.map((item) => ({
          // Only include DB fields, exclude UI-only weight fields
          material_id: item.material_id,
          quantity: item.quantity,
          impurities_percent: item.impurities_percent,
          final_quantity: item.final_quantity,
          price_per_ton_usd: item.price_per_ton_usd,
          exchange_rate: item.exchange_rate,
          price_per_kg_ron: item.price_per_kg_ron,
          line_total: item.line_total,
          sale_id: sale.id,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: itemsError } = await (supabase as any)
          .from('sale_items')
          .insert(itemsWithSaleId)

        if (itemsError) {
          // Rollback: delete the sale if items failed
          await supabase.from('sales').delete().eq('id', sale.id)
          throw itemsError
        }

        // Update inventory - reduce items from stock (location: 'curte')
        for (const item of items) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingInventory } = await (supabase as any)
            .from('inventory')
            .select('*')
            .eq('company_id', input.company_id)
            .eq('material_id', item.material_id)
            .eq('location_type', 'curte')
            .is('contract_id', null)
            .maybeSingle()

          if (existingInventory) {
            const newQuantity = Math.max(0, existingInventory.quantity - item.final_quantity)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('inventory')
              .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
              .eq('id', existingInventory.id)
          }
          // If no inventory exists, we don't create negative inventory
          // This could happen if stock wasn't properly tracked before
        }
      }

      // Auto-create expense (collection) and cash transaction when payment_status is 'paid' or 'partial'
      if (input.payment_status && input.payment_status !== 'unpaid') {
        const collectionAmount = input.payment_status === 'paid'
          ? input.total_amount
          : (partial_amount || 0)

        if (collectionAmount > 0) {
          const scaleRef = input.scale_number || sale.id

          // Get payment method from cash register type if cash register is selected
          let paymentMethod: 'cash' | 'bank' | null = input.payment_method || null
          if (input.cash_register_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: cashRegister } = await (supabase as any)
              .from('cash_registers')
              .select('type')
              .eq('id', input.cash_register_id)
              .single()

            if (cashRegister) {
              paymentMethod = cashRegister.type as 'cash' | 'bank'
            }
          }

          // Create expense (collection)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('expenses')
            .insert({
              company_id: input.company_id,
              date: input.date,
              name: `Încasare vânzare ${input.scale_number || 'fără bon'}`,
              amount: collectionAmount,
              type: 'collection',
              payment_method: paymentMethod,
              notes: `Cântar: ${scaleRef}`,  // Referință pentru legătură
              created_by: input.created_by,
            })

          // Create cash transaction if cash register is selected
          if (input.cash_register_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('cash_transactions')
              .insert({
                company_id: input.company_id,
                cash_register_id: input.cash_register_id,
                date: input.date,
                type: 'income',  // Money coming in
                amount: collectionAmount,
                description: `Încasare vânzare ${input.scale_number || 'fără bon'}`,
                source_type: 'sale',
                source_id: sale.id,
                created_by: input.created_by,
              })
          }
        }
      }

      return sale
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.available(variables.company_id) })
      // Invalidate expenses and cashier if we created a collection
      if (variables.payment_status && variables.payment_status !== 'unpaid') {
        queryClient.invalidateQueries({ queryKey: expensesKeys.list(variables.company_id) })
        queryClient.invalidateQueries({ queryKey: cashierKeys.all })
      }
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, partial_amount, ...updates }: { id: string } & Partial<CreateSaleInput>) => {
      // Get current sale to check payment_status change
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentSale } = await (supabase as any)
        .from('sales')
        .select('payment_status, scale_number, total_amount')
        .eq('id', id)
        .single()

      // Update sale
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sale, error: saleError } = await (supabase as any)
        .from('sales')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (saleError) throw saleError

      // If items provided, replace all items
      if (items) {
        // Delete existing items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('sale_items')
          .delete()
          .eq('sale_id', id)

        // Insert new items
        if (items.length > 0) {
          const itemsWithSaleId = items.map((item) => ({
            // Only include DB fields, exclude UI-only weight fields
            material_id: item.material_id,
            quantity: item.quantity,
            impurities_percent: item.impurities_percent,
            final_quantity: item.final_quantity,
            price_per_ton_usd: item.price_per_ton_usd,
            exchange_rate: item.exchange_rate,
            price_per_kg_ron: item.price_per_kg_ron,
            line_total: item.line_total,
            sale_id: id,
          }))

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: itemsError } = await (supabase as any)
            .from('sale_items')
            .insert(itemsWithSaleId)

          if (itemsError) throw itemsError
        }
      }

      // Auto-create expense (collection) when payment_status changes to 'paid' or 'partial'
      if (updates.payment_status && updates.payment_status !== 'unpaid') {
        const wasUnpaid = currentSale?.payment_status === 'unpaid'
        const isPartialPayment = updates.payment_status === 'partial' && partial_amount && partial_amount > 0

        if (wasUnpaid || isPartialPayment) {
          const collectionAmount = updates.payment_status === 'paid'
            ? (updates.total_amount || currentSale?.total_amount || 0)
            : (partial_amount || 0)

          if (collectionAmount > 0) {
            const scaleRef = updates.scale_number || currentSale?.scale_number || id
            const today = new Date().toISOString().split('T')[0]

            // Get payment method from cash register type if cash register is selected
            let paymentMethod: 'cash' | 'bank' | null = updates.payment_method || null
            const cashRegisterId = updates.cash_register_id
            if (cashRegisterId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: cashRegister } = await (supabase as any)
                .from('cash_registers')
                .select('type')
                .eq('id', cashRegisterId)
                .single()

              if (cashRegister) {
                paymentMethod = cashRegister.type as 'cash' | 'bank'
              }
            }

            // Create expense (collection)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('expenses')
              .insert({
                company_id: sale.company_id,
                date: today,  // Data editării, nu data vânzării
                name: `Încasare vânzare ${scaleRef}`,
                amount: collectionAmount,
                type: 'collection',
                payment_method: paymentMethod,
                notes: `Cântar: ${scaleRef}`,
              })

            // Create cash transaction if cash register is selected
            if (cashRegisterId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from('cash_transactions')
                .insert({
                  company_id: sale.company_id,
                  cash_register_id: cashRegisterId,
                  date: today,
                  type: 'income',
                  amount: collectionAmount,
                  description: `Încasare vânzare ${scaleRef}`,
                  source_type: 'sale',
                  source_id: id,
                })
            }
          }
        }
      }

      return sale
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.list(data.company_id) })
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(data.id) })
      // Invalidate expenses and cashier if we may have created a collection
      if (variables.payment_status && variables.payment_status !== 'unpaid') {
        queryClient.invalidateQueries({ queryKey: expensesKeys.list(data.company_id) })
        queryClient.invalidateQueries({ queryKey: cashierKeys.all })
      }
    },
  })
}

export function useDeleteSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      // First, get the sale items to restore inventory
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: saleItems } = await (supabase as any)
        .from('sale_items')
        .select('material_id, final_quantity')
        .eq('sale_id', id)

      // Restore inventory before deleting
      if (saleItems && saleItems.length > 0) {
        for (const item of saleItems) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: existingInventory } = await (supabase as any)
            .from('inventory')
            .select('*')
            .eq('company_id', companyId)
            .eq('material_id', item.material_id)
            .eq('location_type', 'curte')
            .is('contract_id', null)
            .maybeSingle()

          if (existingInventory) {
            const newQuantity = existingInventory.quantity + item.final_quantity
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('inventory')
              .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
              .eq('id', existingInventory.id)
          } else {
            // Create inventory entry if it doesn't exist
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('inventory')
              .insert({
                company_id: companyId,
                material_id: item.material_id,
                location_type: 'curte',
                contract_id: null,
                quantity: item.final_quantity,
              })
          }
        }
      }

      // Delete items first (cascade should handle this, but being explicit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('sale_items')
        .delete()
        .eq('sale_id', id)

      // Delete sale
      const { error } = await supabase
        .from('sales')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, companyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.list(data.companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(data.companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.available(data.companyId) })
    },
  })
}
