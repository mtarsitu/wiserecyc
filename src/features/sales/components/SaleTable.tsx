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
import { Search, Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Printer, FileText, ClipboardList } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import type { SaleWithDetails } from '../queries'
import { useState } from 'react'

interface SaleTableProps {
  sales: SaleWithDetails[]
  isLoading: boolean
  onEdit: (sale: SaleWithDetails) => void
  onDelete: (id: string) => void
  onPrintTicket: (sale: SaleWithDetails) => void
  onPrintAviz: (sale: SaleWithDetails) => void
  onPrintAnexa3: (sale: SaleWithDetails) => void
  deleteLoading: boolean
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pending: { label: 'In asteptare', variant: 'secondary' },
  reception_done: { label: 'Receptie efectuata', variant: 'default' },
  cancelled: { label: 'Anulat', variant: 'destructive' },
}

const paymentMethodLabels: Record<string, string> = {
  bank: 'Virament',
  cash: 'Numerar',
}

export function SaleTable({ sales, isLoading, onEdit, onDelete, onPrintTicket, onPrintAviz, onPrintAnexa3, deleteLoading }: SaleTableProps) {
  const searchQuery = useUIStore((s) => s.getSearchQuery('sales'))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const deleteConfirm = useUIStore((s) => s.getDeleteConfirm('sales'))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredSales = useMemo(() => {
    if (!searchQuery) return sales
    const q = searchQuery.toLowerCase()
    return sales.filter(
      (s) =>
        s.client?.name.toLowerCase().includes(q) ||
        s.scale_number?.toLowerCase().includes(q) ||
        s.date.includes(q) ||
        s.items.some((item) => item.material?.name.toLowerCase().includes(q))
    )
  }, [sales, searchQuery])

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
          placeholder="Cauta vanzare..."
          value={searchQuery}
          onChange={(e) => setSearchQuery('sales', e.target.value)}
          className="pl-8"
        />
      </div>

      {filteredSales.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nu exista vanzari inregistrate.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Plata</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <React.Fragment key={sale.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleRow(sale.id)}>
                      {expandedRows[sale.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(sale.id)}>
                      {formatDate(sale.date)}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(sale.id)}>
                      {sale.client?.name || '-'}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(sale.id)}>
                      {sale.payment_method ? paymentMethodLabels[sale.payment_method] : '-'}
                    </TableCell>
                    <TableCell className="text-right font-medium" onClick={() => toggleRow(sale.id)}>
                      {formatCurrency(sale.total_amount)}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(sale.id)}>
                      <Badge variant={statusLabels[sale.status]?.variant || 'secondary'}>
                        {statusLabels[sale.status]?.label || sale.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => onPrintTicket(sale)} title="Printeaza tichet">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onPrintAviz(sale)} title="Aviz de insotire">
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onPrintAnexa3(sale)} title="Anexa 3 - Formular deseuri">
                          <ClipboardList className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onEdit(sale)} title="Editeaza">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteConfirm === sale.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => onDelete(sale.id)}
                              disabled={deleteLoading}
                            >
                              {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteConfirm('sales', null)}
                            >
                              Nu
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteConfirm('sales', sale.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedRows[sale.id] && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Materiale vandute:</p>
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
                              {sale.items.map((item) => (
                                <tr key={item.id} className="border-t border-muted">
                                  <td className="py-1">{item.material?.name || '-'}</td>
                                  <td className="text-right py-1">{item.quantity.toFixed(2)} kg</td>
                                  <td className="text-right py-1">{item.impurities_percent}%</td>
                                  <td className="text-right py-1">{item.final_quantity.toFixed(2)} kg</td>
                                  <td className="text-right py-1">{item.price_per_kg_ron.toFixed(2)} RON</td>
                                  <td className="text-right py-1 font-medium">{formatCurrency(item.line_total)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {(sale.scale_number || sale.notes || sale.transport_price > 0) && (
                            <div className="mt-3 pt-3 border-t border-muted text-sm space-y-1">
                              {sale.scale_number && <p><span className="text-muted-foreground">Nr. cantar:</span> {sale.scale_number}</p>}
                              {sale.transport_price > 0 && <p><span className="text-muted-foreground">Cost transport:</span> {formatCurrency(sale.transport_price)}</p>}
                              {sale.notes && <p><span className="text-muted-foreground">Obs:</span> {sale.notes}</p>}
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
