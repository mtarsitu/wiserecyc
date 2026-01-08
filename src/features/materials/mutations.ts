import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { materialsKeys } from './queries'
import type { Material, InsertTables, UpdateTables } from '@/types/database'

export function useCreateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (material: InsertTables<'materials'>) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('materials') as any)
        .insert(material)
        .select()
        .single()
      if (error) throw error
      return data as Material
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.all })
    },
  })
}

export function useUpdateMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateTables<'materials'> & { id: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from('materials') as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Material
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.all })
      queryClient.invalidateQueries({ queryKey: materialsKeys.detail(data.id) })
    },
  })
}

export function useDeleteMaterial() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('materials').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialsKeys.all })
    },
  })
}
