import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Header } from '@/components/layout'
import { Button, Card, CardContent, CardHeader, CardTitle, Dialog } from '@/components/ui'
import { Plus } from 'lucide-react'
import { useAuthContext } from '@/contexts/AuthContext'
import { useUIStore } from '@/stores/ui'
import { salesQueryOptions, type SaleWithDetails } from './queries'
import { useCreateSale, useUpdateSale, useDeleteSale } from './mutations'
import { useCreateCashTransaction } from '@/features/cashier/mutations'
import { SaleForm } from './components/SaleForm'
import { SaleTable } from './components/SaleTable'
import {
  TicketPrintDialog,
  AvizPrintDialog,
  Anexa3PrintDialog,
  usePrintTicket,
  saleToTicketData,
  saleToAvizData,
  saleToAnexa3Data,
  type AvizData,
  type Anexa3Data
} from '@/features/tickets'
import type { PaymentMethod, TransportType, SaleStatus, PaymentStatus } from '@/types/database'

export function SalesPage() {
  const { companyId, user, profile } = useAuthContext()
  const company = profile?.company

  // Ticket Print Hook
  const { isOpen: isTicketOpen, ticketData, openTicketDialog, closeTicketDialog } = usePrintTicket()

  // Aviz Print State
  const [isAvizOpen, setIsAvizOpen] = useState(false)
  const [avizData, setAvizData] = useState<AvizData | null>(null)

  // Anexa3 Print State
  const [isAnexa3Open, setIsAnexa3Open] = useState(false)
  const [anexa3Data, setAnexa3Data] = useState<Anexa3Data | null>(null)

  // UI Store
  const dialog = useUIStore((s) => s.getDialog('sales'))
  const openDialog = useUIStore((s) => s.openDialog)
  const closeDialog = useUIStore((s) => s.closeDialog)
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  // Query
  const { data: sales = [], isLoading } = useQuery(salesQueryOptions(companyId))

  // Mutations
  const createSale = useCreateSale()
  const updateSale = useUpdateSale()
  const deleteSale = useDeleteSale()
  const createCashTransaction = useCreateCashTransaction()

  // Current editing sale
  const editingSale = useMemo(() => {
    if (!dialog.editId) return null
    return sales.find((s) => s.id === dialog.editId) || null
  }, [dialog.editId, sales])

  // Handlers
  const handleSubmit = async (data: {
    date: string
    client_id: string
    payment_method: PaymentMethod | null
    payment_status: PaymentStatus
    partial_amount: number
    transport_type: TransportType | null
    transport_price: number
    vehicle_id: string | null
    driver_id: string | null
    scale_number: string
    notes: string
    status: SaleStatus
    cash_register_id: string | null
    total_amount: number
    items: {
      id?: string
      material_id: string
      quantity: number
      impurities_percent: number
      final_quantity: number
      price_per_ton_usd: number | null
      exchange_rate: number | null
      price_per_kg_ron: number
      line_total: number
    }[]
  }) => {
    try {
      let saleId: string | undefined

      if (editingSale) {
        await updateSale.mutateAsync({
          id: editingSale.id,
          date: data.date,
          client_id: data.client_id || null,
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          partial_amount: data.partial_amount,
          cash_register_id: data.cash_register_id,  // For expense + cash transaction
          transport_type: data.transport_type,
          transport_price: data.transport_price,
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          scale_number: data.scale_number,
          notes: data.notes,
          status: data.status,
          total_amount: data.total_amount,
          items: data.items,
        })
        saleId = editingSale.id
      } else {
        const newSale = await createSale.mutateAsync({
          company_id: companyId!,
          created_by: user?.id,
          date: data.date,
          client_id: data.client_id || null,
          payment_method: data.payment_method,
          payment_status: data.payment_status,
          partial_amount: data.partial_amount,
          cash_register_id: data.cash_register_id,  // For expense + cash transaction
          transport_type: data.transport_type,
          transport_price: data.transport_price,
          vehicle_id: data.vehicle_id,
          driver_id: data.driver_id,
          scale_number: data.scale_number,
          notes: data.notes,
          status: data.status,
          total_amount: data.total_amount,
          items: data.items,
        })
        saleId = newSale.id
      }

      // Note: Cash transaction and expense are now auto-created in mutation based on payment_status and cash_register_id

      closeDialog('sales')

      // Open ticket print dialog after successful save
      if (saleId && company) {
        // Fetch the full sale with relations (no FK joins for vehicle/driver yet)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: savedSale } = await (supabase as any)
          .from('sales')
          .select(`
            *,
            client:clients(*),
            transporter:transporters(*),
            items:sale_items(
              *,
              material:materials(*)
            )
          `)
          .eq('id', saleId)
          .single()

        if (savedSale) {
          // Fetch vehicle and driver separately since FK constraints may not exist yet
          let vehicle = null
          let driver = null

          if (savedSale.vehicle_id) {
            const { data: v } = await supabase
              .from('vehicles')
              .select('*')
              .eq('id', savedSale.vehicle_id)
              .single()
            vehicle = v
          }

          if (savedSale.driver_id) {
            const { data: d } = await supabase
              .from('drivers')
              .select('*')
              .eq('id', savedSale.driver_id)
              .single()
            driver = d
          }

          const saleWithRelations = { ...savedSale, vehicle, driver } as SaleWithDetails
          const ticketData = saleToTicketData(saleWithRelations, company)
          openTicketDialog(ticketData)
        }
      }
    } catch (error) {
      console.error('Error saving sale:', error)
      alert('Eroare la salvarea vanzarii: ' + (error instanceof Error ? error.message : 'Unknown error'))
    }
  }

  const handleEdit = (sale: SaleWithDetails) => {
    openDialog('sales', sale.id)
  }

  const handlePrintTicket = (sale: SaleWithDetails) => {
    if (company) {
      const ticketData = saleToTicketData(sale, company)
      openTicketDialog(ticketData)
    }
  }

  const handlePrintAviz = (sale: SaleWithDetails) => {
    if (company) {
      const data = saleToAvizData(sale, company)
      setAvizData(data)
      setIsAvizOpen(true)
    }
  }

  const handlePrintAnexa3 = (sale: SaleWithDetails) => {
    if (company) {
      const data = saleToAnexa3Data(sale, company)
      setAnexa3Data(data)
      setIsAnexa3Open(true)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteSale.mutateAsync({ id, companyId: companyId! })
      setDeleteConfirm('sales', null)
    } catch (error) {
      console.error('Error deleting sale:', error)
      alert('Eroare la stergerea vanzarii')
    }
  }

  return (
    <div>
      <Header title="Vanzari" />
      <div className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Lista vanzari</h2>
            <p className="text-sm text-muted-foreground">
              Gestioneaza vanzarile de materiale reciclabile
            </p>
          </div>
          <Button onClick={() => openDialog('sales')}>
            <Plus className="mr-2 h-4 w-4" />
            Vanzare noua
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Vanzari ({sales.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <SaleTable
              sales={sales}
              isLoading={isLoading}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onPrintTicket={handlePrintTicket}
              onPrintAviz={handlePrintAviz}
              onPrintAnexa3={handlePrintAnexa3}
              deleteLoading={deleteSale.isPending}
            />
          </CardContent>
        </Card>
      </div>

      {/* Sale Dialog */}
      <Dialog
        open={dialog.isOpen}
        onClose={() => closeDialog('sales')}
        title={editingSale ? 'Editeaza vanzarea' : 'Vanzare noua'}
        maxWidth="4xl"
      >
        {companyId && (
          <SaleForm
            companyId={companyId}
            sale={editingSale}
            isLoading={createSale.isPending || updateSale.isPending || createCashTransaction.isPending}
            onSubmit={handleSubmit}
            onCancel={() => closeDialog('sales')}
          />
        )}
      </Dialog>

      {/* Ticket Print Dialog */}
      <TicketPrintDialog
        isOpen={isTicketOpen}
        onClose={closeTicketDialog}
        ticketData={ticketData}
      />

      {/* Aviz Print Dialog */}
      <AvizPrintDialog
        isOpen={isAvizOpen}
        onClose={() => setIsAvizOpen(false)}
        avizData={avizData}
      />

      {/* Anexa3 Print Dialog */}
      <Anexa3PrintDialog
        isOpen={isAnexa3Open}
        onClose={() => setIsAnexa3Open(false)}
        anexa3Data={anexa3Data}
      />
    </div>
  )
}
