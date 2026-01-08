import { queryOptions } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Material } from '@/types/database'

export const materialsKeys = {
  all: ['materials'] as const,
  list: () => [...materialsKeys.all, 'list'] as const,
  active: () => [...materialsKeys.all, 'active'] as const,
  detail: (id: string) => [...materialsKeys.all, 'detail', id] as const,
}

export const materialsQueryOptions = () =>
  queryOptions({
    queryKey: materialsKeys.list(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('name')
      if (error) throw error
      return data as Material[]
    },
  })

export const activeMaterialsQueryOptions = () =>
  queryOptions({
    queryKey: materialsKeys.active(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('materials')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (error) throw error
      return data as Material[]
    },
  })
