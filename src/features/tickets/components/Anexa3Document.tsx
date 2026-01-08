import { forwardRef } from 'react'
import type { Anexa3Data } from '../types'
import { formatDate } from '../utils/ticketNumber'

interface Anexa3DocumentProps {
  data: Anexa3Data
}

export const Anexa3Document = forwardRef<HTMLDivElement, Anexa3DocumentProps>(
  function Anexa3Document({ data }, ref) {
    const formatNumber = (num: number, decimals = 2) => {
      return new Intl.NumberFormat('ro-RO', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(num)
    }

    return (
      <div ref={ref} className="anexa3-wrapper">
        <div className="anexa3">
          {/* Header */}
          <div className="header">
            <div className="header-title">
              <span className="anexa-label">ANEXA 3</span>
              <span className="form-title">Formular de încărcare – descărcare deșeuri nepericuloase</span>
            </div>
            <div className="header-serie">
              <div className="serie-label">Serie și număr</div>
              <div className="serie-value">{data.seria}-{data.numar}</div>
            </div>
          </div>

          {/* Main Grid Layout */}
          <div className="main-grid">
            {/* Left Side */}
            <div className="left-side">
              {/* Transportator Box */}
              <div className="box">
                <div className="box-header">Date de identificare transportator</div>
                <div className="box-content">
                  <div className="value-large">{data.transportator.name || '___________________________________'}</div>
                </div>
              </div>

              {/* Date Box */}
              <div className="box">
                <div className="box-header">Data</div>
                <div className="box-content">
                  <table className="simple-table">
                    <tbody>
                      <tr>
                        <td className="label-cell">Încărcare</td>
                        <td className="value-cell">{formatDate(data.dataIncarcare)}</td>
                      </tr>
                      <tr>
                        <td className="label-cell">Descărcare</td>
                        <td className="value-cell">{data.dataDescarcare ? formatDate(data.dataDescarcare) : ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Caracteristici Deseuri Box - cu tabel pentru multiple randuri */}
              <div className="box deseuri-box">
                <div className="box-header">Caracteristici deșeuri:</div>
                <div className="box-content">
                  <table className="deseuri-table">
                    <thead>
                      <tr>
                        <th>Categorii deșeuri</th>
                        <th>Cod</th>
                        <th>Descriere</th>
                        <th className="right">Cantitate (tone)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.deseuri.map((deseu, index) => (
                        <tr key={index}>
                          <td>{deseu.categorie}</td>
                          <td className="center">{deseu.cod}</td>
                          <td>{deseu.descriere}</td>
                          <td className="right">{formatNumber(deseu.cantitateTone)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td colSpan={3} className="right"><strong>TOTAL:</strong></td>
                        <td className="right"><strong>{formatNumber(data.totalCantitate.tone)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>

                  {/* Destinat */}
                  <div className="destinat-section">
                    <span className="destinat-label">Destinat:</span>
                    <div className="destinat-options">
                      <label className="checkbox-label">
                        <span className="checkbox">{data.destinatie.colectarii ? '☑' : '☐'}</span>
                        colectării
                      </label>
                      <label className="checkbox-label">
                        <span className="checkbox">{data.destinatie.stocarii ? '☑' : '☐'}</span>
                        stocării temporare
                      </label>
                      <label className="checkbox-label">
                        <span className="checkbox">{data.destinatie.tratarii ? '☑' : '☐'}</span>
                        tratării
                      </label>
                      <label className="checkbox-label">
                        <span className="checkbox">{data.destinatie.valorificarii ? '☑' : '☐'}</span>
                        valorificării
                      </label>
                      <label className="checkbox-label">
                        <span className="checkbox">{data.destinatie.eliminarii ? '☑' : '☐'}</span>
                        eliminării
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observatii */}
              <div className="box">
                <div className="box-header">Observații</div>
                <div className="box-content obs-content">
                  {data.observatii || ''}
                </div>
              </div>

              {/* Delegat Box */}
              <div className="box delegat-box">
                <div className="box-header">Date de identificare delegat și nr. înmatriculare mijloc de transport</div>
                <div className="box-content">
                  <div className="delegat-name">{data.transportator.delegatName || '___________________________________'}</div>
                  <div className="delegat-row">
                    <span>SERIA:</span>
                    <span className="delegat-value">{data.transportator.delegatCI?.split(' ')[0] || '______'}</span>
                    <span>NR:</span>
                    <span className="delegat-value">{data.transportator.delegatCI?.split(' ')[1] || '__________'}</span>
                  </div>
                  <div className="delegat-row">
                    <span>AUTO:</span>
                    <span className="delegat-value">{data.transportator.vehicleNumber || '______________'}</span>
                  </div>
                  <div className="delegat-field">
                    <span className="field-label">Licență de transport mărfuri nepericuloase</span>
                    <span className="field-value">{data.transportator.licentaTransport || '______________'}</span>
                  </div>
                  <div className="delegat-field">
                    <span className="field-label">Data la care expiră licența de transport</span>
                    <span className="field-value">{data.transportator.dataExpirareTransport || '______________'}</span>
                  </div>
                  <div className="signature-area">
                    <span className="signature-label">Semnătură</span>
                    <div className="signature-line"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side */}
            <div className="right-side">
              {/* INCARCAREA */}
              <div className="box party-box">
                <div className="box-header-dark">ÎNCĂRCAREA</div>
                <div className="box-content">
                  <div className="party-section-header">Date de identificare expeditor</div>
                  <div className="party-name">{data.expeditor.name}</div>
                  <div className="party-cui">{data.expeditor.cui || ''}</div>

                  <div className="party-field">
                    <span className="field-label">PUNCT DE LUCRU:</span>
                    <div className="field-value-block">{data.expeditor.punctLucru || ''}</div>
                  </div>

                  <div className="party-field">
                    <span className="field-label">Autorizație de mediu nr.</span>
                    <span className="field-value">{data.expeditor.autorizatieMediu || '___________________'}</span>
                  </div>

                  <div className="party-field">
                    <span className="field-label">Data la care expiră autorizația de mediu</span>
                    <span className="field-value">{data.expeditor.dataExpirareAutorizatie || '___________________'}</span>
                  </div>

                  <div className="signature-area">
                    <span className="signature-label">Semnătură și ștampilă</span>
                    <div className="signature-line"></div>
                  </div>
                </div>
              </div>

              {/* DESCARCAREA */}
              <div className="box party-box">
                <div className="box-header-dark">DESCĂRCAREA</div>
                <div className="box-content">
                  <div className="party-section-header">Date de identificare destinatar</div>
                  <div className="party-name">{data.destinatar.name}</div>
                  <div className="party-cui">{data.destinatar.cui || ''}</div>

                  <div className="party-field">
                    <span className="field-label">PUNCT DE LUCRU:</span>
                    <div className="field-value-block">{data.destinatar.punctLucru || ''}</div>
                  </div>

                  <div className="party-field">
                    <span className="field-label">Autorizație de mediu nr.</span>
                    <span className="field-value">{data.destinatar.autorizatieMediu || '___________________'}</span>
                  </div>

                  <div className="party-field">
                    <span className="field-label">Data la care expiră autorizația de mediu</span>
                    <span className="field-value">{data.destinatar.dataExpirareAutorizatie || '___________________'}</span>
                  </div>

                  {data.destinatar.vizaAnuala && (
                    <div className="party-field viza">
                      <span className="field-label">VIZĂ ANUALĂ</span>
                      <span className="field-value">{data.destinatar.vizaAnuala}</span>
                    </div>
                  )}

                  <div className="signature-area">
                    <span className="signature-label">Semnătură și ștampilă</span>
                    <div className="signature-line"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .anexa3-wrapper {
            width: 100%;
            display: flex;
            justify-content: center;
            background: #f5f5f5;
            padding: 10px;
          }

          .anexa3 {
            width: 297mm;
            min-height: 210mm;
            padding: 8mm;
            font-family: 'Segoe UI', Arial, sans-serif;
            font-size: 9pt;
            background: white;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            box-sizing: border-box;
          }

          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding-bottom: 4mm;
            border-bottom: 2px solid #1a1a1a;
            margin-bottom: 4mm;
          }

          .header-title {
            display: flex;
            flex-direction: column;
            gap: 1mm;
          }

          .anexa-label {
            font-size: 11pt;
            font-weight: 700;
            color: #1a1a1a;
            letter-spacing: 1px;
          }

          .form-title {
            font-size: 10pt;
            font-weight: 600;
            color: #333;
          }

          .header-serie {
            text-align: right;
          }

          .serie-label {
            font-size: 8pt;
            color: #666;
          }

          .serie-value {
            font-size: 13pt;
            font-weight: 700;
            color: #1a1a1a;
          }

          /* Main Grid */
          .main-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 4mm;
          }

          .left-side, .right-side {
            display: flex;
            flex-direction: column;
            gap: 3mm;
          }

          /* Boxes */
          .box {
            border: 1px solid #333;
            background: white;
          }

          .box-header {
            background: #e8e8e8;
            padding: 1.5mm 3mm;
            font-weight: 600;
            font-size: 8pt;
            border-bottom: 1px solid #333;
            color: #1a1a1a;
          }

          .box-header-dark {
            background: #2c3e50;
            color: white;
            padding: 2mm 3mm;
            font-weight: 700;
            font-size: 9pt;
            text-align: center;
            letter-spacing: 0.5px;
          }

          .box-content {
            padding: 2mm 3mm;
          }

          /* Tables */
          .simple-table {
            width: 100%;
            border-collapse: collapse;
          }

          .simple-table td {
            padding: 1mm 2mm;
            border: 1px solid #ddd;
          }

          .label-cell {
            background: #f8f8f8;
            font-weight: 500;
            width: 35%;
            font-size: 8pt;
          }

          .value-cell {
            font-weight: 600;
            font-size: 9pt;
          }

          /* Deseuri Table */
          .deseuri-box {
            flex: 1;
          }

          .deseuri-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 8pt;
            margin-bottom: 2mm;
          }

          .deseuri-table th {
            background: #f0f0f0;
            padding: 1.5mm 2mm;
            text-align: left;
            font-weight: 600;
            border: 1px solid #ccc;
            font-size: 7pt;
          }

          .deseuri-table td {
            padding: 1.5mm 2mm;
            border: 1px solid #ccc;
          }

          .deseuri-table .center {
            text-align: center;
          }

          .deseuri-table .right {
            text-align: right;
          }

          .deseuri-table .total-row {
            background: #f8f8f8;
          }

          .deseuri-table .total-row td {
            border-top: 2px solid #333;
          }

          /* Destinat Section */
          .destinat-section {
            margin-top: 2mm;
            padding-top: 2mm;
            border-top: 1px dashed #ccc;
          }

          .destinat-label {
            font-weight: 600;
            font-size: 8pt;
            margin-right: 2mm;
          }

          .destinat-options {
            display: flex;
            flex-wrap: wrap;
            gap: 3mm;
            margin-top: 1mm;
          }

          .checkbox-label {
            display: inline-flex;
            align-items: center;
            gap: 1mm;
            font-size: 7pt;
          }

          .checkbox {
            font-size: 10pt;
            line-height: 1;
          }

          /* Observatii */
          .obs-content {
            min-height: 8mm;
            font-size: 8pt;
          }

          /* Delegat Box */
          .delegat-box .box-content {
            font-size: 8pt;
          }

          .delegat-name {
            font-weight: 600;
            font-size: 9pt;
            margin-bottom: 2mm;
          }

          .delegat-row {
            display: flex;
            align-items: center;
            gap: 2mm;
            margin: 1mm 0;
          }

          .delegat-value {
            font-weight: 600;
          }

          .delegat-field {
            display: flex;
            justify-content: space-between;
            margin: 1.5mm 0;
            font-size: 7pt;
          }

          .delegat-field .field-label {
            color: #555;
          }

          .delegat-field .field-value {
            font-weight: 600;
          }

          /* Party Boxes */
          .party-box {
            flex: 1;
          }

          .party-section-header {
            background: #f5f5f5;
            padding: 1mm 2mm;
            margin: -2mm -3mm 2mm -3mm;
            font-weight: 600;
            font-size: 8pt;
            border-bottom: 1px solid #ddd;
          }

          .party-name {
            font-weight: 700;
            font-size: 10pt;
            color: #1a1a1a;
          }

          .party-cui {
            font-size: 9pt;
            color: #333;
            margin-bottom: 2mm;
          }

          .party-field {
            margin: 2mm 0;
          }

          .party-field .field-label {
            display: block;
            font-size: 7pt;
            color: #666;
            margin-bottom: 0.5mm;
          }

          .party-field .field-value {
            font-size: 8pt;
            font-weight: 500;
          }

          .party-field .field-value-block {
            font-size: 8pt;
            line-height: 1.3;
          }

          .party-field.viza {
            background: #fff3cd;
            padding: 1mm 2mm;
            border: 1px solid #ffc107;
            margin-top: 2mm;
          }

          /* Signature Area */
          .signature-area {
            margin-top: 4mm;
            text-align: center;
          }

          .signature-label {
            display: block;
            font-size: 7pt;
            color: #666;
            margin-bottom: 2mm;
          }

          .signature-line {
            height: 12mm;
            border-bottom: 1px solid #333;
          }

          .value-large {
            font-size: 9pt;
            font-weight: 500;
          }

          @media print {
            .anexa3-wrapper {
              background: white;
              padding: 0;
            }

            .anexa3 {
              box-shadow: none;
              width: 100%;
              max-width: none;
              padding: 5mm;
            }

            @page {
              size: A4 landscape;
              margin: 5mm;
            }
          }
        `}</style>
      </div>
    )
  }
)
