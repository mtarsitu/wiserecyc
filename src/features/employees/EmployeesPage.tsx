import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog } from '@/components/ui'
import { Plus, Search, Loader2, Users } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { employeesQueryOptions } from './queries'
import { useCreateEmployee, useUpdateEmployee, useDeleteEmployee } from './mutations'
import { EmployeeTable } from './components/EmployeeTable'
import { EmployeeForm } from './components/EmployeeForm'
import type { Employee } from '@/types/database'

const ENTITY = 'employees'

export function EmployeesPage() {
  const { companyId } = useAuthContext()

  // UI Store
  const searchQuery = useUIStore((s) => s.getSearchQuery(ENTITY))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const dialog = useUIStore((s) => s.getDialog(ENTITY))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const deleteConfirmId = useUIStore((s) => s.getDeleteConfirm(ENTITY))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Queries & Mutations
  const { data: employees = [], isLoading } = useQuery(employeesQueryOptions(companyId))
  const createEmployee = useCreateEmployee()
  const updateEmployee = useUpdateEmployee()
  const deleteEmployee = useDeleteEmployee()

  // Filtered data
  const filteredEmployees = useMemo(() => {
    if (!searchQuery) return employees
    const q = searchQuery.toLowerCase()
    return employees.filter(
      (e) =>
        e.full_name.toLowerCase().includes(q) ||
        e.position?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q)
    )
  }, [employees, searchQuery])

  // Stats
  const activeCount = useMemo(() => employees.filter(e => e.is_active).length, [employees])

  // Current editing employee
  const editingEmployee = useMemo(() => {
    if (!dialog.editId) return null
    return employees.find((e) => e.id === dialog.editId) || null
  }, [dialog.editId, employees])

  // Handlers
  const handleEdit = (employee: Employee) => openDialog(ENTITY, employee.id)

  const handleSubmit = async (data: Parameters<typeof createEmployee.mutateAsync>[0]) => {
    if (editingEmployee) {
      await updateEmployee.mutateAsync({ id: editingEmployee.id, ...data })
    } else {
      await createEmployee.mutateAsync(data)
    }
    closeDialog(ENTITY)
  }

  const handleDelete = async (id: string) => {
    await deleteEmployee.mutateAsync(id)
    setDeleteConfirm(ENTITY, null)
  }

  const isMutating = createEmployee.isPending || updateEmployee.isPending

  return (
    <div>
      <Header title="Salariati" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista salariati</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza salariatii companiei ({activeCount} activi din {employees.length})
            </p>
          </div>
          <Button onClick={() => openDialog(ENTITY)}>
            <Plus className="mr-2 h-4 w-4" />
            Salariat nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Salariati ({filteredEmployees.length})
              </CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cauta salariat..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(ENTITY, e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEmployees.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? 'Nu s-au gasit salariati care sa corespunda cautarii.'
                  : 'Nu exista salariati inregistrati. Apasa butonul "Salariat nou" pentru a adauga.'}
              </p>
            ) : (
              <EmployeeTable
                employees={filteredEmployees}
                deleteConfirmId={deleteConfirmId}
                isDeleting={deleteEmployee.isPending}
                onEdit={handleEdit}
                onDeleteClick={(id) => setDeleteConfirm(ENTITY, id)}
                onDeleteConfirm={handleDelete}
                onDeleteCancel={() => setDeleteConfirm(ENTITY, null)}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={dialog.isOpen}
        onClose={() => closeDialog(ENTITY)}
        title={editingEmployee ? 'Editeaza salariat' : 'Salariat nou'}
      >
        <EmployeeForm
          employee={editingEmployee}
          isLoading={isMutating}
          onSubmit={handleSubmit}
          onCancel={() => closeDialog(ENTITY)}
        />
      </Dialog>
    </div>
  )
}
