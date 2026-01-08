import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Dialog, Button } from '@/components/ui'
import { Printer, X } from 'lucide-react'
import { Anexa3Document } from './Anexa3Document'
import type { Anexa3Data } from '../types'

interface Anexa3PrintDialogProps {
  isOpen: boolean
  onClose: () => void
  anexa3Data: Anexa3Data | null
}

export function Anexa3PrintDialog({ isOpen, onClose, anexa3Data }: Anexa3PrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: anexa3Data ? `Anexa3-${anexa3Data.seria}-${anexa3Data.numar}` : 'Anexa3',
    onAfterPrint: () => {
      // Optionally close dialog after print
    }
  })

  if (!anexa3Data) return null

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Anexa 3 - Formular Incarcare-Descarcare Deseuri"
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

        {/* Print preview */}
        <div
          ref={printRef}
          className="anexa3-print-container bg-white"
        >
          <Anexa3Document data={anexa3Data} />
        </div>
      </div>

      <style>{`
        .anexa3-print-container {
          padding: 5mm;
          max-height: 70vh;
          overflow-y: auto;
        }

        @media print {
          .anexa3-print-container {
            max-height: none;
            overflow: visible;
            padding: 0;
          }

          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </Dialog>
  )
}
