import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { acquisitionsKeys } from './queries'
import { inventoryKeys } from '../inventory/queries'
import { expensesKeys } from '../expenses/queries'
import { cashierKeys } from '../cashier/queries'
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
  partial_amount?: number  // Suma plătită pentru plăți parțiale
  cash_register_id?: string | null  // Casa din care se plătește
  location_type?: LocationType
  contract_id?: string | null
  environment_fund: number
  tax_amount?: number  // Impozit 10% de plătit la stat (pentru persoane fizice)
  is_natural_person?: boolean  // Dacă furnizorul este persoană fizică
  total_amount: number  // Suma plătită furnizorului
  info?: string
  notes?: string
  goes_to_accounting?: boolean  // Se duce la contabilitate
  created_by?: string
  vehicle_id?: string | null
  driver_id?: string | null
  transport_type?: string
  transport_price?: number
  items: AcquisitionItemInput[]
}

export function useCreateAcquisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateAcquisitionInput) => {
      const { items, partial_amount, cash_register_id, ...acquisitionData } = input

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
        const itemsWithAcquisitionId = items.map((item) => ({
          // Only include DB fields, exclude UI-only weight fields
          material_id: item.material_id,
          quantity: item.quantity,
          impurities_percent: item.impurities_percent,
          final_quantity: item.final_quantity,
          price_per_kg: item.price_per_kg,
          line_total: item.line_total,
          acquisition_id: acquisition.id,
          // Only include acquisition_type if it has a value
          ...(item.acquisition_type ? { acquisition_type: item.acquisition_type } : {}),
        }))

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

      // Auto-create expense when payment_status is 'paid' or 'partial'
      if (input.payment_status !== 'unpaid') {
        // Furnizorul primește întotdeauna total_amount (impozitul se plătește separat la stat)
        const paymentAmount = input.payment_status === 'paid'
          ? input.total_amount
          : (partial_amount || 0)

        if (paymentAmount > 0) {
          const receiptRef = input.receipt_number || acquisition.id

          // Determine attribution based on location_type and supplier
          let attributionType: 'contract' | 'punct_lucru' | null = null
          let attributionId: string | null = null

          if (input.location_type === 'contract' && input.contract_id) {
            // Attribution to contract
            attributionType = 'contract'
            attributionId = input.contract_id
          } else if (input.supplier_id) {
            // Check if supplier is punct_lucru
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: supplier } = await (supabase as any)
              .from('suppliers')
              .select('is_punct_lucru')
              .eq('id', input.supplier_id)
              .single()

            if (supplier?.is_punct_lucru) {
              attributionType = 'punct_lucru'
              attributionId = input.supplier_id
            }
          }

          // Get payment method from cash register type
          let paymentMethod: 'cash' | 'bank' | null = null
          if (cash_register_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data: cashRegister } = await (supabase as any)
              .from('cash_registers')
              .select('type')
              .eq('id', cash_register_id)
              .single()

            if (cashRegister) {
              paymentMethod = cashRegister.type as 'cash' | 'bank'
            }
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any)
            .from('expenses')
            .insert({
              company_id: input.company_id,
              date: input.date,
              name: `Plată achiziție ${input.receipt_number || 'fără bon'}`,
              amount: paymentAmount,
              type: 'payment',
              payment_method: paymentMethod,
              attribution_type: attributionType,
              attribution_id: attributionId,
              notes: `Bon: ${receiptRef}`,  // Referință pentru legătură
              created_by: input.created_by,
            })

          // Also create cash transaction if cash register is selected
          if (cash_register_id) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('cash_transactions')
              .insert({
                company_id: input.company_id,
                cash_register_id: cash_register_id,
                date: input.date,
                type: 'expense',  // Money going out
                amount: paymentAmount,
                description: `Plată achiziție ${input.receipt_number || 'fără bon'}`,
                source_type: 'acquisition',
                source_id: acquisition.id,
                created_by: input.created_by,
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
      // Invalidate expenses and cashier if we created a payment
      if (variables.payment_status !== 'unpaid') {
        queryClient.invalidateQueries({ queryKey: expensesKeys.list(variables.company_id) })
        // Invalidate all cashier queries (registers, transactions, daily summary)
        queryClient.invalidateQueries({ queryKey: cashierKeys.all })
      }
    },
  })
}

export function useUpdateAcquisition() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, items, partial_amount, ...updates }: { id: string } & Partial<CreateAcquisitionInput>) => {
      // Get current acquisition to check payment_status change
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: currentAcquisition } = await (supabase as any)
        .from('acquisitions')
        .select('payment_status, receipt_number, total_amount')
        .eq('id', id)
        .single()

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
            // Only include DB fields, exclude UI-only weight fields
            material_id: item.material_id,
            quantity: item.quantity,
            impurities_percent: item.impurities_percent,
            final_quantity: item.final_quantity,
            price_per_kg: item.price_per_kg,
            line_total: item.line_total,
            acquisition_id: id,
            ...(item.acquisition_type ? { acquisition_type: item.acquisition_type } : {}),
          }))

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: itemsError } = await (supabase as any)
            .from('acquisition_items')
            .insert(itemsWithAcquisitionId)

          if (itemsError) throw itemsError
        }
      }

      // Auto-create expense when payment_status changes to 'paid' or 'partial'
      // Only create if status is changing (was unpaid or partial and now paid/partial with new amount)
      if (updates.payment_status && updates.payment_status !== 'unpaid') {
        // Check if this is a new payment (status was unpaid, or status is partial with new amount)
        const wasUnpaid = currentAcquisition?.payment_status === 'unpaid'
        const isPartialPayment = updates.payment_status === 'partial' && partial_amount && partial_amount > 0

        if (wasUnpaid || isPartialPayment) {
          const paymentAmount = updates.payment_status === 'paid'
            ? (updates.total_amount || currentAcquisition?.total_amount || 0)
            : (partial_amount || 0)

          if (paymentAmount > 0) {
            const receiptRef = updates.receipt_number || currentAcquisition?.receipt_number || id
            const today = new Date().toISOString().split('T')[0]

            // Determine attribution based on location_type and supplier
            let attributionType: 'contract' | 'punct_lucru' | null = null
            let attributionId: string | null = null

            if (updates.location_type === 'contract' && updates.contract_id) {
              attributionType = 'contract'
              attributionId = updates.contract_id
            } else if (acquisition.location_type === 'contract' && acquisition.contract_id) {
              attributionType = 'contract'
              attributionId = acquisition.contract_id
            } else {
              // Check if supplier is punct_lucru
              const supplierId = updates.supplier_id || acquisition.supplier_id
              if (supplierId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { data: supplier } = await (supabase as any)
                  .from('suppliers')
                  .select('is_punct_lucru')
                  .eq('id', supplierId)
                  .single()

                if (supplier?.is_punct_lucru) {
                  attributionType = 'punct_lucru'
                  attributionId = supplierId
                }
              }
            }

            // Get payment method from cash register type
            let paymentMethod: 'cash' | 'bank' | null = null
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

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase as any)
              .from('expenses')
              .insert({
                company_id: acquisition.company_id,
                date: today,  // Data editării, nu data achiziției
                name: `Plată achiziție ${receiptRef}`,
                amount: paymentAmount,
                type: 'payment',
                payment_method: paymentMethod,
                attribution_type: attributionType,
                attribution_id: attributionId,
                notes: `Bon: ${receiptRef}`,
              })

            // Also create cash transaction if cash register is selected
            if (cashRegisterId) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              await (supabase as any)
                .from('cash_transactions')
                .insert({
                  company_id: acquisition.company_id,
                  cash_register_id: cashRegisterId,
                  date: today,
                  type: 'expense',
                  amount: paymentAmount,
                  description: `Plată achiziție ${receiptRef}`,
                  source_type: 'acquisition',
                  source_id: id,
                })
            }
          }
        }
      }

      return acquisition
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: acquisitionsKeys.list(data.company_id) })
      queryClient.invalidateQueries({ queryKey: acquisitionsKeys.detail(data.id) })
      // Invalidate expenses and cashier if we may have created one
      if (variables.payment_status && variables.payment_status !== 'unpaid') {
        queryClient.invalidateQueries({ queryKey: expensesKeys.list(data.company_id) })
        queryClient.invalidateQueries({ queryKey: cashierKeys.all })
      }
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
