import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { adminKeys } from './queries'
import type { Company, Profile, InsertTables, UpdateTables, UserRole } from '@/types/database'

// Reset Password Mutation (calls Edge Function)
export function useResetUserPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reset password')
      }

      return result
    },
  })
}

// Company Mutations
export function useCreateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (company: InsertTables<'companies'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('companies') as any)
        .insert(company)
        .select()
        .single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.companies })
    },
  })
}

export function useUpdateCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'companies'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('companies') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Company
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.companies })
    },
  })
}

export function useDeleteCompany() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('companies').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.companies })
    },
  })
}

// User Mutations
interface CreateUserData {
  email: string
  password: string
  full_name: string
  company_id: string
  role: UserRole
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userData: CreateUserData) => {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: { full_name: userData.full_name },
      })

      if (authError) {
        // Fallback: use signUp if admin API not available
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: { full_name: userData.full_name },
          },
        })
        if (signUpError) throw signUpError

        // Update profile with company and role
        if (signUpData.user) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: profileError } = await (supabase.from('profiles') as any)
            .update({
              company_id: userData.company_id,
              role: userData.role,
              full_name: userData.full_name,
            })
            .eq('id', signUpData.user.id)
          if (profileError) throw profileError
        }
        return signUpData
      }

      // Update profile with company and role
      if (authData.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: profileError } = await (supabase.from('profiles') as any)
          .update({
            company_id: userData.company_id,
            role: userData.role,
            full_name: userData.full_name,
          })
          .eq('id', authData.user.id)
        if (profileError) throw profileError
      }

      return authData
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'profiles'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('profiles') as any)
        .update(updates)
        .eq('id', id)
        .select('*, company:companies(id, name)')
        .single()
      if (error) throw error
      return data as Profile
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Deactivate user (soft delete)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from('profiles') as any)
        .update({ is_active: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.users })
    },
  })
}
