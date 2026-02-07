import { useRef } from 'react'
import { Dialog, Button } from '@/components/ui'
import { Printer } from 'lucide-react'
import type { AcquisitionWithDetails } from '../queries'

interface Company {
  name: string
  cui?: string | null
  reg_com?: string | null
  address?: string | null
  city?: string | null
  county?: string | null
  phone?: string | null
  email?: string | null
  environment_auth?: string | null
}

interface BorderouPrintDialogProps {
  isOpen: boolean
  onClose: () => void
  acquisition: AcquisitionWithDetails | null
  company: Company | null
}

export function BorderouPrintDialog({ isOpen, onClose, acquisition, company }: BorderouPrintDialogProps) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!acquisition || !company) return null

  const handlePrint = () => {
    const printContent = printRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Borderou de Achiziție - ${acquisition.receipt_number || acquisition.id.slice(0, 8)}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', Times, serif;
              font-size: 11pt;
              line-height: 1.4;
              padding: 15mm;
              color: #000;
            }
            .header { text-align: center; margin-bottom: 20px; }
            .header h1 { font-size: 16pt; font-weight: bold; margin-bottom: 5px; }
            .header .subtitle { font-size: 10pt; color: #666; }

            .parties { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .party { width: 48%; }
            .party h3 { font-size: 11pt; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 3px; margin-bottom: 8px; }
            .party p { font-size: 10pt; margin: 2px 0; }
            .party .label { font-weight: bold; }

            .doc-info { text-align: right; margin-bottom: 15px; font-size: 10pt; }

            table { width: 100%; border-collapse: collapse; margin: 15px 0; }
            th, td { border: 1px solid #000; padding: 6px 8px; text-align: left; font-size: 10pt; }
            th { background: #f0f0f0; font-weight: bold; }
            td.number { text-align: right; font-family: 'Courier New', monospace; }
            tfoot td { font-weight: bold; background: #f5f5f5; }

            .taxes { margin: 15px 0; padding: 10px; border: 1px solid #ccc; background: #fafafa; }
            .taxes h4 { font-size: 11pt; margin-bottom: 8px; }
            .taxes .row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 10pt; }
            .taxes .total { border-top: 1px solid #000; padding-top: 5px; margin-top: 8px; font-weight: bold; }

            .declaration { margin: 20px 0; padding: 15px; border: 2px solid #000; }
            .declaration h4 { font-size: 11pt; font-weight: bold; margin-bottom: 10px; text-align: center; }
            .declaration p { font-size: 10pt; margin: 8px 0; text-align: justify; }
            .declaration .checkbox { margin: 5px 0; }
            .declaration .checkbox::before { content: "☐ "; }

            .signatures { display: flex; justify-content: space-between; margin-top: 40px; }
            .signature { width: 30%; text-align: center; }
            .signature .line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
            .signature .name { font-size: 10pt; font-weight: bold; }
            .signature .role { font-size: 9pt; color: #666; }

            .footer { margin-top: 30px; font-size: 9pt; color: #666; text-align: center; border-top: 1px solid #ccc; padding-top: 10px; }

            @media print {
              body { padding: 10mm; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  // Calculate totals
  const totalQuantity = acquisition.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0
  const totalImpurities = acquisition.items?.reduce((sum, item) => {
    const impKg = (item.quantity || 0) * (item.impurities_percent || 0) / 100
    return sum + impKg
  }, 0) || 0
  const totalFinalQuantity = acquisition.items?.reduce((sum, item) => sum + (item.final_quantity || 0), 0) || 0
  const totalAmount = acquisition.total_amount || 0

  // Tax calculations
  const isNaturalPerson = !acquisition.supplier?.cui || /^\d{13}$/.test(acquisition.supplier?.cui || '')
  const environmentFund = acquisition.environment_fund || (totalAmount * 0.02)
  const incomeTax = isNaturalPerson ? totalAmount * 0.10 : 0
  const totalObligations = totalAmount + environmentFund + incomeTax

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('ro-RO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title="Previzualizare Borderou de Achiziție"
      maxWidth="4xl"
    >
      <div className="space-y-4">
        {/* Print button */}
        <div className="flex justify-end no-print">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Printează
          </Button>
        </div>

        {/* Print content */}
        <div
          ref={printRef}
          className="bg-white p-6 border rounded-lg text-black"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold">BORDEROU DE ACHIZIȚIE</h1>
            <p className="text-sm text-gray-600">
              (conform OMFP 2634/2015 - cod 14-4-13)
            </p>
          </div>

          {/* Document info */}
          <div className="text-right mb-4 text-sm">
            <p><strong>Nr.:</strong> {acquisition.receipt_number || acquisition.id.slice(0, 8)}</p>
            <p><strong>Data:</strong> {formatDate(acquisition.date)}</p>
          </div>

          {/* Parties */}
          <div className="flex justify-between mb-6">
            {/* Buyer */}
            <div className="w-[48%]">
              <h3 className="font-bold border-b border-black pb-1 mb-2">CUMPĂRĂTOR</h3>
              <p className="text-sm"><span className="font-semibold">Denumire:</span> {company.name}</p>
              <p className="text-sm"><span className="font-semibold">CUI:</span> {company.cui || '-'}</p>
              <p className="text-sm"><span className="font-semibold">Reg. Com.:</span> {company.reg_com || '-'}</p>
              <p className="text-sm"><span className="font-semibold">Sediu:</span> {[company.address, company.city, company.county].filter(Boolean).join(', ') || '-'}</p>
              {company.environment_auth && (
                <p className="text-sm"><span className="font-semibold">Aut. mediu:</span> {company.environment_auth}</p>
              )}
            </div>

            {/* Seller */}
            <div className="w-[48%]">
              <h3 className="font-bold border-b border-black pb-1 mb-2">VÂNZĂTOR</h3>
              <p className="text-sm"><span className="font-semibold">Nume:</span> {acquisition.supplier?.name || '-'}</p>
              <p className="text-sm"><span className="font-semibold">CNP/CUI:</span> {acquisition.supplier?.cui || '-'}</p>
              <p className="text-sm"><span className="font-semibold">Adresă:</span> {[acquisition.supplier?.address, acquisition.supplier?.city, acquisition.supplier?.county].filter(Boolean).join(', ') || '-'}</p>
              <p className="text-sm"><span className="font-semibold">Telefon:</span> {acquisition.supplier?.phone || '-'}</p>
              <p className="text-sm">
                <span className="font-semibold">Tip:</span> {isNaturalPerson ? 'Persoană fizică' : 'Persoană juridică'}
              </p>
            </div>
          </div>

          {/* Materials table */}
          <table className="w-full border-collapse text-sm mb-4">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left">Nr.</th>
                <th className="border border-black p-2 text-left">Denumire material</th>
                <th className="border border-black p-2 text-right">Cant. brută (kg)</th>
                <th className="border border-black p-2 text-right">Impurități (kg)</th>
                <th className="border border-black p-2 text-right">Cant. netă (kg)</th>
                <th className="border border-black p-2 text-right">Preț/kg (RON)</th>
                <th className="border border-black p-2 text-right">Valoare (RON)</th>
              </tr>
            </thead>
            <tbody>
              {acquisition.items?.map((item, idx) => {
                const impKg = (item.quantity || 0) * (item.impurities_percent || 0) / 100
                return (
                  <tr key={item.id || idx}>
                    <td className="border border-black p-2">{idx + 1}</td>
                    <td className="border border-black p-2">{item.material?.name || '-'}</td>
                    <td className="border border-black p-2 text-right font-mono">{formatNumber(item.quantity || 0)}</td>
                    <td className="border border-black p-2 text-right font-mono">{formatNumber(impKg)}</td>
                    <td className="border border-black p-2 text-right font-mono">{formatNumber(item.final_quantity || 0)}</td>
                    <td className="border border-black p-2 text-right font-mono">{formatNumber(item.price_per_kg || 0)}</td>
                    <td className="border border-black p-2 text-right font-mono">{formatNumber(item.line_total || 0)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td colSpan={2} className="border border-black p-2">TOTAL</td>
                <td className="border border-black p-2 text-right font-mono">{formatNumber(totalQuantity)}</td>
                <td className="border border-black p-2 text-right font-mono">{formatNumber(totalImpurities)}</td>
                <td className="border border-black p-2 text-right font-mono">{formatNumber(totalFinalQuantity)}</td>
                <td className="border border-black p-2">-</td>
                <td className="border border-black p-2 text-right font-mono">{formatNumber(totalAmount)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Tax calculations */}
          <div className="border border-gray-400 p-3 bg-gray-50 mb-4">
            <h4 className="font-bold mb-2">Calcul taxe și contribuții:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between">
                <span>Valoare achiziție:</span>
                <span className="font-mono font-semibold">{formatNumber(totalAmount)} RON</span>
              </div>
              <div className="flex justify-between">
                <span>Fond mediu 2% (OUG 196/2005):</span>
                <span className="font-mono font-semibold">{formatNumber(environmentFund)} RON</span>
              </div>
              {isNaturalPerson && (
                <div className="flex justify-between">
                  <span>Impozit venit 10% (Cod Fiscal):</span>
                  <span className="font-mono font-semibold">{formatNumber(incomeTax)} RON</span>
                </div>
              )}
              <div className="flex justify-between border-t border-gray-400 pt-2 col-span-2">
                <span className="font-bold">Sumă plătită vânzătorului:</span>
                <span className="font-mono font-bold text-lg">{formatNumber(totalAmount)} RON</span>
              </div>
            </div>
          </div>

          {/* Declaration */}
          <div className="border-2 border-black p-4 mb-6">
            <h4 className="font-bold text-center mb-3">DECLARAȚIE PE PROPRIE RĂSPUNDERE</h4>
            <p className="text-sm mb-3 text-justify">
              Subsemnatul/a <strong>{acquisition.supplier?.name || '________________________'}</strong>,
              identificat/ă cu {acquisition.supplier?.cui ? `CNP/CUI ${acquisition.supplier.cui}` : 'CI seria ____ nr. ________'},
              domiciliat/ă în {acquisition.supplier?.address || '________________________'},
              declar pe proprie răspundere următoarele:
            </p>
            <div className="text-sm space-y-2 ml-4">
              <p>☐ Bunurile vândute fac parte din patrimoniul meu personal și nu au fost achiziționate în scopul revânzării;</p>
              <p>☐ Bunurile au proveniență legală și nu fac obiectul niciunui litigiu;</p>
              <p>☐ Am luat la cunoștință că vânzarea acestor bunuri atrage obligații fiscale conform legislației în vigoare;</p>
              <p>☐ Înțeleg că declarația falsă constituie infracțiune și se pedepsește conform Codului Penal.</p>
            </div>
            <p className="text-sm mt-3 text-justify">
              Am primit suma de <strong>{formatNumber(totalAmount)} RON</strong> reprezentând contravaloarea bunurilor menționate mai sus.
            </p>
          </div>

          {/* Signatures */}
          <div className="flex justify-between mt-10">
            <div className="w-[30%] text-center">
              <p className="font-bold">CUMPĂRĂTOR</p>
              <p className="text-sm text-gray-600">(semnătura și ștampila)</p>
              <div className="border-t border-black mt-12 pt-2">
                <p className="text-sm">{company.name}</p>
              </div>
            </div>
            <div className="w-[30%] text-center">
              <p className="font-bold">VÂNZĂTOR</p>
              <p className="text-sm text-gray-600">(semnătura)</p>
              <div className="border-t border-black mt-12 pt-2">
                <p className="text-sm">{acquisition.supplier?.name || '-'}</p>
              </div>
            </div>
            <div className="w-[30%] text-center">
              <p className="font-bold">GESTIONAR</p>
              <p className="text-sm text-gray-600">(semnătura)</p>
              <div className="border-t border-black mt-12 pt-2">
                <p className="text-sm">________________</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-3 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>Document generat conform OMFP 2634/2015 | OUG 92/2021 privind regimul deșeurilor</p>
            <p>Termen de păstrare: 5 ani de la încheierea exercițiului financiar</p>
          </div>
        </div>

        {/* Close button */}
        <div className="flex justify-end gap-2 no-print">
          <Button variant="outline" onClick={onClose}>
            Închide
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
