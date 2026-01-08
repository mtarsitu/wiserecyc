import { useRef, useState, useEffect, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Dialog, Button } from '@/components/ui'
import { Printer, X } from 'lucide-react'
import { WeighingTicket } from './WeighingTicket'
import { DateTimeEditModal } from './DateTimeEditModal'
import type { TicketData } from '../types'

interface TicketPrintDialogProps {
  isOpen: boolean
  onClose: () => void
  ticketData: TicketData | null
}

export function TicketPrintDialog({ isOpen, onClose, ticketData }: TicketPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)
  const [editedDateTime, setEditedDateTime] = useState<{ date: string; timeBrut: string; timeTara: string } | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

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

  // Handle Ctrl+M / Cmd+M shortcut
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
      e.preventDefault()
      setIsEditModalOpen(true)
    }
  }, [])

  // Add/remove keyboard listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  const handleSaveDateTime = (date: string, timeBrut: string, timeTara: string) => {
    setEditedDateTime({ date, timeBrut, timeTara })
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

          {/* Edit indicator - shown when date/time was modified via Ctrl+M */}
          {editedDateTime && (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-md text-sm">
              Data/ora au fost modificate pentru printare:
              <strong> {editedDateTime.date} | Brut: {editedDateTime.timeBrut} | Tara: {editedDateTime.timeTara}</strong>
              <button
                className="ml-2 text-yellow-600 hover:text-yellow-800 underline"
                onClick={() => setEditedDateTime(null)}
              >
                Reseteaza
              </button>
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

      {/* Date/Time Edit Modal - accessible only via Ctrl+M / Cmd+M */}
      <DateTimeEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        currentDate={editedDateTime?.date || ticketData.weighingDate}
        currentTimeBrut={editedDateTime?.timeBrut || ticketData.weighingTimeBrut}
        currentTimeTara={editedDateTime?.timeTara || ticketData.weighingTimeTara}
        onSave={handleSaveDateTime}
      />
    </>
  )
}
