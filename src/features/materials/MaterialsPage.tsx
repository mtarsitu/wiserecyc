import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog } from '@/components/ui'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import { materialsQueryOptions } from './queries'
import { useCreateMaterial, useUpdateMaterial, useDeleteMaterial } from './mutations'
import { MaterialTable } from './components/MaterialTable'
import { MaterialForm } from './components/MaterialForm'
import type { Material } from '@/types/database'

const ENTITY = 'materials'

export function MaterialsPage() {
  // UI Store
  const searchQuery = useUIStore((s) => s.getSearchQuery(ENTITY))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const dialog = useUIStore((s) => s.getDialog(ENTITY))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const deleteConfirmId = useUIStore((s) => s.getDeleteConfirm(ENTITY))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Queries & Mutations
  const { data: materials = [], isLoading } = useQuery(materialsQueryOptions())
  const createMaterial = useCreateMaterial()
  const updateMaterial = useUpdateMaterial()
  const deleteMaterial = useDeleteMaterial()

  // Filtered data
  const filteredMaterials = useMemo(() => {
    if (!searchQuery) return materials
    const q = searchQuery.toLowerCase()
    return materials.filter((m) => m.name.toLowerCase().includes(q))
  }, [materials, searchQuery])

  // Current editing material
  const editingMaterial = useMemo(() => {
    if (!dialog.editId) return null
    return materials.find((m) => m.id === dialog.editId) || null
  }, [dialog.editId, materials])

  // Handlers
  const handleEdit = (material: Material) => openDialog(ENTITY, material.id)

  const handleSubmit = async (data: Parameters<typeof createMaterial.mutateAsync>[0]) => {
    if (editingMaterial) {
      await updateMaterial.mutateAsync({ id: editingMaterial.id, ...data })
    } else {
      await createMaterial.mutateAsync(data)
    }
    closeDialog(ENTITY)
  }

  const handleDelete = async (id: string) => {
    await deleteMaterial.mutateAsync(id)
    setDeleteConfirm(ENTITY, null)
  }

  const isMutating = createMaterial.isPending || updateMaterial.isPending

  return (
    <div>
      <Header title="Materiale" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Catalog materiale</h2>
            <p className="text-sm text-muted-foreground">Gestioneaza catalogul de materiale reciclabile</p>
          </div>
          <Button onClick={() => openDialog(ENTITY)}>
            <Plus className="mr-2 h-4 w-4" />
            Material nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Materiale ({filteredMaterials.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cauta material..."
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
            ) : filteredMaterials.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? 'Nu s-au gasit materiale care sa corespunda cautarii.'
                  : 'Nu exista materiale inregistrate. Apasa butonul "Material nou" pentru a adauga.'}
              </p>
            ) : (
              <MaterialTable
                materials={filteredMaterials}
                deleteConfirmId={deleteConfirmId}
                isDeleting={deleteMaterial.isPending}
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
        title={editingMaterial ? 'Editeaza material' : 'Material nou'}
        maxWidth="md"
      >
        <MaterialForm
          material={editingMaterial}
          isLoading={isMutating}
          onSubmit={handleSubmit}
          onCancel={() => closeDialog(ENTITY)}
        />
      </Dialog>
    </div>
  )
}
