import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CashRegister, CashTransaction } from '@/types/database'

// Extended types with computed values
export type CashRegisterWithBalance = CashRegister & {
  opening_balance: number
  daily_income: number
  daily_expense: number
  closing_balance: number
}

export type CashTransactionWithDetails = CashTransaction & {
  cash_register?: CashRegister
}

export const cashierKeys = {
  all: ['cashier'] as const,
  registers: (companyId: string | null) => [...cashierKeys.all, 'registers', companyId] as const,
  transactions: (companyId: string | null, date: string) => [...cashierKeys.all, 'transactions', companyId, date] as const,
  dailySummary: (companyId: string | null, date: string) => [...cashierKeys.all, 'daily-summary', companyId, date] as const,
}

// Fetch all cash registers for a company
export const cashRegistersQueryOptions = (companyId: string | null | undefined) =>
  queryOptions({
    queryKey: cashierKeys.registers(companyId ?? null),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_registers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return data as CashRegister[]
    },
    enabled: !!companyId,
  })

// Fetch transactions for a specific date
export const cashTransactionsQueryOptions = (companyId: string | null | undefined, date: string) =>
  queryOptions({
    queryKey: cashierKeys.transactions(companyId ?? null, date),
    queryFn: async () => {
      if (!companyId) return []

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('cash_transactions')
        .select(`
          *,
          cash_register:cash_registers(*)
        `)
        .eq('company_id', companyId)
        .eq('date', date)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as CashTransactionWithDetails[]
    },
    enabled: !!companyId,
  })

// Calculate daily summary for all cash registers
export const cashRegisterDailySummaryQueryOptions = (companyId: string | null | undefined, date: string) =>
  queryOptions({
    queryKey: cashierKeys.dailySummary(companyId ?? null, date),
    queryFn: async () => {
      if (!companyId) return []

      // Get all active cash registers
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: registers, error: registersError } = await (supabase as any)
        .from('cash_registers')
        .select('*')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (registersError) throw registersError

      // Calculate balances for each register
      const summaries: CashRegisterWithBalance[] = await Promise.all(
        (registers as CashRegister[]).map(async (register) => {
          // Get opening balance (balance at end of previous day)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: openingData } = await (supabase as any)
            .rpc('get_cash_register_balance', {
              p_cash_register_id: register.id,
              p_date: getPreviousDate(date),
            })

          const opening_balance = openingData ?? register.initial_balance

          // Get daily income
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: incomeData } = await (supabase as any)
            .from('cash_transactions')
            .select('amount')
            .eq('cash_register_id', register.id)
            .eq('date', date)
            .eq('type', 'income')

          const daily_income = (incomeData || []).reduce(
            (sum: number, t: { amount: number }) => sum + Number(t.amount),
            0
          )

          // Get daily expense
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: expenseData } = await (supabase as any)
            .from('cash_transactions')
            .select('amount')
            .eq('cash_register_id', register.id)
            .eq('date', date)
            .eq('type', 'expense')

          const daily_expense = (expenseData || []).reduce(
            (sum: number, t: { amount: number }) => sum + Number(t.amount),
            0
          )

          const closing_balance = opening_balance + daily_income - daily_expense

          return {
            ...register,
            opening_balance,
            daily_income,
            daily_expense,
            closing_balance,
          }
        })
      )

      return summaries
    },
    enabled: !!companyId,
  })

// Helper function to get previous date
function getPreviousDate(dateStr: string): string {
  const date = new Date(dateStr)
  date.setDate(date.getDate() - 1)
  return date.toISOString().split('T')[0]
}
