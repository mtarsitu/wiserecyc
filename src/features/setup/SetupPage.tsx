import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Label, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui'
import { Loader2, Package, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Step = 'checking' | 'company' | 'user' | 'done' | 'already_setup'

interface CompanyData {
  name: string
  cui: string
  address: string
  city: string
  county: string
  email: string
  phone: string
}

interface UserData {
  email: string
  password: string
  full_name: string
  phone: string
}

const initialCompanyData: CompanyData = {
  name: '',
  cui: '',
  address: '',
  city: '',
  county: '',
  email: '',
  phone: '',
}

const initialUserData: UserData = {
  email: '',
  password: '',
  full_name: '',
  phone: '',
}

export function SetupPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('checking')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData>(initialCompanyData)
  const [userData, setUserData] = useState<UserData>(initialUserData)
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null)

  // Check if setup is needed (no companies exist)
  useEffect(() => {
    const checkSetupNeeded = async () => {
      try {
        // Try to count companies - this works even without auth if RLS allows
        const { count, error: countError } = await supabase
          .from('companies')
          .select('*', { count: 'exact', head: true })

        if (countError) {
          // If error, assume setup is needed (RLS might block)
          setStep('company')
          return
        }

        if (count && count > 0) {
          // Companies exist - check if user is authenticated super_admin
          const { data: { user } } = await supabase.auth.getUser()

          if (user) {
            // User is logged in, redirect to admin page for company management
            const { data: profile } = await supabase
              .from('profiles')
              .select('role')
              .eq('id', user.id)
              .single()

            if ((profile as { role: string } | null)?.role === 'super_admin') {
              // Super admin should use /admin page
              setStep('already_setup')
            } else {
              // Not super admin, redirect to dashboard
              navigate('/')
            }
          } else {
            // Not logged in and companies exist - redirect to login
            setStep('already_setup')
          }
        } else {
          // No companies - proceed with setup
          setStep('company')
        }
      } catch {
        // On error, assume setup is needed
        setStep('company')
      }
    }

    checkSetupNeeded()
  }, [navigate])

  const handleCompanyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCompanyData((prev) => ({ ...prev, [name]: value }))
  }

  const handleUserChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCompanySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // Create company
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: company, error: companyError } = await (supabase.from('companies') as any)
        .insert({
          name: companyData.name,
          cui: companyData.cui || null,
          address: companyData.address || null,
          city: companyData.city || null,
          county: companyData.county || null,
          email: companyData.email || null,
          phone: companyData.phone || null,
          is_active: true,
        })
        .select()
        .single()

      if (companyError) throw companyError

      setCreatedCompanyId(company.id)
      setStep('user')
    } catch (err) {
      console.error('Error creating company:', err)
      setError(err instanceof Error ? err.message : 'Eroare la crearea companiei')
    } finally {
      setIsLoading(false)
    }
  }

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (!createdCompanyId) throw new Error('Company ID missing')

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: { full_name: userData.full_name },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      // Wait a bit for the trigger to create the profile
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Update profile with company and super_admin role
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: profileError } = await (supabase.from('profiles') as any)
        .update({
          company_id: createdCompanyId,
          role: 'super_admin',
          full_name: userData.full_name,
          phone: userData.phone || null,
        })
        .eq('id', authData.user.id)

      if (profileError) throw profileError

      setStep('done')
    } catch (err) {
      console.error('Error creating user:', err)
      setError(err instanceof Error ? err.message : 'Eroare la crearea utilizatorului')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoToLogin = () => {
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary">
            <Package className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl">WiseRecyc Setup</CardTitle>
          <CardDescription>
            {step === 'checking' && 'Se verifica starea sistemului...'}
            {step === 'company' && 'Pasul 1: Creaza prima companie'}
            {step === 'user' && 'Pasul 2: Creaza contul Super Admin'}
            {step === 'done' && 'Setup complet!'}
            {step === 'already_setup' && 'Sistemul este deja configurat'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Checking state */}
          {step === 'checking' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Already setup state */}
          {step === 'already_setup' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
                <AlertCircle className="h-8 w-8 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Sistemul este deja configurat</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Exista deja companii in sistem. Pentru a adauga companii noi,
                  autentifica-te ca Super Admin si foloseste pagina de Administrare.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/login')} className="w-full">
                  Mergi la Login
                </Button>
                <Button onClick={() => navigate('/admin')} variant="outline" className="w-full">
                  Mergi la Administrare
                </Button>
              </div>
            </div>
          )}

          {/* Progress indicator - only show for setup steps */}
          {(step === 'company' || step === 'user' || step === 'done') && (
            <div className="mb-6 flex justify-center gap-2">
              <div className={`h-2 w-16 rounded ${step === 'company' ? 'bg-primary' : 'bg-primary/30'}`} />
              <div className={`h-2 w-16 rounded ${step === 'user' ? 'bg-primary' : step === 'done' ? 'bg-primary/30' : 'bg-muted'}`} />
              <div className={`h-2 w-16 rounded ${step === 'done' ? 'bg-green-500' : 'bg-muted'}`} />
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Step 1: Company */}
          {step === 'company' && (
            <form onSubmit={handleCompanySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nume companie *</Label>
                <Input
                  id="name"
                  name="name"
                  value={companyData.name}
                  onChange={handleCompanyChange}
                  required
                  placeholder="SC Reciclare SRL"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cui">CUI</Label>
                  <Input
                    id="cui"
                    name="cui"
                    value={companyData.cui}
                    onChange={handleCompanyChange}
                    placeholder="RO12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={companyData.phone}
                    onChange={handleCompanyChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email companie</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={companyData.email}
                  onChange={handleCompanyChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adresa</Label>
                <Input
                  id="address"
                  name="address"
                  value={companyData.address}
                  onChange={handleCompanyChange}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">Oras</Label>
                  <Input
                    id="city"
                    name="city"
                    value={companyData.city}
                    onChange={handleCompanyChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">Judet</Label>
                  <Input
                    id="county"
                    name="county"
                    value={companyData.county}
                    onChange={handleCompanyChange}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continua
              </Button>
            </form>
          )}

          {/* Step 2: User */}
          {step === 'user' && (
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nume complet *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={userData.full_name}
                  onChange={handleUserChange}
                  required
                  placeholder="Ion Popescu"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_email">Email *</Label>
                <Input
                  id="user_email"
                  name="email"
                  type="email"
                  value={userData.email}
                  onChange={handleUserChange}
                  required
                  placeholder="admin@company.ro"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Parola *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={userData.password}
                  onChange={handleUserChange}
                  required
                  minLength={6}
                  placeholder="Minim 6 caractere"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user_phone">Telefon</Label>
                <Input
                  id="user_phone"
                  name="phone"
                  type="tel"
                  value={userData.phone}
                  onChange={handleUserChange}
                />
              </div>

              <div className="rounded-lg bg-muted p-3 text-sm">
                Acest cont va avea rol de <strong>Super Admin</strong> si va putea gestiona toate companiile si utilizatorii.
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Creaza cont Super Admin
              </Button>
            </form>
          )}

          {/* Step 3: Done */}
          {step === 'done' && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Setup complet!</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Compania si contul Super Admin au fost create cu succes.
                  Verifica email-ul pentru confirmarea contului, apoi te poti autentifica.
                </p>
              </div>
              <Button onClick={handleGoToLogin} className="w-full">
                Mergi la Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
