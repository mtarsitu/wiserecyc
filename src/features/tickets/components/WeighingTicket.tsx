import { forwardRef } from 'react'
import type { TicketData } from '../types'
import { formatDate } from '../utils/ticketNumber'

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

interface WeighingTicketProps {
  data: TicketData
  editedDateTime?: EditedDateTime | null
  copy?: 'original' | 'copy'
}

export const WeighingTicket = forwardRef<HTMLDivElement, WeighingTicketProps>(
  function WeighingTicket({ data, editedDateTime, copy = 'original' }, ref) {
    const displayDate = editedDateTime?.date || data.weighingDate
    const displayTimeBrut = editedDateTime?.timeBrut || data.weighingTimeBrut
    const displayTimeTara = editedDateTime?.timeTara || data.weighingTimeTara

    const formatNumber = (num: number | null | undefined) => {
      if (num === null || num === undefined) return '-'
      return new Intl.NumberFormat('ro-RO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(num)
    }

    const now = new Date()
    const printDate = formatDate(now.toISOString().split('T')[0])
    const printTime = now.toLocaleTimeString('ro-RO')

    // Build material description from items if not provided
    const materialDescription = data.materialDescription ||
      data.items.map(item => item.materialName).join(', ')

    // For acquisitions: Furnizor = partner (supplier), Client = company (us)
    // For sales: Furnizor = company (us), Client = client
    const furnizor = data.type === 'acquisition' ? data.partner : {
      name: data.company.name,
      cui: data.company.cui,
      regCom: data.company.regCom,
      address: data.company.address,
      city: data.company.city,
      county: data.company.county,
    }

    const client = data.type === 'acquisition' ? {
      name: data.company.name,
      cui: data.company.cui,
    } : (data.client || data.partner)

    return (
      <div ref={ref} className="ticket-wrapper">
        <div className="ticket">
          {/* Supplier Section */}
          <div className="supplier-section">
            <div className="supplier-row">
              <span className="supplier-label">Furnizor:</span>
              <span className="supplier-value">{furnizor.name}</span>
            </div>
            <div className="supplier-row">
              <span className="supplier-label">CUI:</span>
              <span className="supplier-value">{furnizor.cui || '-'}</span>
              <span className="supplier-label ml">Reg. Comert:</span>
              <span className="supplier-value">{furnizor.regCom || '-'}</span>
            </div>
            <div className="supplier-row">
              <span className="supplier-label">Sediu Social:</span>
              <span className="supplier-value">
                {[furnizor.address, furnizor.city, furnizor.county].filter(Boolean).join(', ') || '-'}
              </span>
            </div>
            <div className="supplier-row">
              <span className="supplier-label">Punct Lucru:</span>
              <span className="supplier-value">{data.company.weighingLocation || '-'}</span>
            </div>
            <div className="supplier-row">
              <span className="supplier-label">Tel.:</span>
              <span className="supplier-value">{data.company.phone || '-'}</span>
            </div>
          </div>

          {/* Ticket Info Header */}
          <div className="ticket-info-header">
            <div className="info-left">
              <div className="info-row">
                <span className="info-label">Tichet generat de:</span>
                <span className="info-value">{data.generatedBy || 'administrator'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Cantarire efectuata de:</span>
                <span className="info-value">{data.weighedBy || 'administrator'}</span>
              </div>
            </div>
            <div className="info-right">
              <div className="info-row">
                <span className="info-label">Data tiparirii:</span>
                <span className="info-value">{printDate}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Ora tiparirii:</span>
                <span className="info-value">{printTime}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Tiparit cu:</span>
                <span className="info-value">WiseRecyc</span>
              </div>
            </div>
          </div>

          {/* Ticket Number */}
          <div className="ticket-number-section">
            <span className="ticket-number-label">TICHET CANTARIRE NR.</span>
            <span className="ticket-number-value">{data.ticketNumber}</span>
          </div>

          {/* Client and Transport Details */}
          <div className="details-section">
            <div className="details-grid">
              <div className="details-left">
                <div className="detail-row">
                  <span className="detail-label">Client:</span>
                  <span className="detail-value">{client.name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Nr. Auto:</span>
                  <span className="detail-value">{data.vehicleNumber || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Configuratie vehicul:</span>
                  <span className="detail-value">{data.vehicleConfig || '-'}</span>
                </div>
              </div>
              <div className="details-right">
                <div className="detail-row">
                  <span className="detail-label">Tip + Natura materialelor:</span>
                  <span className="detail-value material-desc">{materialDescription}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Transportator:</span>
                  <span className="detail-value">{data.transporterName || '-'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">CUI Client:</span>
                  <span className="detail-value">{client.cui || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Weights Section - Per Item */}
          <div className="weights-section">
            {/* Per-item weights if available */}
            {data.items.map((item, index) => {
              // Get edited times for this item, or use item's original times
              const editedItem = editedDateTime?.items?.[index]
              const itemDateBrut = editedItem?.dateBrut || item.dateBrut || displayDate
              const itemDateTara = editedItem?.dateTara || item.dateTara || displayDate
              const itemTimeBrut = editedItem?.timeBrut || item.timeBrut || displayTimeBrut
              const itemTimeTara = editedItem?.timeTara || item.timeTara || displayTimeTara
              const itemWeightBrut = item.weightBrut ?? data.weightBrut
              const itemWeightTara = item.weightTara ?? data.weightTara
              const itemWeightNet = item.quantity

              // Only show if we have weight values
              const hasWeights = itemWeightTara !== null && itemWeightTara !== undefined &&
                                 itemWeightBrut !== null && itemWeightBrut !== undefined

              return (
                <div key={index} className="material-weights">
                  {/* Material header if multiple items */}
                  {data.items.length > 1 && (
                    <div className="material-header">
                      <span className="material-name">{item.materialName}</span>
                    </div>
                  )}

                  {hasWeights && (
                    <>
                      <div className="weight-row">
                        <div className="weight-item">
                          <span className="weight-label">Tara:</span>
                          <span className="weight-value">{formatNumber(itemWeightTara)}</span>
                          <span className="weight-unit">KG</span>
                          <span className="weight-note">[Tara Masurata]</span>
                        </div>
                        <div className="weight-timestamp">
                          <span className="timestamp-label">Cantarit la:</span>
                          <span className="timestamp-value">{formatDate(itemDateTara)} {itemTimeTara}</span>
                        </div>
                      </div>
                      <div className="weight-row">
                        <div className="weight-item">
                          <span className="weight-label">Brut:</span>
                          <span className="weight-value">{formatNumber(itemWeightBrut)}</span>
                          <span className="weight-unit">KG</span>
                        </div>
                        <div className="weight-timestamp">
                          <span className="timestamp-label">Cantarit la:</span>
                          <span className="timestamp-value">{formatDate(itemDateBrut)} {itemTimeBrut}</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className={`weight-row ${hasWeights ? 'net-row' : ''}`}>
                    <div className="weight-item">
                      <span className="weight-label">Net:</span>
                      <span className="weight-value net-value">{formatNumber(itemWeightNet)}</span>
                      <span className="weight-unit">KG</span>
                    </div>
                    {index === data.items.length - 1 && (
                      <div className="weight-timestamp">
                        <span className="timestamp-label">Clasa de exactitate:</span>
                        <span className="timestamp-value">{data.company.scaleAccuracyClass || 'III'}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Total Net if multiple items */}
            {data.items.length > 1 && (
              <div className="weight-row total-row">
                <div className="weight-item">
                  <span className="weight-label">TOTAL NET:</span>
                  <span className="weight-value net-value">{formatNumber(data.weightNet)}</span>
                  <span className="weight-unit">KG</span>
                </div>
              </div>
            )}
          </div>

          {/* Documents and Delegate Section */}
          <div className="documents-section">
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Factura:</span>
                <span className="doc-value">{data.receiptNumber || '-'}</span>
              </div>
            </div>
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Aviz:</span>
                <span className="doc-value">{data.avizNumber || '-'}</span>
              </div>
            </div>
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Cantar:</span>
                <span className="doc-value">{data.company.scaleName || 'WiseRecyc'}</span>
              </div>
            </div>
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Serie cantar:</span>
                <span className="doc-value">-</span>
                <span className="doc-label ml">Tip cantarire:</span>
                <span className="doc-value">{data.weighingType || 'Statica'}</span>
              </div>
            </div>
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Delegat:</span>
                <span className="doc-value">{data.delegateName || '-'}</span>
              </div>
            </div>
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Operator:</span>
                <span className="doc-value">{data.operatorName || 'Administrator'}</span>
              </div>
            </div>
            <div className="doc-row">
              <div className="doc-item">
                <span className="doc-label">Locatie Cantarire:</span>
                <span className="doc-value">
                  {data.company.weighingLocation || `${data.company.city || ''} ${data.company.county ? 'JUD ' + data.company.county.toUpperCase() : ''}`}
                </span>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="signature-section">
            <span className="signature-label">Semnatura:</span>
            <span className="signature-line">___________________________</span>
          </div>

          {/* Copy badge if applicable */}
          {copy === 'copy' && (
            <div className="copy-badge">COPIE</div>
          )}
        </div>

        <style>{`
          .ticket-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .ticket {
            width: 100%;
            max-width: 180mm;
            padding: 4mm;
            font-family: 'Courier New', Courier, monospace;
            font-size: 9pt;
            line-height: 1.3;
            border: 1px solid #333;
            background: white;
            box-sizing: border-box;
            position: relative;
          }

          .supplier-section {
            margin-bottom: 2mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #ccc;
          }

          .supplier-row {
            display: flex;
            gap: 2mm;
            margin: 0.5mm 0;
          }

          .supplier-label {
            font-weight: normal;
            min-width: 25mm;
          }

          .supplier-value {
            font-weight: bold;
          }

          .ml {
            margin-left: 10mm;
          }

          .ticket-info-header {
            display: flex;
            justify-content: space-between;
            margin: 2mm 0;
            padding-bottom: 2mm;
            border-bottom: 1px solid #ccc;
          }

          .info-left, .info-right {
            display: flex;
            flex-direction: column;
            gap: 0.5mm;
          }

          .info-row {
            display: flex;
            gap: 2mm;
          }

          .info-label {
            font-weight: normal;
          }

          .info-value {
            font-weight: bold;
          }

          .ticket-number-section {
            text-align: center;
            padding: 3mm 0;
            margin: 2mm 0;
            border: 2px solid #333;
            background: #f5f5f5;
          }

          .ticket-number-label {
            font-size: 10pt;
            font-weight: bold;
          }

          .ticket-number-value {
            font-size: 16pt;
            font-weight: bold;
            margin-left: 3mm;
          }

          .details-section {
            margin: 3mm 0;
            padding: 2mm;
            border: 1px solid #ccc;
          }

          .details-grid {
            display: flex;
            justify-content: space-between;
          }

          .details-left, .details-right {
            width: 48%;
          }

          .detail-row {
            display: flex;
            gap: 2mm;
            margin: 1mm 0;
          }

          .detail-label {
            font-weight: normal;
          }

          .detail-value {
            font-weight: bold;
          }

          .material-desc {
            font-size: 8pt;
          }

          .weights-section {
            margin: 3mm 0;
            padding: 3mm;
            border: 2px solid #333;
            background: #fafafa;
          }

          .weight-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2mm 0;
            border-bottom: 1px dashed #ccc;
          }

          .weight-row:last-child {
            border-bottom: none;
          }

          .net-row {
            background: #e8e8e8;
            margin: 2mm -3mm 0 -3mm;
            padding: 3mm;
          }

          .material-weights {
            margin-bottom: 3mm;
            padding-bottom: 2mm;
            border-bottom: 1px solid #ddd;
          }

          .material-weights:last-of-type {
            margin-bottom: 0;
            padding-bottom: 0;
            border-bottom: none;
          }

          .material-header {
            background: #f0f0f0;
            padding: 1mm 2mm;
            margin: 0 -3mm 2mm -3mm;
            border-bottom: 1px solid #ccc;
          }

          .material-name {
            font-weight: bold;
            font-size: 9pt;
            text-transform: uppercase;
          }

          .total-row {
            background: #333;
            color: white;
            margin: 3mm -3mm -3mm -3mm;
            padding: 3mm;
          }

          .total-row .weight-label,
          .total-row .weight-value,
          .total-row .weight-unit {
            color: white;
          }

          .weight-item {
            display: flex;
            align-items: center;
            gap: 3mm;
          }

          .weight-label {
            font-weight: bold;
            font-size: 11pt;
            min-width: 35mm;
          }

          .weight-value {
            font-size: 14pt;
            font-weight: bold;
            text-align: right;
            min-width: 40mm;
          }

          .net-value {
            font-size: 16pt;
          }

          .weight-unit {
            font-weight: bold;
          }

          .weight-note {
            font-size: 7pt;
            color: #666;
          }

          .weight-timestamp {
            display: flex;
            gap: 2mm;
            font-size: 8pt;
          }

          .timestamp-label {
            color: #666;
          }

          .timestamp-value {
            font-weight: bold;
          }

          .documents-section {
            margin: 3mm 0;
          }

          .doc-row {
            margin: 1mm 0;
          }

          .doc-item {
            display: flex;
            gap: 2mm;
          }

          .doc-label {
            font-weight: normal;
            min-width: 35mm;
          }

          .doc-value {
            font-weight: bold;
          }

          .signature-section {
            margin-top: 5mm;
            padding-top: 3mm;
            border-top: 1px solid #ccc;
            display: flex;
            gap: 3mm;
          }

          .signature-label {
            font-weight: bold;
          }

          .signature-line {
            flex: 1;
          }

          .copy-badge {
            position: absolute;
            top: 3mm;
            right: 3mm;
            padding: 1mm 3mm;
            border: 1px solid #999;
            font-size: 8pt;
            font-style: italic;
            color: #666;
            transform: rotate(10deg);
          }

          @media print {
            .ticket {
              border: none;
              max-width: none;
              width: 100%;
            }
          }
        `}</style>
      </div>
    )
  }
)
