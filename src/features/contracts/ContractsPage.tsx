import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog } from '@/components/ui'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { contractsQueryOptions, type ContractWithSupplier } from './queries'
import { useCreateContract, useUpdateContract, useDeleteContract } from './mutations'
import { ContractTable } from './components/ContractTable'
import { ContractForm } from './components/ContractForm'

const ENTITY = 'contracts'

export function ContractsPage() {
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
  const { data: contracts = [], isLoading } = useQuery(contractsQueryOptions(companyId))
  const createContract = useCreateContract()
  const updateContract = useUpdateContract()
  const deleteContract = useDeleteContract()

  // Filtered data
  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts
    const q = searchQuery.toLowerCase()
    return contracts.filter(
      (c) =>
        c.contract_number.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.supplier?.name.toLowerCase().includes(q)
    )
  }, [contracts, searchQuery])

  // Current editing contract
  const editingContract = useMemo(() => {
    if (!dialog.editId) return null
    return contracts.find((c) => c.id === dialog.editId) || null
  }, [dialog.editId, contracts])

  // Handlers
  const handleEdit = (contract: ContractWithSupplier) => openDialog(ENTITY, contract.id)

  const handleSubmit = async (data: Parameters<typeof createContract.mutateAsync>[0]) => {
    try {
      if (editingContract) {
        await updateContract.mutateAsync({ id: editingContract.id, ...data })
      } else {
        await createContract.mutateAsync(data)
      }
      closeDialog(ENTITY)
    } catch (error) {
      console.error('Error saving contract:', error)
      alert('Eroare la salvarea contractului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteContract.mutateAsync(id)
      setDeleteConfirm(ENTITY, null)
    } catch (error) {
      console.error('Error deleting contract:', error)
      alert('Eroare la stergerea contractului: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const isMutating = createContract.isPending || updateContract.isPending

  return (
    <div>
      <Header title="Contracte" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista contracte</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza contractele si licitatiile
            </p>
          </div>
          <Button onClick={() => openDialog(ENTITY)}>
            <Plus className="mr-2 h-4 w-4" />
            Contract nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Contracte ({filteredContracts.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cauta contract..."
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
            ) : (
              <ContractTable
                contracts={filteredContracts}
                deleteConfirmId={deleteConfirmId}
                isDeleting={deleteContract.isPending}
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
        title={editingContract ? 'Editeaza contract' : 'Contract nou'}
        maxWidth="2xl"
      >
        {companyId && (
          <ContractForm
            companyId={companyId}
            contract={editingContract}
            isLoading={isMutating}
            onSubmit={handleSubmit}
            onCancel={() => closeDialog(ENTITY)}
          />
        )}
      </Dialog>
    </div>
  )
}
