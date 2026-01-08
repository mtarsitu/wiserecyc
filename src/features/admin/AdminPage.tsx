import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
  Dialog,
} from '@/components/ui'
import { Plus, Search, Loader2, Building2, Users, Pencil, Trash2, KeyRound } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { companiesQueryOptions, allUsersQueryOptions } from './queries'
import { useCreateCompany, useUpdateCompany, useDeleteCompany, useCreateUser, useUpdateUser, useDeleteUser, useResetUserPassword } from './mutations'
import { CompanyForm } from './components/CompanyForm'
import { UserForm } from './components/UserForm'
import type { UserRole } from '@/types/database'

type TabType = 'companies' | 'users'

const roleLabels: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  operator: 'Operator',
  viewer: 'Vizualizator',
}

export function AdminPage() {
  const { isSuperAdmin } = useAuthContext()
  const [activeTab, setActiveTab] = useState<TabType>('companies')
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')

  // UI Store
  const companySearchQuery = useUIStore((s) => s.getSearchQuery('admin_companies'))
  const setCompanySearchQuery = useUIStore((s) => s.setSearchQuery)
  const userSearchQuery = useUIStore((s) => s.getSearchQuery('admin_users'))
  const setUserSearchQuery = useUIStore((s) => s.setSearchQuery)

  const companyDialog = useUIStore((s) => s.getDialog('admin_companies'))
  const userDialog = useUIStore((s) => s.getDialog('admin_users'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)

  const companyDeleteConfirm = useUIStore((s) => s.getDeleteConfirm('admin_companies'))
  const userDeleteConfirm = useUIStore((s) => s.getDeleteConfirm('admin_users'))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Queries
  const { data: companies = [], isLoading: companiesLoading } = useQuery(companiesQueryOptions())
  const { data: users = [], isLoading: usersLoading } = useQuery(allUsersQueryOptions())

  // Mutations
  const createCompany = useCreateCompany()
  const updateCompany = useUpdateCompany()
  const deleteCompany = useDeleteCompany()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deleteUser = useDeleteUser()
  const resetPassword = useResetUserPassword()

  // Filtered data
  const filteredCompanies = useMemo(() => {
    if (!companySearchQuery) return companies
    const q = companySearchQuery.toLowerCase()
    return companies.filter((c) => c.name.toLowerCase().includes(q) || c.cui?.toLowerCase().includes(q))
  }, [companies, companySearchQuery])

  const filteredUsers = useMemo(() => {
    if (!userSearchQuery) return users
    const q = userSearchQuery.toLowerCase()
    return users.filter(
      (u) =>
        u.full_name?.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.company?.name.toLowerCase().includes(q)
    )
  }, [users, userSearchQuery])

  // Current editing items
  const editingCompany = useMemo(() => {
    if (!companyDialog.editId) return null
    return companies.find((c) => c.id === companyDialog.editId) || null
  }, [companyDialog.editId, companies])

  const editingUser = useMemo(() => {
    if (!userDialog.editId) return null
    return users.find((u) => u.id === userDialog.editId) || null
  }, [userDialog.editId, users])

  // Handlers
  const handleCompanySubmit = async (data: Parameters<typeof createCompany.mutateAsync>[0]) => {
    console.log('handleCompanySubmit called with:', data)
    try {
      if (editingCompany) {
        console.log('Updating company:', editingCompany.id)
        await updateCompany.mutateAsync({ id: editingCompany.id, ...data })
      } else {
        console.log('Creating new company')
        const result = await createCompany.mutateAsync(data)
        console.log('Company created:', result)
      }
      closeDialog('admin_companies')
    } catch (error) {
      console.error('Error in handleCompanySubmit:', error)
      alert('Eroare la salvarea companiei: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleUserSubmit = async (data: Parameters<typeof createUser.mutateAsync>[0]) => {
    if (editingUser) {
      await updateUser.mutateAsync({ id: editingUser.id, ...data })
    } else {
      await createUser.mutateAsync(data)
    }
    closeDialog('admin_users')
  }

  const handleCompanyDelete = async (id: string) => {
    await deleteCompany.mutateAsync(id)
    setDeleteConfirm('admin_companies', null)
  }

  const handleUserDelete = async (id: string) => {
    await deleteUser.mutateAsync(id)
    setDeleteConfirm('admin_users', null)
  }

  const handleResetPassword = async () => {
    if (!resetPasswordUserId || !newPassword) return
    try {
      await resetPassword.mutateAsync({ userId: resetPasswordUserId, newPassword })
      alert('Parola a fost resetata cu succes!')
      setResetPasswordUserId(null)
      setNewPassword('')
    } catch (error) {
      alert('Eroare la resetarea parolei: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const resetPasswordUser = useMemo(() => {
    if (!resetPasswordUserId) return null
    return users.find((u) => u.id === resetPasswordUserId) || null
  }, [resetPasswordUserId, users])

  if (!isSuperAdmin) {
    return (
      <div>
        <Header title="Administrare" />
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">Nu aveti permisiuni pentru aceasta pagina.</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Header title="Administrare" />
      <div className="p-6">
        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={activeTab === 'companies' ? 'default' : 'outline'}
            onClick={() => setActiveTab('companies')}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Companii
          </Button>
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
          >
            <Users className="mr-2 h-4 w-4" />
            Utilizatori
          </Button>
        </div>

        {/* Companies Tab */}
        {activeTab === 'companies' && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Companii</h2>
                <p className="text-sm text-muted-foreground">Gestioneaza companiile din sistem</p>
              </div>
              <Button onClick={() => openDialog('admin_companies')}>
                <Plus className="mr-2 h-4 w-4" />
                Companie noua
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Companii ({filteredCompanies.length})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cauta companie..."
                      value={companySearchQuery}
                      onChange={(e) => setCompanySearchQuery('admin_companies', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {companiesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredCompanies.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nu exista companii inregistrate.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nume</TableHead>
                        <TableHead>CUI</TableHead>
                        <TableHead>Oras</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.map((company) => (
                        <TableRow key={company.id}>
                          <TableCell className="font-medium">{company.name}</TableCell>
                          <TableCell>{company.cui || '-'}</TableCell>
                          <TableCell>{company.city || '-'}</TableCell>
                          <TableCell>{company.email || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={company.is_active ? 'default' : 'secondary'}>
                              {company.is_active ? 'Activa' : 'Inactiva'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openDialog('admin_companies', company.id)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {companyDeleteConfirm === company.id ? (
                                <div className="flex items-center gap-1">
                                  <Button variant="destructive" size="sm" onClick={() => handleCompanyDelete(company.id)} disabled={deleteCompany.isPending}>
                                    {deleteCompany.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm('admin_companies', null)}>Nu</Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm('admin_companies', company.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Utilizatori</h2>
                <p className="text-sm text-muted-foreground">Gestioneaza utilizatorii din sistem</p>
              </div>
              <Button onClick={() => openDialog('admin_users')}>
                <Plus className="mr-2 h-4 w-4" />
                Utilizator nou
              </Button>
            </div>

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle>Utilizatori ({filteredUsers.length})</CardTitle>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cauta utilizator..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery('admin_users', e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Nu exista utilizatori inregistrati.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nume</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Companie</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actiuni</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.company?.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'super_admin' ? 'default' : 'secondary'}>
                              {roleLabels[user.role]}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'secondary'}>
                              {user.is_active ? 'Activ' : 'Inactiv'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => setResetPasswordUserId(user.id)} title="Reseteaza parola">
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openDialog('admin_users', user.id)} title="Editeaza">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              {userDeleteConfirm === user.id ? (
                                <div className="flex items-center gap-1">
                                  <Button variant="destructive" size="sm" onClick={() => handleUserDelete(user.id)} disabled={deleteUser.isPending}>
                                    {deleteUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => setDeleteConfirm('admin_users', null)}>Nu</Button>
                                </div>
                              ) : (
                                <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm('admin_users', user.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Company Dialog */}
      <Dialog
        open={companyDialog.isOpen}
        onClose={() => closeDialog('admin_companies')}
        title={editingCompany ? 'Editeaza companie' : 'Companie noua'}
        maxWidth="2xl"
      >
        <CompanyForm
          company={editingCompany}
          isLoading={createCompany.isPending || updateCompany.isPending}
          onSubmit={handleCompanySubmit}
          onCancel={() => closeDialog('admin_companies')}
        />
      </Dialog>

      {/* User Dialog */}
      <Dialog
        open={userDialog.isOpen}
        onClose={() => closeDialog('admin_users')}
        title={editingUser ? 'Editeaza utilizator' : 'Utilizator nou'}
        maxWidth="xl"
      >
        <UserForm
          user={editingUser}
          companies={companies}
          isNew={!editingUser}
          isLoading={createUser.isPending || updateUser.isPending}
          onSubmit={handleUserSubmit}
          onCancel={() => closeDialog('admin_users')}
        />
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetPasswordUserId}
        onClose={() => { setResetPasswordUserId(null); setNewPassword(''); }}
        title="Reseteaza parola"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Reseteaza parola pentru utilizatorul: <strong>{resetPasswordUser?.full_name || resetPasswordUser?.email}</strong>
          </p>
          <div>
            <label htmlFor="new-password" className="text-sm font-medium">
              Parola noua *
            </label>
            <Input
              id="new-password"
              type="password"
              placeholder="Introdu parola noua (min. 6 caractere)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setResetPasswordUserId(null); setNewPassword(''); }}>
              Anuleaza
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={!newPassword || newPassword.length < 6 || resetPassword.isPending}
            >
              {resetPassword.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              Reseteaza parola
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
