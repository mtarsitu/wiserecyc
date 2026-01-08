import React, { useMemo } from 'react'
import {
  Button,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Input,
} from '@/components/ui'
import { Search, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Printer } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import type { AcquisitionWithDetails } from '../queries'
import { useState } from 'react'

interface AcquisitionTableProps {
  acquisitions: AcquisitionWithDetails[]
  isLoading: boolean
  onEdit: (acquisition: AcquisitionWithDetails) => void
  onDelete: (id: string) => void
  onPrintTicket: (acquisition: AcquisitionWithDetails) => void
  deleteLoading: boolean
  showHiddenItems?: boolean
}

const paymentStatusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  paid: { label: 'Platit', variant: 'default' },
  partial: { label: 'Partial', variant: 'secondary' },
  unpaid: { label: 'Neplatit', variant: 'destructive' },
}

export function AcquisitionTable({ acquisitions, isLoading, onEdit, onDelete, onPrintTicket, deleteLoading, showHiddenItems = false }: AcquisitionTableProps) {
  const searchQuery = useUIStore((s) => s.getSearchQuery('acquisitions'))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const deleteConfirm = useUIStore((s) => s.getDeleteConfirm('acquisitions'))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredAcquisitions = useMemo(() => {
    if (!searchQuery) return acquisitions
    const q = searchQuery.toLowerCase()
    return acquisitions.filter(
      (a) =>
        a.supplier?.name.toLowerCase().includes(q) ||
        a.receipt_number?.toLowerCase().includes(q) ||
        a.date.includes(q) ||
        a.items.some((item) => item.material?.name.toLowerCase().includes(q))
    )
  }, [acquisitions, searchQuery])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO')
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cauta achizitie..."
          value={searchQuery}
          onChange={(e) => setSearchQuery('acquisitions', e.target.value)}
          className="pl-8"
        />
      </div>

      {filteredAcquisitions.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nu exista achizitii inregistrate.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Furnizor</TableHead>
                <TableHead>Nr. bon</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAcquisitions.map((acquisition) => (
                <React.Fragment key={acquisition.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleRow(acquisition.id)}>
                      {expandedRows[acquisition.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(acquisition.id)}>
                      {formatDate(acquisition.date)}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(acquisition.id)}>
                      {acquisition.supplier?.name || '-'}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(acquisition.id)}>
                      {acquisition.receipt_number || '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium" onClick={() => toggleRow(acquisition.id)}>
                      {formatCurrency(acquisition.total_amount)}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(acquisition.id)}>
                      <Badge variant={paymentStatusLabels[acquisition.payment_status]?.variant || 'secondary'}>
                        {paymentStatusLabels[acquisition.payment_status]?.label || acquisition.payment_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onPrintTicket(acquisition)} title="Printeaza tichet">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(acquisition)} title="Editeaza">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteConfirm === acquisition.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDelete(acquisition.id)}
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm('acquisitions', null)}
                            >
                              Nu
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm('acquisitions', acquisition.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows[acquisition.id] && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Materiale achizitionate:</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left py-1">Material</th>
                                <th className="text-right py-1">Cantitate</th>
                                <th className="text-right py-1">Impuritati</th>
                                <th className="text-right py-1">Cant. finala</th>
                                <th className="text-right py-1">Pret/kg</th>
                                <th className="text-right py-1">Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {acquisition.items
                                .filter(item => showHiddenItems || (item.acquisition_type !== 'zero' && item.acquisition_type !== 'director'))
                                .map((item) => (
                                <tr key={item.id} className="border-t border-muted">
                                  <td className="py-1">{item.material?.name || '-'}</td>
                                  <td className="text-right py-1">{item.quantity.toFixed(2)} kg</td>
                                  <td className="text-right py-1">{item.impurities_percent}%</td>
                                  <td className="text-right py-1">{item.final_quantity.toFixed(2)} kg</td>
                                  <td className="text-right py-1">{item.price_per_kg.toFixed(2)} RON</td>
                                  <td className="text-right py-1 font-medium">{formatCurrency(item.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(acquisition.info || acquisition.notes) && (
                            <div className="mt-3 pt-3 border-t border-muted text-sm">
                              {acquisition.info && <p><span className="text-muted-foreground">Info:</span> {acquisition.info}</p>}
                              {acquisition.notes && <p><span className="text-muted-foreground">Obs:</span> {acquisition.notes}</p>}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
