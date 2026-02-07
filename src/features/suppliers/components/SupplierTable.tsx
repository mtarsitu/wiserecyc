import React, { useState } from 'react'
import {
  Badge,
  Button,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui'
import { Pencil, Trash2, Loader2, ChevronDown, ChevronRight, Scale, Package, Banknote, AlertCircle } from 'lucide-react'
import type { Supplier } from '@/types/database'
import type { SupplierBalance } from '../queries'

interface SupplierTableProps {
  suppliers: Supplier[]
  balances?: SupplierBalance[]
  deleteConfirmId: string | null
  isDeleting: boolean
  onEdit: (supplier: Supplier) => void
  onDeleteClick: (id: string) => void
  onDeleteConfirm: (id: string) => void
  onDeleteCancel: () => void
}

function SupplierTypeBadges({ supplier }: { supplier: Supplier }) {
  const badges = []
  if (supplier.is_contract) {
    badges.push(<Badge key="contract" variant="default" className="mr-1">Contract</Badge>)
  }
  if (supplier.is_punct_lucru) {
    badges.push(<Badge key="punct" variant="secondary" className="mr-1">Punct lucru</Badge>)
  }
  if (supplier.is_deee) {
    badges.push(<Badge key="deee" variant="outline" className="mr-1">DEEE</Badge>)
  }
  return badges.length > 0 ? <>{badges}</> : <span className="text-muted-foreground">-</span>
}

export function SupplierTable({
  suppliers,
  balances = [],
  deleteConfirmId,
  isDeleting,
  onEdit,
  onDeleteClick,
  onDeleteConfirm,
  onDeleteCancel,
}: SupplierTableProps) {
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({})

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Create a map for quick balance lookup
  const balanceMap = new Map(balances.map(b => [b.supplier_id, b]))

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: 'RON',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatKg = (kg: number) => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} tone`
    }
    return `${kg.toFixed(2)} kg`
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10"></TableHead>
          <TableHead>Nume</TableHead>
          <TableHead>CUI</TableHead>
          <TableHead>Localitate</TableHead>
          <TableHead>Tip</TableHead>
          <TableHead className="text-right">Sold</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actiuni</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {suppliers.map((supplier) => {
          const balance = balanceMap.get(supplier.id)
          const remaining = balance?.remaining || 0

          return (
            <React.Fragment key={supplier.id}>
              <TableRow className="cursor-pointer hover:bg-muted/50">
                <TableCell onClick={() => toggleRow(supplier.id)}>
                  {expandedRows[supplier.id] ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </TableCell>
                <TableCell className="font-medium" onClick={() => toggleRow(supplier.id)}>{supplier.name}</TableCell>
                <TableCell onClick={() => toggleRow(supplier.id)}>{supplier.cui || '-'}</TableCell>
                <TableCell onClick={() => toggleRow(supplier.id)}>
                  {supplier.city
                    ? `${supplier.city}${supplier.county ? `, ${supplier.county}` : ''}`
                    : '-'}
                </TableCell>
                <TableCell onClick={() => toggleRow(supplier.id)}><SupplierTypeBadges supplier={supplier} /></TableCell>
                <TableCell className="text-right" onClick={() => toggleRow(supplier.id)}>
                  {balance ? (
                    <div className="text-sm">
                      {remaining > 0 ? (
                        <span className="text-red-600 font-medium">
                          -{formatCurrency(remaining)}
                        </span>
                      ) : remaining < 0 ? (
                        <span className="text-green-600 font-medium">
                          +{formatCurrency(Math.abs(remaining))}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell onClick={() => toggleRow(supplier.id)}>
                  <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                    {supplier.is_active ? 'Activ' : 'Inactiv'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(supplier)} title="Editeaza">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {deleteConfirmId === supplier.id ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onDeleteConfirm(supplier.id)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Da'}
                        </Button>
                        <Button variant="outline" size="sm" onClick={onDeleteCancel}>
                          Nu
                        </Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => onDeleteClick(supplier.id)} title="Sterge">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
              {expandedRows[supplier.id] && (
                <TableRow>
                  <TableCell colSpan={8} className="bg-muted/30 p-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {/* Total KG */}
                      <div className="rounded-lg border p-3 bg-blue-50 dark:bg-blue-950/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Scale className="h-4 w-4 text-blue-600" />
                          <span className="text-xs font-medium text-blue-600">Total Achiziționat</span>
                        </div>
                        <p className="text-lg font-bold text-blue-700">{formatKg(balance?.total_kg || 0)}</p>
                      </div>

                      {/* Total RON */}
                      <div className="rounded-lg border p-3 bg-purple-50 dark:bg-purple-950/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="h-4 w-4 text-purple-600" />
                          <span className="text-xs font-medium text-purple-600">Valoare Totală</span>
                        </div>
                        <p className="text-lg font-bold text-purple-700">{formatCurrency(balance?.total_purchased || 0)}</p>
                      </div>

                      {/* Total Achitat */}
                      <div className="rounded-lg border p-3 bg-green-50 dark:bg-green-950/20">
                        <div className="flex items-center gap-2 mb-1">
                          <Banknote className="h-4 w-4 text-green-600" />
                          <span className="text-xs font-medium text-green-600">Total Achitat</span>
                        </div>
                        <p className="text-lg font-bold text-green-700">{formatCurrency(balance?.total_paid || 0)}</p>
                      </div>

                      {/* Rămas de plată */}
                      <div className={`rounded-lg border p-3 ${remaining > 0 ? 'bg-red-50 dark:bg-red-950/20' : 'bg-gray-50 dark:bg-gray-950/20'}`}>
                        <div className="flex items-center gap-2 mb-1">
                          <AlertCircle className={`h-4 w-4 ${remaining > 0 ? 'text-red-600' : 'text-gray-600'}`} />
                          <span className={`text-xs font-medium ${remaining > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            Rămas de Plată
                          </span>
                        </div>
                        <p className={`text-lg font-bold ${remaining > 0 ? 'text-red-700' : 'text-gray-700'}`}>
                          {formatCurrency(remaining)}
                        </p>
                      </div>
                    </div>

                    {/* Info suplimentar */}
                    {(supplier.phone || supplier.email || supplier.address) && (
                      <div className="mt-3 pt-3 border-t border-muted text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                        {supplier.phone && (
                          <p><span className="text-muted-foreground">Telefon:</span> {supplier.phone}</p>
                        )}
                        {supplier.email && (
                          <p><span className="text-muted-foreground">Email:</span> {supplier.email}</p>
                        )}
                        {supplier.address && (
                          <p><span className="text-muted-foreground">Adresa:</span> {supplier.address}</p>
                        )}
                      </div>
                    )}

                    {/* Preț mediu */}
                    {balance && balance.total_kg > 0 && (
                      <div className="mt-3 pt-3 border-t border-muted">
                        <p className="text-sm text-muted-foreground">
                          Preț mediu per kg: <span className="font-bold text-foreground">{formatCurrency(balance.total_purchased / balance.total_kg)}</span>
                        </p>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}
