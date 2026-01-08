import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Expense, ExpenseCategory } from '@/types/database'

export const expensesKeys = {
  all: ['expenses'] as const,
  list: (companyId: string | null) => [...expensesKeys.all, 'list', companyId] as const,
  detail: (id: string) => [...expensesKeys.all, 'detail', id] as const,
}

export const expenseCategoriesKeys = {
  all: ['expense_categories'] as const,
  list: (companyId: string | null) => [...expenseCategoriesKeys.all, 'list', companyId] as const,
}

export function expenseCategoriesQueryOptions(companyId: string | null | undefined) {
  return queryOptions({
    queryKey: expenseCategoriesKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expense_categories')
        .select('*')
        .eq('company_id', companyId)
        .order('name', { ascending: true })

      if (error) throw error
      return data as ExpenseCategory[]
    },
    enabled: !!companyId,
  })
}

export function expensesQueryOptions(companyId: string | null | undefined) {
  return queryOptions({
    queryKey: expensesKeys.list(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expenses')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as Expense[]
    },
    enabled: !!companyId,
  })
}

export function expensesWithDetailsQueryOptions(companyId: string | null | undefined) {
  return queryOptions({
    queryKey: [...expensesKeys.list(companyId ?? null), 'withDetails'] as const,
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('expenses')
        .select('*')
        .eq('company_id', companyId)
        .order('date', { ascending: false })

      if (error) throw error
      return data as Expense[]
    },
    enabled: !!companyId,
  })
}
