import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { cashierKeys } from './queries'
import type {
  CashRegister,
  CashTransaction,
  UpdateTables,
  CashRegisterType,
  CashTransactionType,
  TransactionSourceType
} from '@/types/database'

// ============================================
// CASH REGISTER MUTATIONS
// ============================================

export interface CreateCashRegisterInput {
  company_id: string
  name: string
  type: CashRegisterType
  initial_balance: number
}

export function useCreateCashRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCashRegisterInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_registers')
        .insert({
          company_id: input.company_id,
          name: input.name,
          type: input.type,
          initial_balance: input.initial_balance,
        })
        .select()
        .single()

      if (error) throw error
      return data as CashRegister
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.registers(variables.company_id) })
    },
  })
}

export function useUpdateCashRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      ...updates
    }: UpdateTables<'cash_registers'> & { id: string; company_id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_registers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as CashRegister
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.registers(variables.company_id) })
    },
  })
}

export function useDeleteCashRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; company_id: string }) => {
      // Soft delete - set is_active to false
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('cash_registers')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.registers(variables.company_id) })
    },
  })
}

// ============================================
// CASH TRANSACTION MUTATIONS
// ============================================

export interface CreateCashTransactionInput {
  company_id: string
  cash_register_id: string
  date: string
  type: CashTransactionType
  amount: number
  description?: string
  source_type?: TransactionSourceType
  source_id?: string
  created_by?: string
}

export function useCreateCashTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateCashTransactionInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_transactions')
        .insert({
          company_id: input.company_id,
          cash_register_id: input.cash_register_id,
          date: input.date,
          type: input.type,
          amount: input.amount,
          description: input.description || null,
          source_type: input.source_type || 'manual',
          source_id: input.source_id || null,
          created_by: input.created_by || null,
        })
        .select()
        .single()

      if (error) throw error
      return data as CashTransaction
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.transactions(variables.company_id, variables.date) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.dailySummary(variables.company_id, variables.date) })
    },
  })
}

export function useUpdateCashTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      company_id,
      date,
      ...updates
    }: UpdateTables<'cash_transactions'> & { id: string; company_id: string; date: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as CashTransaction
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.transactions(variables.company_id, variables.date) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.dailySummary(variables.company_id, variables.date) })
    },
  })
}

export function useDeleteCashTransaction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id }: { id: string; company_id: string; date: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('cash_transactions')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.transactions(variables.company_id, variables.date) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.dailySummary(variables.company_id, variables.date) })
    },
  })
}

// ============================================
// HELPER: Create transaction from other modules
// ============================================

export interface CreateTransactionFromModuleInput {
  company_id: string
  cash_register_id: string
  date: string
  type: CashTransactionType
  amount: number
  description: string
  source_type: 'acquisition' | 'sale' | 'expense'
  source_id: string
  created_by?: string
}

export function useCreateTransactionFromModule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateTransactionFromModuleInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_transactions')
        .insert({
          company_id: input.company_id,
          cash_register_id: input.cash_register_id,
          date: input.date,
          type: input.type,
          amount: input.amount,
          description: input.description,
          source_type: input.source_type,
          source_id: input.source_id,
          created_by: input.created_by || null,
        })
        .select()
        .single()

      if (error) throw error
      return data as CashTransaction
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: cashierKeys.transactions(variables.company_id, variables.date) })
      queryClient.invalidateQueries({ queryKey: cashierKeys.dailySummary(variables.company_id, variables.date) })
    },
  })
}
