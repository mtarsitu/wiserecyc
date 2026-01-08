import { useRef } from 'react'
import { useReactToPrint } from 'react-to-print'
import { Dialog, Button } from '@/components/ui'
import { Printer, X } from 'lucide-react'
import { AvizDocument } from './AvizDocument'
import type { AvizData } from '../types'

interface AvizPrintDialogProps {
  isOpen: boolean
  onClose: () => void
  avizData: AvizData | null
}

export function AvizPrintDialog({ isOpen, onClose, avizData }: AvizPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: avizData ? `Aviz-${avizData.avizNumber}` : 'Aviz',
    onAfterPrint: () => {
      // Optionally close dialog after print
    }
  })

  if (!avizData) return null

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Aviz de Insotire a Marfii"
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
          className="aviz-print-container bg-white"
        >
          <AvizDocument data={avizData} />
        </div>
      </div>

      <style>{`
        .aviz-print-container {
          padding: 5mm;
          max-height: 70vh;
          overflow-y: auto;
        }

        @media print {
          .aviz-print-container {
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
