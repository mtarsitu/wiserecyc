import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Dialog } from '@/components/ui'
import { Plus, Search, Loader2 } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { clientsQueryOptions, clientBalancesQueryOptions } from './queries'
import { useCreateClient, useUpdateClient, useDeleteClient } from './mutations'
import { ClientTable } from './components/ClientTable'
import { ClientForm } from './components/ClientForm'
import type { Client } from '@/types/database'

const ENTITY = 'clients'

export function ClientsPage() {
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
  const { data: clients = [], isLoading } = useQuery(clientsQueryOptions(companyId))
  const { data: balances = [] } = useQuery(clientBalancesQueryOptions(companyId))
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  // Filtered data
  const filteredClients = useMemo(() => {
    if (!searchQuery) return clients
    const q = searchQuery.toLowerCase()
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.cui?.toLowerCase().includes(q) ||
        c.city?.toLowerCase().includes(q)
    )
  }, [clients, searchQuery])

  // Current editing client
  const editingClient = useMemo(() => {
    if (!dialog.editId) return null
    return clients.find((c) => c.id === dialog.editId) || null
  }, [dialog.editId, clients])

  // Handlers
  const handleEdit = (client: Client) => openDialog(ENTITY, client.id)

  const handleSubmit = async (data: Parameters<typeof createClient.mutateAsync>[0]) => {
    if (editingClient) {
      await updateClient.mutateAsync({ id: editingClient.id, ...data })
    } else {
      await createClient.mutateAsync(data)
    }
    closeDialog(ENTITY)
  }

  const handleDelete = async (id: string) => {
    await deleteClient.mutateAsync(id)
    setDeleteConfirm(ENTITY, null)
  }

  const isMutating = createClient.isPending || updateClient.isPending

  return (
    <div>
      <Header title="Clienti" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista clienti</h2>
            <p className="text-sm text-muted-foreground">Gestioneaza clientii</p>
          </div>
          <Button onClick={() => openDialog(ENTITY)}>
            <Plus className="mr-2 h-4 w-4" />
            Client nou
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle>Clienti ({filteredClients.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cauta client..."
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
            ) : filteredClients.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery
                  ? 'Nu s-au gasit clienti care sa corespunda cautarii.'
                  : 'Nu exista clienti inregistrati. Apasa butonul "Client nou" pentru a adauga.'}
              </p>
            ) : (
              <ClientTable
                clients={filteredClients}
                balances={balances}
                deleteConfirmId={deleteConfirmId}
                isDeleting={deleteClient.isPending}
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
        title={editingClient ? 'Editeaza client' : 'Client nou'}
      >
        <ClientForm
          client={editingClient}
          isLoading={isMutating}
          onSubmit={handleSubmit}
          onCancel={() => closeDialog(ENTITY)}
        />
      </Dialog>
    </div>
  )
}
