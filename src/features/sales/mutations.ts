import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { salesKeys } from './queries'
import { inventoryKeys } from '../inventory/queries'
import type { PaymentMethod, TransportType, SaleStatus } from '@/types/database'

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
  transport_type?: TransportType | null
  transport_price?: number
  transporter_id?: string | null
  scale_number?: string
  notes?: string
  status?: SaleStatus
  total_amount: number
  created_by?: string
  items: SaleItemInput[]
}

export function useCreateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSaleInput) => {
      const { items, ...saleData } = input

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
          ...item,
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

      return sale
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.available(variables.company_id) })
    },
  })
}

export function useUpdateSale() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, ...updates }: { id: string } & Partial<CreateSaleInput>) => {
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
            ...item,
            sale_id: id,
          }))

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: itemsError } = await (supabase as any)
            .from('sale_items')
            .insert(itemsWithSaleId)

          if (itemsError) throw itemsError
        }
      }

      return sale
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: salesKeys.list(data.company_id) })
      queryClient.invalidateQueries({ queryKey: salesKeys.detail(data.id) })
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
