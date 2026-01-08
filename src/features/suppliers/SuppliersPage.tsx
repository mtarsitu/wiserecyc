import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog } from '@/components/ui'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { suppliersQueryOptions } from './queries'
import { useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from './mutations'
import { SupplierTable } from './components/SupplierTable'
import { SupplierForm } from './components/SupplierForm'
import type { Supplier } from '@/types/database'

const ENTITY = 'suppliers'

export function SuppliersPage() {
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
  const { data: suppliers = [], isLoading } = useQuery(suppliersQueryOptions(companyId))
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()
  const deleteSupplier = useDeleteSupplier()

  // Filtered data
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery) return suppliers
    const q = searchQuery.toLowerCase()
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.cui?.toLowerCase().includes(q) ||
        s.city?.toLowerCase().includes(q)
    )
  }, [suppliers, searchQuery])

  // Current editing supplier
  const editingSupplier = useMemo(() => {
    if (!dialog.editId) return null
    return suppliers.find((s) => s.id === dialog.editId) || null
  }, [dialog.editId, suppliers])

  // Handlers
  const handleEdit = (supplier: Supplier) => openDialog(ENTITY, supplier.id)

  const handleSubmit = async (data: Parameters<typeof createSupplier.mutateAsync>[0]) => {
    if (editingSupplier) {
      await updateSupplier.mutateAsync({ id: editingSupplier.id, ...data })
    } else {
      await createSupplier.mutateAsync(data)
    }
    closeDialog(ENTITY)
  }

  const handleDelete = async (id: string) => {
    await deleteSupplier.mutateAsync(id)
    setDeleteConfirm(ENTITY, null)
  }

  const isMutating = createSupplier.isPending || updateSupplier.isPending

  return (
    <div>
      <Header title="Furnizori" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista furnizori</h2>
            <p className="text-sm text-muted-foreground">Gestioneaza furnizorii de materiale</p>
          </div>
          <Button onClick={() => openDialog(ENTITY)}>
            <Plus className="mr-2 h-4 w-4" />
            Furnizor nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Furnizori ({filteredSuppliers.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cauta furnizor..."
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
            ) : filteredSuppliers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? 'Nu s-au gasit furnizori care sa corespunda cautarii.'
                  : 'Nu exista furnizori inregistrati. Apasa butonul "Furnizor nou" pentru a adauga.'}
              </p>
            ) : (
              <SupplierTable
                suppliers={filteredSuppliers}
                deleteConfirmId={deleteConfirmId}
                isDeleting={deleteSupplier.isPending}
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
        title={editingSupplier ? 'Editeaza furnizor' : 'Furnizor nou'}
      >
        <SupplierForm
          supplier={editingSupplier}
          isLoading={isMutating}
          onSubmit={handleSubmit}
          onCancel={() => closeDialog(ENTITY)}
        />
      </Dialog>
    </div>
  )
}
