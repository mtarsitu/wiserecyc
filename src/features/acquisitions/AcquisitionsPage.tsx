import { useMemo, useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog, Input, Label } from '@/components/ui'
import { Plus, EyeOff, Eye } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { acquisitionsQueryOptions, type AcquisitionWithDetails } from './queries'
import { useCreateAcquisition, useUpdateAcquisition, useDeleteAcquisition } from './mutations'
import { useCreateCashTransaction } from '@/features/cashier/mutations'
import { AcquisitionForm } from './components/AcquisitionForm'
import { AcquisitionTable } from './components/AcquisitionTable'
import { BorderouPrintDialog } from './components/BorderouPrintDialog'
import { TicketPrintDialog, usePrintTicket, acquisitionToTicketData } from '@/features/tickets'

// Parola pentru a afisa achizitiile ascunse (pret 0 sau donatii)
const HIDDEN_ACQUISITIONS_PASSWORD = '1234'

export function AcquisitionsPage() {
  const { companyId, user, profile } = useAuthContext()
  const company = profile?.company

  // State pentru achizitii ascunse
  const [showHiddenAcquisitions, setShowHiddenAcquisitions] = useState(false)
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState('')

  // UI Store
  const dialog = useUIStore((s) => s.getDialog('acquisitions'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Ticket Print Hook
  const { isOpen: isTicketOpen, ticketData, openTicketDialog, closeTicketDialog } = usePrintTicket()

  // Borderou Print State
  const [borderouDialogOpen, setBorderouDialogOpen] = useState(false)
  const [borderouAcquisition, setBorderouAcquisition] = useState<AcquisitionWithDetails | null>(null)

  // Query
  const { data: allAcquisitions = [], isLoading } = useQuery(acquisitionsQueryOptions(companyId))

  // Filtrare achizitii - ascunde cele care au TOATE item-urile de tip 'zero' sau 'director'
  // Itemurile individuale cu acquisition_type 'zero' sau 'director' sunt filtrate separat in AcquisitionTable
  const acquisitions = useMemo(() => {
    if (showHiddenAcquisitions) return allAcquisitions
    return allAcquisitions.filter(a => {
      // Verifica daca exista cel putin un item normal (nu zero sau director)
      const hasNormalItems = a.items.some(item =>
        item.acquisition_type !== 'zero' && item.acquisition_type !== 'director'
      )
      // Ascunde achizitia doar daca NU are niciun item normal
      return hasNormalItems
    })
  }, [allAcquisitions, showHiddenAcquisitions])

  // Numara achizitiile ascunse
  const hiddenCount = allAcquisitions.length - acquisitions.length

  // Handler pentru Ctrl+Shift+H / Cmd+Shift+H
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      if (showHiddenAcquisitions) {
        // Daca sunt deja vizibile, le ascundem direct
        setShowHiddenAcquisitions(false)
      } else {
        // Deschide dialogul de parola
        setPasswordDialogOpen(true)
        setPasswordInput('')
        setPasswordError('')
      }
    }
  }, [showHiddenAcquisitions])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Verificare parola
  const handlePasswordSubmit = () => {
    if (passwordInput === HIDDEN_ACQUISITIONS_PASSWORD) {
      setShowHiddenAcquisitions(true)
      setPasswordDialogOpen(false)
      setPasswordInput('')
      setPasswordError('')
    } else {
      setPasswordError('Parola incorecta')
    }
  }

  // Mutations
  const createAcquisition = useCreateAcquisition()
  const updateAcquisition = useUpdateAcquisition()
  const deleteAcquisition = useDeleteAcquisition()
  const createCashTransaction = useCreateCashTransaction()

  // Current editing acquisition
  const editingAcquisition = useMemo(() => {
    if (!dialog.editId) return null
    return acquisitions.find((a) => a.id === dialog.editId) || null
  }, [dialog.editId, acquisitions])

  // Handlers
  const handleSubmit = async (data: {
    date: string
    supplier_id: string
    receipt_number: string
    payment_status: 'paid' | 'unpaid' | 'partial'
    partial_amount: number
    cash_register_id: string | null
    location_type: 'curte' | 'contract' | 'deee'
    contract_id: string | null
    environment_fund: number
    tax_amount: number  // Impozit 10% de plătit la stat (pentru persoane fizice)
    is_natural_person: boolean  // Dacă furnizorul este persoană fizică
    total_amount: number  // Suma plătită furnizorului
    info: string
    notes: string
    goes_to_accounting: boolean
    vehicle_id: string | null
    driver_id: string | null
    transport_type: string
    transport_price: number
    items: {
      id?: string
      material_id: string
      quantity: number
      impurities_percent: number
      final_quantity: number
      price_per_kg: number
      line_total: number
    }[]
  }) => {
    try {
      let acquisitionId: string | undefined

      if (editingAcquisition) {
        await updateAcquisition.mutateAsync({
          id: editingAcquisition.id,
          date: data.date,
          supplier_id: data.supplier_id || null,
          receipt_number: data.receipt_number,
          payment_status: data.payment_status,
          partial_amount: data.partial_amount,
          cash_register_id: data.cash_register_id,  // For expense + cash transaction
          location_type: data.location_type,
          contract_id: data.contract_id,
          environment_fund: data.environment_fund,
          tax_amount: data.tax_amount,
          is_natural_person: data.is_natural_person,
          total_amount: data.total_amount,
          info: data.info,
          notes: data.notes,
          goes_to_accounting: data.goes_to_accounting,
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          transport_type: data.transport_type,
          transport_price: data.transport_price,
          items: data.items,
        })
        acquisitionId = editingAcquisition.id
      } else {
        const newAcquisition = await createAcquisition.mutateAsync({
          company_id: companyId!,
          created_by: user?.id,
          date: data.date,
          supplier_id: data.supplier_id || null,
          receipt_number: data.receipt_number,
          payment_status: data.payment_status,
          partial_amount: data.partial_amount,
          cash_register_id: data.cash_register_id,  // Pass through for expense + cash transaction creation
          location_type: data.location_type,
          contract_id: data.contract_id,
          environment_fund: data.environment_fund,
          tax_amount: data.tax_amount,
          is_natural_person: data.is_natural_person,
          total_amount: data.total_amount,
          info: data.info,
          notes: data.notes,
          goes_to_accounting: data.goes_to_accounting,
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          transport_type: data.transport_type,
          transport_price: data.transport_price,
          items: data.items,
        })
        acquisitionId = newAcquisition.id
      }

      // Note: Cash transaction and expense are now auto-created in mutation based on payment_status and cash_register_id

      closeDialog('acquisitions')

      // Open ticket print dialog after successful save
      if (acquisitionId && company) {
        // Fetch the full acquisition with all relations (vehicle, driver, supplier, items)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: savedAcquisition } = await (supabase as any)
          .from('acquisitions')
          .select(`
            *,
            supplier:suppliers(*),
            vehicle:vehicles(*),
            driver:drivers(*),
            items:acquisition_items(
              *,
              material:materials(*)
            )
          `)
          .eq('id', acquisitionId)
          .single()

        if (savedAcquisition) {
          const operatorName = profile?.full_name || profile?.email || 'Administrator'
          const ticketData = acquisitionToTicketData(savedAcquisition as AcquisitionWithDetails, company, operatorName)
          openTicketDialog(ticketData)
        }
      }
    } catch (error) {
      console.error('Error saving acquisition:', error)
      alert('Eroare la salvarea achizitiei: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEdit = (acquisition: AcquisitionWithDetails) => {
    openDialog('acquisitions', acquisition.id)
  }

  const handlePrintTicket = (acquisition: AcquisitionWithDetails) => {
    if (company) {
      const operatorName = profile?.full_name || profile?.email || 'Administrator'
      const ticketData = acquisitionToTicketData(acquisition, company, operatorName)
      openTicketDialog(ticketData)
    }
  }

  const handlePrintBorderou = (acquisition: AcquisitionWithDetails) => {
    setBorderouAcquisition(acquisition)
    setBorderouDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteAcquisition.mutateAsync({ id, companyId: companyId! })
      setDeleteConfirm('acquisitions', null)
    } catch (error) {
      console.error('Error deleting acquisition:', error)
      alert('Eroare la stergerea achizitiei')
    }
  }

  return (
    <div>
      <Header title="Achizitii" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista achizitii</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza achizitiile de materiale reciclabile
            </p>
          </div>
          <Button onClick={() => openDialog('acquisitions')}>
            <Plus className="mr-2 h-4 w-4" />
            Achizitie noua
          </Button>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Achizitii ({acquisitions.length})</CardTitle>
            {hiddenCount > 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {showHiddenAcquisitions ? (
                  <Eye className="h-4 w-4 text-orange-500" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span>
                  {showHiddenAcquisitions
                    ? `Se afiseaza toate (${hiddenCount} ascunse normal)`
                    : `${hiddenCount} ascunse`}
                </span>
                <span className="text-xs">(Ctrl+M)</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <AcquisitionTable
              acquisitions={acquisitions}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPrintTicket={handlePrintTicket}
              onPrintBorderou={handlePrintBorderou}
              deleteLoading={deleteAcquisition.isPending}
              showHiddenItems={showHiddenAcquisitions}
              companyId={companyId ?? null}
            />
          </CardContent>
        </Card>
      </div>

      {/* Acquisition Dialog */}
      <Dialog
        open={dialog.isOpen}
        onClose={() => closeDialog('acquisitions')}
        title={editingAcquisition ? 'Editeaza achizitia' : 'Achizitie noua'}
        maxWidth="4xl"
      >
        {companyId && (
          <AcquisitionForm
            companyId={companyId}
            acquisition={editingAcquisition}
            isLoading={createAcquisition.isPending || updateAcquisition.isPending || createCashTransaction.isPending}
            onSubmit={handleSubmit}
            onCancel={() => closeDialog('acquisitions')}
          />
        )}
      </Dialog>

      {/* Ticket Print Dialog */}
      <TicketPrintDialog
        isOpen={isTicketOpen}
        onClose={closeTicketDialog}
        ticketData={ticketData}
      />

      {/* Borderou Print Dialog */}
      <BorderouPrintDialog
        isOpen={borderouDialogOpen}
        onClose={() => {
          setBorderouDialogOpen(false)
          setBorderouAcquisition(null)
        }}
        acquisition={borderouAcquisition}
        company={company ?? null}
      />

      {/* Password Dialog for Hidden Acquisitions */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => {
          setPasswordDialogOpen(false)
          setPasswordInput('')
          setPasswordError('')
        }}
        title="Afiseaza achizitii ascunse"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Introduceti parola pentru a afisa achizitiile cu pret 0 sau donatii.
          </p>
          <div className="space-y-2">
            <Label htmlFor="password">Parola</Label>
            <Input
              id="password"
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError('')
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePasswordSubmit()
                }
              }}
              placeholder="Introduceti parola"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-red-500">{passwordError}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setPasswordDialogOpen(false)
                setPasswordInput('')
                setPasswordError('')
              }}
            >
              Anuleaza
            </Button>
            <Button onClick={handlePasswordSubmit}>
              Afiseaza
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
