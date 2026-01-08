import { useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Company } from '@/types/database'

interface AuthState {
  user: User | null
  profile: (Profile & { company?: Company | null }) | null
  session: Session | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
  })

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({ ...prev, session, user: session?.user ?? null }))
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setState(prev => ({ ...prev, loading: false }))
      }
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setState(prev => ({ ...prev, session, user: session?.user ?? null }))
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setState(prev => ({ ...prev, profile: null, loading: false }))
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    console.log('fetchProfile called for userId:', userId)
    try {
      // Use fetch directly to bypass any Supabase client issues
      console.log('Starting profile fetch...')
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      // Get token from localStorage directly to avoid any async issues
      const storedSession = localStorage.getItem('sb-nrrbmajarljbkklneeky-auth-token')
      let token = supabaseKey
      if (storedSession) {
        try {
          const parsed = JSON.parse(storedSession)
          token = parsed.access_token || supabaseKey
        } catch {
          console.log('Could not parse stored session')
        }
      }

      console.log('Making fetch request with token...')
      const response = await fetch(
        `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=*`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      console.log('Fetch response status:', response.status)
      const data = await response.json()
      console.log('Profile data:', data)

      if (!response.ok || !data || data.length === 0) {
        throw new Error('Profile not found')
      }

      const profileData = data[0]

      // Then, get company separately if company_id exists
      let companyData = null
      if (profileData.company_id) {
        console.log('Fetching company:', profileData.company_id)
        const companyResponse = await fetch(
          `${supabaseUrl}/rest/v1/companies?id=eq.${profileData.company_id}&select=*`,
          {
            headers: {
              'apikey': supabaseKey,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        )
        const companyArr = await companyResponse.json()
        if (companyResponse.ok && companyArr.length > 0) {
          companyData = companyArr[0]
        }
        console.log('Company data:', companyData)
      }

      const profile = { ...profileData, company: companyData }
      console.log('Final profile:', profile)
      setState(prev => ({ ...prev, profile, loading: false }))
    } catch (error) {
      console.error('Error fetching profile:', error)
      setState(prev => ({ ...prev, loading: false }))
    }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  const updateProfile = async (updates: { full_name?: string; phone?: string }) => {
    if (!state.user) return { error: new Error('No user logged in'), data: null }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase
      .from('profiles') as any)
      .update(updates)
      .eq('id', state.user.id)
      .select('*, company:companies(*)')
      .single()

    if (!error && data) {
      setState(prev => ({ ...prev, profile: data as Profile & { company?: Company | null } }))
    }
    return { data, error }
  }

  return {
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    isAuthenticated: !!state.session,
    isSuperAdmin: state.profile?.role === 'super_admin',
    isAdmin: state.profile?.role === 'admin' || state.profile?.role === 'super_admin',
    companyId: state.profile?.company_id,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refetchProfile: () => state.user && fetchProfile(state.user.id),
  }
}
