import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { acquisitionsKeys } from './queries'
import { inventoryKeys } from '../inventory/queries'
import type { LocationType, AcquisitionType } from '@/types/database'

interface AcquisitionItemInput {
  material_id: string
  quantity: number
  impurities_percent: number
  final_quantity: number
  price_per_kg: number
  line_total: number
  acquisition_type?: AcquisitionType
}

interface CreateAcquisitionInput {
  company_id: string
  date: string
  supplier_id: string | null
  receipt_number?: string
  payment_status: 'paid' | 'unpaid' | 'partial'
  location_type?: LocationType
  contract_id?: string | null
  environment_fund: number
  total_amount: number
  info?: string
  notes?: string
  created_by?: string
  items: AcquisitionItemInput[]
}

export function useCreateAcquisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAcquisitionInput) => {
      const { items, ...acquisitionData } = input

      // Create acquisition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: acquisition, error: acquisitionError } = await (supabase as any)
        .from('acquisitions')
        .insert(acquisitionData)
        .select()
        .single()

      if (acquisitionError) throw acquisitionError

      // Create acquisition items
      if (items.length > 0) {
        const itemsWithAcquisitionId = items.map((item) => {
          // Only include acquisition_type if it's set and not 'normal' (to avoid errors if column doesn't exist)
          const { acquisition_type, ...rest } = item
          return {
            ...rest,
            acquisition_id: acquisition.id,
            // Only include acquisition_type if it has a value
            ...(acquisition_type ? { acquisition_type } : {}),
          }
        })

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: itemsError } = await (supabase as any)
          .from('acquisition_items')
          .insert(itemsWithAcquisitionId)

        if (itemsError) {
          // Rollback: delete the acquisition if items failed
          await supabase.from('acquisitions').delete().eq('id', acquisition.id)
          throw itemsError
        }

        // Determine location type and contract_id for inventory
        const locationType = input.location_type || 'curte'
        const contractId = locationType === 'contract' ? input.contract_id : null

        // Update inventory - add items to stock
        for (const item of items) {
          // Build query for finding existing inventory
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          let query = (supabase as any)
            .from('inventory')
            .select('*')
            .eq('company_id', input.company_id)
            .eq('material_id', item.material_id)
            .eq('location_type', locationType)

          // Handle contract_id matching
          if (contractId) {
            query = query.eq('contract_id', contractId)
          } else {
            query = query.is('contract_id', null)
          }

          const { data: existingInventory } = await query.maybeSingle()

          if (existingInventory) {
            const newQuantity = existingInventory.quantity + item.final_quantity
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('inventory')
              .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
              .eq('id', existingInventory.id)
          } else {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('inventory')
              .insert({
                company_id: input.company_id,
                material_id: item.material_id,
                location_type: locationType,
                contract_id: contractId,
                quantity: item.final_quantity,
              })
          }
        }
      }

      return acquisition
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: acquisitionsKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.available(variables.company_id) })
    },
  })
}

export function useUpdateAcquisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, ...updates }: { id: string } & Partial<CreateAcquisitionInput>) => {
      // Update acquisition
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: acquisition, error: acquisitionError } = await (supabase as any)
        .from('acquisitions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (acquisitionError) throw acquisitionError

      // If items provided, replace all items
      if (items) {
        // Delete existing items
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('acquisition_items')
          .delete()
          .eq('acquisition_id', id)

        // Insert new items
        if (items.length > 0) {
          const itemsWithAcquisitionId = items.map((item) => ({
            ...item,
            acquisition_id: id,
          }))

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: itemsError } = await (supabase as any)
            .from('acquisition_items')
            .insert(itemsWithAcquisitionId)

          if (itemsError) throw itemsError
        }
      }

      return acquisition
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: acquisitionsKeys.list(data.company_id) })
      queryClient.invalidateQueries({ queryKey: acquisitionsKeys.detail(data.id) })
    },
  })
}

export function useDeleteAcquisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      // Delete items first (cascade should handle this, but being explicit)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('acquisition_items')
        .delete()
        .eq('acquisition_id', id)

      // Delete acquisition
      const { error } = await supabase
        .from('acquisitions')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, companyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: acquisitionsKeys.list(data.companyId) })
    },
  })
}
