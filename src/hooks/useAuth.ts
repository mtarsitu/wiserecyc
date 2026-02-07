import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile, Company } from '@/types/database'

const SELECTED_COMPANY_KEY = 'wiserecyc-selected-company'

interface UserCompany {
  company_id: string
  role: string
  company: Company
}

interface AuthState {
  user: User | null
  profile: (Profile & { company?: Company | null }) | null
  session: Session | null
  loading: boolean
  userCompanies: UserCompany[]
  selectedCompanyId: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    userCompanies: [],
    selectedCompanyId: localStorage.getItem(SELECTED_COMPANY_KEY),
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
    try {
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
          // Ignore parse errors, use default key
        }
      }

      // Fetch profile
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

      const data = await response.json()
      if (!response.ok || !data || data.length === 0) {
        throw new Error('Profile not found')
      }

      const profileData = data[0]

      // Fetch user's companies from user_companies junction table
      const userCompaniesResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_companies?user_id=eq.${userId}&select=company_id,role`,
        {
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      )

      let userCompanies: UserCompany[] = []

      if (userCompaniesResponse.ok) {
        const ucData = await userCompaniesResponse.json()

        if (Array.isArray(ucData) && ucData.length > 0) {
          // Fetch all companies for this user
          const companyIds = ucData.map((uc: { company_id: string }) => uc.company_id)
          const companiesResponse = await fetch(
            `${supabaseUrl}/rest/v1/companies?id=in.(${companyIds.join(',')})&select=*`,
            {
              headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            }
          )

          if (companiesResponse.ok) {
            const companiesData = await companiesResponse.json()
            const companiesMap = new Map(companiesData.map((c: Company) => [c.id, c]))

            userCompanies = ucData.map((uc: { company_id: string; role: string }) => ({
              company_id: uc.company_id,
              role: uc.role,
              company: companiesMap.get(uc.company_id),
            })).filter((uc: UserCompany) => uc.company) // Only include if company was found
          }
        }
      }

      // Determine which company to use
      const savedCompanyId = localStorage.getItem(SELECTED_COMPANY_KEY)
      let selectedCompanyId = savedCompanyId

      // If saved company is not in user's companies, use default
      if (!userCompanies.find(uc => uc.company_id === savedCompanyId)) {
        // Fall back to profile's company_id or first available company
        selectedCompanyId = profileData.company_id || userCompanies[0]?.company_id || null
        if (selectedCompanyId) {
          localStorage.setItem(SELECTED_COMPANY_KEY, selectedCompanyId)
        }
      }

      // Get the selected company data
      let companyData = null
      if (selectedCompanyId) {
        const selectedUc = userCompanies.find(uc => uc.company_id === selectedCompanyId)
        if (selectedUc) {
          companyData = selectedUc.company
        } else if (profileData.company_id) {
          // Fallback: fetch company directly
          const companyResponse = await fetch(
            `${supabaseUrl}/rest/v1/companies?id=eq.${selectedCompanyId}&select=*`,
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
        }
      }

      const profile = { ...profileData, company: companyData, company_id: selectedCompanyId || profileData.company_id }
      setState(prev => ({
        ...prev,
        profile,
        userCompanies,
        selectedCompanyId,
        loading: false
      }))
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

  const switchCompany = useCallback((companyId: string) => {
    const selectedUc = state.userCompanies.find(uc => uc.company_id === companyId)
    if (!selectedUc) return

    // Save to localStorage
    localStorage.setItem(SELECTED_COMPANY_KEY, companyId)

    // Update state with new company
    setState(prev => ({
      ...prev,
      selectedCompanyId: companyId,
      profile: prev.profile ? {
        ...prev.profile,
        company: selectedUc.company,
        company_id: companyId,
      } : null,
    }))
  }, [state.userCompanies])

  return {
    user: state.user,
    profile: state.profile,
    session: state.session,
    loading: state.loading,
    isAuthenticated: !!state.session,
    isSuperAdmin: state.profile?.role === 'super_admin',
    isAdmin: state.profile?.role === 'admin' || state.profile?.role === 'super_admin',
    companyId: state.selectedCompanyId || state.profile?.company_id,
    userCompanies: state.userCompanies,
    switchCompany,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refetchProfile: () => state.user && fetchProfile(state.user.id),
  }
}
