import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { expensesKeys, expenseCategoriesKeys } from './queries'
import type { ExpenseType, PaymentMethod, AttributionType } from '@/types/database'

// ==================== Expense Category Mutations ====================

interface CreateExpenseCategoryInput {
  company_id: string
  name: string
}

export function useCreateExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateExpenseCategoryInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expense_categories')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expenseCategoriesKeys.list(variables.company_id) })
    },
  })
}

export function useUpdateExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name, companyId }: { id: string; name: string; companyId: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expense_categories')
        .update({ name })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return { ...data, companyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseCategoriesKeys.list(data.companyId) })
    },
  })
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('expense_categories')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, companyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expenseCategoriesKeys.list(data.companyId) })
    },
  })
}

// ==================== Expense Mutations ====================

interface CreateExpenseInput {
  company_id: string
  date: string
  name: string
  amount: number
  type: ExpenseType
  payment_method?: PaymentMethod | null
  category_id?: string | null
  attribution_type?: AttributionType | null
  attribution_id?: string | null
  employee_id?: string | null
  notes?: string | null
  created_by?: string
}

export function useCreateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateExpenseInput) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expenses')
        .insert(input)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.list(variables.company_id) })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CreateExpenseInput>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.list(data.company_id) })
      queryClient.invalidateQueries({ queryKey: expensesKeys.detail(data.id) })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
      return { id, companyId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: expensesKeys.list(data.companyId) })
    },
  })
}
