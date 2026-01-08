import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog } from '@/components/ui'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { dismantlingsQueryOptions } from '../dismantlings/queries'
import { useCreateDismantling, useDeleteDismantling } from '../dismantlings/mutations'
import { DismantlingForm } from '../dismantlings/components/DismantlingForm'
import { DismantlingTable } from '../dismantlings/components/DismantlingTable'

export function DismantlingPage() {
  const { companyId, user } = useAuthContext()

  // UI Store
  const dialog = useUIStore((s) => s.getDialog('dismantlings'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Query
  const { data: dismantlings = [], isLoading } = useQuery(dismantlingsQueryOptions(companyId))

  // Mutations
  const createDismantling = useCreateDismantling()
  const deleteDismantling = useDeleteDismantling()

  // Handlers
  const handleSubmit = async (data: {
    date: string
    location_type: 'curte' | 'contract'
    contract_id: string | null
    source_material_id: string
    source_quantity: number
    notes: string
    outputs: { material_id: string; quantity: number; notes?: string | null }[]
  }) => {
    try {
      await createDismantling.mutateAsync({
        company_id: companyId!,
        created_by: user?.id,
        ...data,
      })
      closeDialog('dismantlings')
    } catch (error) {
      console.error('Error saving dismantling:', error)
      alert('Eroare la salvarea dezmembrării: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteDismantling.mutateAsync({ id, companyId: companyId! })
      setDeleteConfirm('dismantlings', null)
    } catch (error) {
      console.error('Error deleting dismantling:', error)
      alert('Eroare la ștergerea dezmembrării')
    }
  }

  return (
    <div>
      <Header title="Dezmembrări" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista dezmembrări</h2>
            <p className="text-sm text-muted-foreground">
              Înregistrează dezmembrările de materiale din stocul disponibil
            </p>
          </div>
          <Button onClick={() => openDialog('dismantlings')}>
            <Plus className="mr-2 h-4 w-4" />
            Dezmembrare nouă
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dezmembrări ({dismantlings.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <DismantlingTable
              dismantlings={dismantlings}
              isLoading={isLoading}
              onDelete={handleDelete}
              deleteLoading={deleteDismantling.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Dismantling Dialog */}
      <Dialog
        open={dialog.isOpen}
        onClose={() => closeDialog('dismantlings')}
        title="Dezmembrare nouă"
        maxWidth="3xl"
      >
        {companyId && (
          <DismantlingForm
            companyId={companyId}
            isLoading={createDismantling.isPending}
            onSubmit={handleSubmit}
            onCancel={() => closeDialog('dismantlings')}
          />
        )}
      </Dialog>
    </div>
  )
}
