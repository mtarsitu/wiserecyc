import React, { useMemo, useState } from 'react'
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
import { Search, Trash2, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/stores/ui'
import type { DismantlingWithDetails } from '../queries'

interface DismantlingTableProps {
  dismantlings: DismantlingWithDetails[]
  isLoading: boolean
  onDelete: (id: string) => void
  deleteLoading: boolean
}

const locationLabels: Record<string, string> = {
  curte: 'Curte',
  contract: 'Contract',
  deee: 'DEEE',
}

export function DismantlingTable({ dismantlings, isLoading, onDelete, deleteLoading }: DismantlingTableProps) {
  const searchQuery = useUIStore((s) => s.getSearchQuery('dismantlings'))
  const setSearchQuery = useUIStore((s) => s.setSearchQuery)
  const deleteConfirm = useUIStore((s) => s.getDeleteConfirm('dismantlings'))
  const setDeleteConfirm = useUIStore((s) => s.setDeleteConfirm)

  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const filteredDismantlings = useMemo(() => {
    if (!searchQuery) return dismantlings
    const q = searchQuery.toLowerCase()
    return dismantlings.filter(
      (d) =>
        d.source_material?.name.toLowerCase().includes(q) ||
        d.date.includes(q) ||
        d.outputs.some((o) => o.material?.name.toLowerCase().includes(q))
    )
  }, [dismantlings, searchQuery])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO')
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
          placeholder="Caută dezmembrare..."
          value={searchQuery}
          onChange={(e) => setSearchQuery('dismantlings', e.target.value)}
          className="pl-8"
        />
      </div>

      {filteredDismantlings.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nu există dezmembrări înregistrate.
        </p>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Material sursă</TableHead>
                <TableHead className="text-right">Cantitate</TableHead>
                <TableHead>Locație</TableHead>
                <TableHead>Materiale rezultate</TableHead>
                <TableHead className="text-right">Acțiuni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDismantlings.map((dismantling) => (
                <React.Fragment key={dismantling.id}>
                  <TableRow className="cursor-pointer hover:bg-muted/50">
                    <TableCell onClick={() => toggleRow(dismantling.id)}>
                      {expandedRows[dismantling.id] ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(dismantling.id)}>
                      {formatDate(dismantling.date)}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(dismantling.id)}>
                      <span className="font-medium">{dismantling.source_material?.name || '-'}</span>
                    </TableCell>
                    <TableCell className="text-right" onClick={() => toggleRow(dismantling.id)}>
                      {dismantling.source_quantity.toFixed(2)} kg
                    </TableCell>
                    <TableCell onClick={() => toggleRow(dismantling.id)}>
                      <Badge variant="secondary">
                        {locationLabels[dismantling.location_type] || dismantling.location_type}
                      </Badge>
                      {dismantling.contract && (
                        <span className="ml-1 text-xs text-muted-foreground">
                          ({dismantling.contract.contract_number})
                        </span>
                      )}
                    </TableCell>
                    <TableCell onClick={() => toggleRow(dismantling.id)}>
                      <span className="text-sm text-muted-foreground">
                        {dismantling.outputs.length} material(e)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {deleteConfirm === dismantling.id ? (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => onDelete(dismantling.id)}
                            disabled={deleteLoading}
                          >
                            {deleteLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setDeleteConfirm('dismantlings', null)}
                          >
                            Nu
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm('dismantlings', dismantling.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  {expandedRows[dismantling.id] && (
                    <TableRow>
                      <TableCell colSpan={7} className="bg-muted/30 p-4">
                        <div className="space-y-3">
                          <p className="text-sm font-medium">Materiale rezultate din dezmembrare:</p>
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left py-1">Material</th>
                                <th className="text-right py-1">Cantitate</th>
                                <th className="text-left py-1">Observații</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dismantling.outputs.map((output) => (
                                <tr key={output.id} className="border-t border-muted">
                                  <td className="py-1">{output.material?.name || '-'}</td>
                                  <td className="text-right py-1">{output.quantity.toFixed(2)} kg</td>
                                  <td className="py-1 text-muted-foreground">{output.notes || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="border-t-2 border-muted font-medium">
                                <td className="py-1">Total rezultat</td>
                                <td className="text-right py-1">
                                  {dismantling.outputs.reduce((sum, o) => sum + o.quantity, 0).toFixed(2)} kg
                                </td>
                                <td></td>
                              </tr>
                              <tr className="text-muted-foreground">
                                <td className="py-1">Diferență (pierderi)</td>
                                <td className="text-right py-1">
                                  {(dismantling.source_quantity - dismantling.outputs.reduce((sum, o) => sum + o.quantity, 0)).toFixed(2)} kg
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                          {dismantling.notes && (
                            <div className="mt-2 pt-2 border-t border-muted text-sm">
                              <span className="text-muted-foreground">Obs:</span> {dismantling.notes}
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
