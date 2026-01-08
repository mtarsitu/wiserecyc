import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { dismantlingsKeys } from './queries'
import { inventoryKeys } from '../inventory/queries'

interface DismantlingOutputInput {
  material_id: string
  quantity: number
  notes?: string | null
}

interface CreateDismantlingInput {
  company_id: string
  date: string
  location_type: 'curte' | 'contract'
  contract_id?: string | null
  source_material_id: string
  source_quantity: number
  notes?: string | null
  created_by?: string
  outputs: DismantlingOutputInput[]
}

export function useCreateDismantling() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateDismantlingInput) => {
      const { outputs, ...dismantlingData } = input

      // Create dismantling
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: dismantling, error: dismantlingError } = await (supabase as any)
        .from('dismantlings')
        .insert(dismantlingData)
        .select()
        .single()

      if (dismantlingError) throw dismantlingError

      // Create outputs
      if (outputs.length > 0) {
        const outputsWithId = outputs.map((output) => ({
          ...output,
          dismantling_id: dismantling.id,
        }))

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: outputsError } = await (supabase as any)
          .from('dismantling_outputs')
          .insert(outputsWithId)

        if (outputsError) {
          // Rollback: delete the dismantling if outputs failed
          await supabase.from('dismantlings').delete().eq('id', dismantling.id)
          throw outputsError
        }
      }

      // Update inventory - decrease source material
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let inventoryQuery = (supabase as any)
        .from('inventory')
        .select('*')
        .eq('company_id', input.company_id)
        .eq('material_id', input.source_material_id)
        .eq('location_type', input.location_type)

      if (input.contract_id) {
        inventoryQuery = inventoryQuery.eq('contract_id', input.contract_id)
      } else {
        inventoryQuery = inventoryQuery.is('contract_id', null)
      }

      const { data: existingInventory } = await inventoryQuery.maybeSingle()

      if (existingInventory) {
        const newQuantity = existingInventory.quantity - input.source_quantity
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from('inventory')
          .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
          .eq('id', existingInventory.id)
      }

      // Update inventory - increase output materials
      for (const output of outputs) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let outputQuery = (supabase as any)
          .from('inventory')
          .select('*')
          .eq('company_id', input.company_id)
          .eq('material_id', output.material_id)
          .eq('location_type', input.location_type)

        if (input.contract_id) {
          outputQuery = outputQuery.eq('contract_id', input.contract_id)
        } else {
          outputQuery = outputQuery.is('contract_id', null)
        }

        const { data: existingOutput } = await outputQuery.maybeSingle()

        if (existingOutput) {
          const newQuantity = existingOutput.quantity + output.quantity
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('inventory')
            .update({ quantity: newQuantity, updated_at: new Date().toISOString() })
            .eq('id', existingOutput.id)
        } else {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('inventory')
            .insert({
              company_id: input.company_id,
              material_id: output.material_id,
              location_type: input.location_type,
              contract_id: input.contract_id || null,
              quantity: output.quantity,
            })
        }
      }

      return dismantling
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: dismantlingsKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(variables.company_id) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.available(variables.company_id) })
    },
  })
}

export function useDeleteDismantling() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      // Note: This doesn't reverse inventory changes - would need more complex logic
      // Delete outputs first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('dismantling_outputs')
        .delete()
        .eq('dismantling_id', id)

      // Delete dismantling
      const { error } = await supabase
        .from('dismantlings')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, companyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: dismantlingsKeys.list(data.companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.list(data.companyId) })
      queryClient.invalidateQueries({ queryKey: inventoryKeys.available(data.companyId) })
    },
  })
}
