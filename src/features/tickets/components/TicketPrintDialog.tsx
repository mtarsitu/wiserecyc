import { useRef, useState, useEffect, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Dialog, Button, Input, Label } from '@/components/ui'
import { Printer, X } from 'lucide-react'
import { WeighingTicket } from './WeighingTicket'
import { DateTimeEditModal } from './DateTimeEditModal'
import type { TicketData } from '../types'

// Password for hidden edit functionality
const EDIT_PASSWORD = '1234'

interface EditedItemTime {
  timeBrut: string
  timeTara: string
  dateBrut: string
  dateTara: string
}

interface EditedDateTime {
  date: string
  timeBrut: string
  timeTara: string
  items?: Record<number, EditedItemTime>
}

interface TicketPrintDialogProps {
  isOpen: boolean
  onClose: () => void
  ticketData: TicketData | null
}

export function TicketPrintDialog({ isOpen, onClose, ticketData }: TicketPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [editedDateTime, setEditedDateTime] = useState<EditedDateTime | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)

  // React to print hook
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: ticketData ? `Tichet-${ticketData.ticketNumber}` : 'Tichet',
    onAfterPrint: () => {
      // Optionally close dialog after print
    }
  })

  // Reset edited datetime when dialog opens with new data
  useEffect(() => {
    if (isOpen && ticketData) {
      setEditedDateTime(null)
    }
  }, [isOpen, ticketData])

  // Handle Ctrl+Shift+H / Cmd+Shift+H shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'h' || e.key === 'H')) {
      e.preventDefault()
      e.stopPropagation()
      setShowPasswordDialog(true)
      setPasswordInput('')
      setPasswordError(false)
    }
  }, [])

  const handlePasswordSubmit = () => {
    if (passwordInput === EDIT_PASSWORD) {
      setShowPasswordDialog(false)
      setIsEditModalOpen(true)
      setPasswordInput('')
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  // Add/remove keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleSaveDateTime = (date: string, timeBrut: string, timeTara: string, itemTimes?: Record<number, EditedItemTime>) => {
    setEditedDateTime({ date, timeBrut, timeTara, items: itemTimes })
  }

  if (!ticketData) return null

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={onClose}
        title="Tichet de Cantar"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pb-4 border-b">
              <Button
                variant="default"
                size="sm"
                onClick={() => handlePrint()}
              >
                <Printer className="mr-2 h-4 w-4" />
                Printeaza
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
              >
                <X className="mr-2 h-4 w-4" />
                Inchide
              </Button>
          </div>

          {/* Edit indicator - shown when date/time was modified via Ctrl+Shift+H */}
          {editedDateTime && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm">
              <div className="flex items-center justify-between">
                <span>
                  Data/ora au fost modificate pentru printare
                  {editedDateTime.items && Object.keys(editedDateTime.items).length > 0
                    ? ` (${Object.keys(editedDateTime.items).length} materiale)`
                    : `: ${editedDateTime.date} | Brut: ${editedDateTime.timeBrut} | Tara: ${editedDateTime.timeTara}`
                  }
                </span>
                <button
                  className="text-yellow-600 hover:text-yellow-800 underline"
                  onClick={() => setEditedDateTime(null)}
                >
                  Reseteaza
                </button>
              </div>
            </div>
          )}

          {/* Print preview - 2 tickets on one page */}
          <div
            ref={printRef}
            className="print-container bg-white"
          >
            {/* First ticket - Original */}
            <div className="ticket-page-half">
              <WeighingTicket
                data={ticketData}
                editedDateTime={editedDateTime}
                copy="original"
              />
            </div>

            {/* Separator line for preview */}
            <div className="ticket-separator no-print">
              <span>--- Linie de taiere ---</span>
            </div>

            {/* Second ticket - Copy */}
            <div className="ticket-page-half">
              <WeighingTicket
                data={ticketData}
                editedDateTime={editedDateTime}
                copy="copy"
              />
            </div>
          </div>
        </div>

        <style>{`
          .print-container {
            display: flex;
            flex-direction: column;
            gap: 10mm;
            padding: 5mm;
            max-height: 70vh;
            overflow-y: auto;
          }

          .ticket-page-half {
            flex: 0 0 auto;
          }

          .ticket-separator {
            text-align: center;
            color: #999;
            font-size: 10px;
            border-top: 1px dashed #ccc;
            padding: 5mm 0;
          }

          @media print {
            .print-container {
              max-height: none;
              overflow: visible;
              padding: 0;
              gap: 0;
            }

            .ticket-page-half {
              height: 50vh;
              page-break-inside: avoid;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .ticket-separator {
              display: none;
            }

            .no-print {
              display: none !important;
            }

            @page {
              size: A4 portrait;
              margin: 10mm;
            }
          }
        `}</style>
      </Dialog>

      {/* Password Dialog for Edit Access */}
      <Dialog
        open={showPasswordDialog}
        onClose={() => {
          setShowPasswordDialog(false)
          setPasswordInput('')
          setPasswordError(false)
        }}
        title="Acces editare dată/oră"
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Introduceți parola pentru a modifica data și ora de pe tichet.
          </p>
          <div className="space-y-2">
            <Label htmlFor="ticket-password">Parolă</Label>
            <Input
              id="ticket-password"
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value)
                setPasswordError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handlePasswordSubmit()
                }
              }}
              placeholder="Introduceți parola"
              autoFocus
            />
            {passwordError && (
              <p className="text-sm text-destructive">Parolă incorectă</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false)
                setPasswordInput('')
                setPasswordError(false)
              }}
            >
              Anulează
            </Button>
            <Button type="button" onClick={handlePasswordSubmit}>
              Confirmă
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Date/Time Edit Modal - accessible only via Ctrl+Shift+H with password */}
      <DateTimeEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentDate={editedDateTime?.date || ticketData.weighingDate}
        currentTimeBrut={editedDateTime?.timeBrut || ticketData.weighingTimeBrut}
        currentTimeTara={editedDateTime?.timeTara || ticketData.weighingTimeTara}
        items={ticketData.items}
        onSave={handleSaveDateTime}
      />
    </>
  )
}
