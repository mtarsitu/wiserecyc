import { forwardRef } from 'react'
import type { AvizData } from '../types'
import { formatDate } from '../utils/ticketNumber'

interface AvizDocumentProps {
  data: AvizData
}

export const AvizDocument = forwardRef<HTMLDivElement, AvizDocumentProps>(
  function AvizDocument({ data }, ref) {
    const formatNumber = (num: number) => {
      return new Intl.NumberFormat('ro-RO', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(num)
    }

    return (
      <div ref={ref} className="aviz-wrapper">
        <div className="aviz">
          {/* Header */}
          <div className="aviz-header">
            <div className="aviz-title">
              <h1>AVIZ DE INSOTIRE A MARFII</h1>
              <div className="aviz-number">
                <span>Seria: </span>
                <span className="bold">WR</span>
                <span> Nr.: </span>
                <span className="bold">{data.avizNumber}</span>
              </div>
              <div className="aviz-date">
                <span>Data: </span>
                <span className="bold">{formatDate(data.avizDate)}</span>
              </div>
            </div>
          </div>

          {/* Parties - Furnizor si Cumparator */}
          <div className="parties-section">
            <div className="party-box">
              <div className="party-title">FURNIZOR (Expeditor)</div>
              <div className="party-content">
                <div className="party-name">{data.furnizor.name}</div>
                <div className="party-detail">
                  <span>CUI: </span>
                  <span>{data.furnizor.cui || '-'}</span>
                </div>
                <div className="party-detail">
                  <span>Reg. Com.: </span>
                  <span>{data.furnizor.regCom || '-'}</span>
                </div>
                <div className="party-detail">
                  <span>Adresa: </span>
                  <span>
                    {[data.furnizor.address, data.furnizor.city, data.furnizor.county]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </span>
                </div>
                <div className="party-detail">
                  <span>Tel: </span>
                  <span>{data.furnizor.phone || '-'}</span>
                </div>
                {data.furnizor.bank && (
                  <div className="party-detail">
                    <span>Banca: </span>
                    <span>{data.furnizor.bank}</span>
                  </div>
                )}
                {data.furnizor.iban && (
                  <div className="party-detail">
                    <span>IBAN: </span>
                    <span>{data.furnizor.iban}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="party-box">
              <div className="party-title">CUMPARATOR (Destinatar)</div>
              <div className="party-content">
                <div className="party-name">{data.cumparator.name}</div>
                <div className="party-detail">
                  <span>CUI: </span>
                  <span>{data.cumparator.cui || '-'}</span>
                </div>
                <div className="party-detail">
                  <span>Reg. Com.: </span>
                  <span>{data.cumparator.regCom || '-'}</span>
                </div>
                <div className="party-detail">
                  <span>Adresa: </span>
                  <span>
                    {[data.cumparator.address, data.cumparator.city, data.cumparator.county]
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </span>
                </div>
                <div className="party-detail">
                  <span>Tel: </span>
                  <span>{data.cumparator.phone || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Puncte de lucru */}
          {(data.punctLucruExpeditor || data.punctLucruDestinatar) && (
            <div className="punct-lucru-section">
              {data.punctLucruExpeditor && (
                <div className="punct-lucru">
                  <span className="label">Punct de lucru expeditor: </span>
                  <span>{data.punctLucruExpeditor}</span>
                </div>
              )}
              {data.punctLucruDestinatar && (
                <div className="punct-lucru">
                  <span className="label">Punct de lucru destinatar: </span>
                  <span>{data.punctLucruDestinatar}</span>
                </div>
              )}
            </div>
          )}

          {/* Delegat / Transport */}
          <div className="delegat-section">
            <div className="delegat-info">
              <span className="label">Delegat: </span>
              <span>{data.delegat?.name || '________________________________'}</span>
            </div>
            <div className="delegat-info">
              <span className="label">CNP: </span>
              <span>{data.delegat?.cnp || '________________________________'}</span>
            </div>
            <div className="delegat-info">
              <span className="label">Nr. auto: </span>
              <span>{data.delegat?.vehicleNumber || '________________________________'}</span>
            </div>
            {data.transportType && (
              <div className="delegat-info">
                <span className="label">Mijloc transport: </span>
                <span>{data.transportType}</span>
              </div>
            )}
          </div>

          {/* Tabel Produse */}
          <div className="products-section">
            <table className="products-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>Nr.</th>
                  <th style={{ width: '45%' }}>Denumirea produsului</th>
                  <th style={{ width: '10%' }}>U.M.</th>
                  <th style={{ width: '15%' }}>Cantitate</th>
                  <th style={{ width: '12%' }}>Pret unitar</th>
                  <th style={{ width: '13%' }}>Valoare</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item, index) => (
                  <tr key={index}>
                    <td className="text-center">{index + 1}</td>
                    <td>{item.name}</td>
                    <td className="text-center">{item.um}</td>
                    <td className="text-right">{formatNumber(item.quantity)}</td>
                    <td className="text-right">{item.price ? formatNumber(item.price) : '-'}</td>
                    <td className="text-right">{item.total ? formatNumber(item.total) : '-'}</td>
                  </tr>
                ))}
                {/* Empty rows for manual completion */}
                {data.items.length < 5 && Array.from({ length: 5 - data.items.length }).map((_, i) => (
                  <tr key={`empty-${i}`}>
                    <td className="text-center">&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Observatii */}
          {data.notes && (
            <div className="notes-section">
              <span className="label">Observatii: </span>
              <span>{data.notes}</span>
            </div>
          )}

          {/* Semnaturi */}
          <div className="signatures-section">
            <div className="signature-box">
              <div className="signature-title">Expeditor</div>
              <div className="signature-fields">
                <div className="sig-field">Numele: ________________</div>
                <div className="sig-field">Semnatura: ________________</div>
                <div className="sig-field">L.S.</div>
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-title">Transportator</div>
              <div className="signature-fields">
                <div className="sig-field">Numele: ________________</div>
                <div className="sig-field">Semnatura: ________________</div>
              </div>
            </div>
            <div className="signature-box">
              <div className="signature-title">Destinatar</div>
              <div className="signature-fields">
                <div className="sig-field">Numele: ________________</div>
                <div className="sig-field">Semnatura: ________________</div>
                <div className="sig-field">L.S.</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="aviz-footer">
            <span>Printat la: {new Date().toLocaleString('ro-RO')}</span>
          </div>
        </div>

        <style>{`
          .aviz-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
          }

          .aviz {
            width: 100%;
            max-width: 210mm;
            padding: 8mm;
            font-family: Arial, sans-serif;
            font-size: 9pt;
            background: white;
            box-sizing: border-box;
          }

          .aviz-header {
            text-align: center;
            margin-bottom: 5mm;
          }

          .aviz-title h1 {
            font-size: 14pt;
            font-weight: bold;
            margin: 0 0 3mm 0;
            text-transform: uppercase;
          }

          .aviz-number, .aviz-date {
            font-size: 10pt;
            margin: 1mm 0;
          }

          .bold {
            font-weight: bold;
          }

          .parties-section {
            display: flex;
            gap: 5mm;
            margin: 5mm 0;
          }

          .party-box {
            flex: 1;
            border: 1px solid #333;
            padding: 3mm;
          }

          .party-title {
            font-weight: bold;
            font-size: 9pt;
            background: #f0f0f0;
            padding: 1mm 2mm;
            margin: -3mm -3mm 2mm -3mm;
            border-bottom: 1px solid #333;
          }

          .party-name {
            font-weight: bold;
            font-size: 10pt;
            margin-bottom: 2mm;
          }

          .party-detail {
            font-size: 8pt;
            margin: 1mm 0;
          }

          .party-detail span:first-child {
            color: #555;
          }

          .punct-lucru-section {
            margin: 3mm 0;
            padding: 2mm;
            border: 1px solid #ccc;
            background: #fafafa;
          }

          .punct-lucru {
            margin: 1mm 0;
            font-size: 8pt;
          }

          .delegat-section {
            display: flex;
            flex-wrap: wrap;
            gap: 3mm;
            margin: 4mm 0;
            padding: 2mm;
            border: 1px solid #ccc;
          }

          .delegat-info {
            flex: 1;
            min-width: 45%;
            font-size: 8pt;
          }

          .label {
            font-weight: bold;
            color: #333;
          }

          .products-section {
            margin: 4mm 0;
          }

          .products-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
          }

          .products-table th,
          .products-table td {
            border: 1px solid #333;
            padding: 1.5mm 2mm;
          }

          .products-table th {
            background: #f0f0f0;
            font-weight: bold;
            text-align: center;
          }

          .text-center {
            text-align: center;
          }

          .text-right {
            text-align: right;
          }

          .notes-section {
            margin: 3mm 0;
            padding: 2mm;
            border: 1px dashed #999;
            font-size: 8pt;
          }

          .signatures-section {
            display: flex;
            justify-content: space-between;
            margin-top: 8mm;
            gap: 5mm;
          }

          .signature-box {
            flex: 1;
            text-align: center;
          }

          .signature-title {
            font-weight: bold;
            margin-bottom: 3mm;
            font-size: 9pt;
          }

          .signature-fields {
            font-size: 8pt;
          }

          .sig-field {
            margin: 2mm 0;
          }

          .aviz-footer {
            text-align: center;
            font-size: 7pt;
            color: #666;
            margin-top: 5mm;
            padding-top: 2mm;
            border-top: 1px dashed #ccc;
          }

          @media print {
            .aviz {
              max-width: none;
              width: 100%;
              padding: 0;
            }
          }
        `}</style>
      </div>
    )
  }
)
