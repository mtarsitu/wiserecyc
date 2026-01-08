import type { TicketData, TicketItem, TicketCompany, TicketPartner, AvizData, AvizItem, Anexa3Data } from '../types'
import type { Company, Supplier, Client, Material, AcquisitionType } from '@/types/database'
import type { AcquisitionWithDetails } from '@/features/acquisitions/queries'
import type { SaleWithDetails } from '@/features/sales/queries'
import { generateTicketNumber, formatTime, getCurrentTime } from './ticketNumber'

// Mapping of material names to waste codes (cod deseu)
// These are common Romanian waste codes for recyclable materials
const MATERIAL_WASTE_CODES: Record<string, { cod: string; denumire: string }> = {
  'fier': { cod: '17 04 05', denumire: 'Fier si otel' },
  'otel': { cod: '17 04 05', denumire: 'Fier si otel' },
  'cupru': { cod: '17 04 01', denumire: 'Cupru, bronz, alama' },
  'bronz': { cod: '17 04 01', denumire: 'Cupru, bronz, alama' },
  'alama': { cod: '17 04 01', denumire: 'Cupru, bronz, alama' },
  'aluminiu': { cod: '17 04 02', denumire: 'Aluminiu' },
  'plumb': { cod: '17 04 03', denumire: 'Plumb' },
  'zinc': { cod: '17 04 04', denumire: 'Zinc' },
  'inox': { cod: '17 04 05', denumire: 'Fier si otel' },
  'nichel': { cod: '17 04 06', denumire: 'Staniu' },
  'staniu': { cod: '17 04 06', denumire: 'Staniu' },
  'hartie': { cod: '20 01 01', denumire: 'Hartie si carton' },
  'carton': { cod: '20 01 01', denumire: 'Hartie si carton' },
  'plastic': { cod: '20 01 39', denumire: 'Materiale plastice' },
  'pet': { cod: '20 01 39', denumire: 'Materiale plastice' },
  'sticla': { cod: '20 01 02', denumire: 'Sticla' },
  'baterie': { cod: '16 06 01', denumire: 'Baterii cu plumb' },
  'acumulator': { cod: '16 06 01', denumire: 'Baterii cu plumb' },
  'deee': { cod: '20 01 36', denumire: 'DEEE - echipamente electrice si electronice scoase din uz' },
  'default': { cod: '17 04 07', denumire: 'Metale amestecate' }
}

// Transform Company to TicketCompany
function companyToTicketCompany(company: Company): TicketCompany {
  // Cast to access new fields that might not be in the TypeScript type yet
  const extendedCompany = company as Company & {
    weighing_location?: string | null
    scale_name?: string | null
    scale_accuracy_class?: string | null
  }

  return {
    name: company.name,
    cui: company.cui,
    regCom: company.reg_com,
    address: company.address,
    city: company.city,
    county: company.county,
    phone: company.phone,
    email: company.email,
    logo: company.logo_url,
    weighingLocation: extendedCompany.weighing_location || null,
    scaleName: extendedCompany.scale_name || null,
    scaleAccuracyClass: extendedCompany.scale_accuracy_class || 'III'
  }
}

// Transform Supplier to TicketPartner
function supplierToTicketPartner(supplier: Supplier | null | undefined): TicketPartner {
  if (!supplier) {
    return { name: 'Furnizor necunoscut' }
  }
  return {
    name: supplier.name,
    cui: supplier.cui,
    regCom: supplier.reg_com,
    address: supplier.address,
    city: supplier.city,
    county: supplier.county,
    phone: supplier.phone,
    email: supplier.email
  }
}

// Transform Client to TicketPartner
function clientToTicketPartner(client: Client | null | undefined): TicketPartner {
  if (!client) {
    return { name: 'Client necunoscut' }
  }
  return {
    name: client.name,
    cui: client.cui,
    regCom: client.reg_com,
    address: client.address,
    city: client.city,
    county: client.county,
    phone: client.phone,
    email: client.email
  }
}

// Transform acquisition items to ticket items
// IMPORTANT: Filter out items with acquisition_type 'zero' or 'director' - they should NOT appear on weighing ticket
function acquisitionItemsToTicketItems(
  items: Array<{
    material_id: string
    quantity: number
    impurities_percent: number
    final_quantity: number
    price_per_kg: number
    line_total: number
    material?: Material
    acquisition_type?: AcquisitionType
  }>,
  includeHiddenTypes: boolean = false
): TicketItem[] {
  // Filter out hidden types (0 and D) unless explicitly requested
  const filteredItems = includeHiddenTypes
    ? items
    : items.filter(item => !item.acquisition_type || item.acquisition_type === 'normal')

  return filteredItems.map(item => ({
    materialName: item.material?.name || 'Material necunoscut',
    quantity: item.quantity,
    impuritiesPercent: item.impurities_percent,
    finalQuantity: item.final_quantity,
    pricePerKg: item.price_per_kg,
    lineTotal: item.line_total
  }))
}

// Transform sale items to ticket items
function saleItemsToTicketItems(
  items: Array<{
    material_id: string
    quantity: number
    impurities_percent: number
    final_quantity: number
    price_per_kg_ron: number
    line_total: number
    material?: Material
  }>
): TicketItem[] {
  return items.map(item => ({
    materialName: item.material?.name || 'Material necunoscut',
    quantity: item.quantity,
    impuritiesPercent: item.impurities_percent,
    finalQuantity: item.final_quantity,
    pricePerKg: item.price_per_kg_ron,
    lineTotal: item.line_total
  }))
}

// Helper to get time with offset (for simulating brut/tara times)
function getTimeWithOffset(baseTime: string | undefined, offsetMinutes: number): string {
  if (!baseTime) {
    const now = new Date()
    now.setMinutes(now.getMinutes() + offsetMinutes)
    return now.toTimeString().slice(0, 5)
  }
  // Parse HH:MM format
  const [hours, minutes] = baseTime.split(':').map(Number)
  const date = new Date()
  date.setHours(hours, minutes + offsetMinutes)
  return date.toTimeString().slice(0, 5)
}

// Extended Acquisition type with new weighing fields
type ExtendedAcquisition = AcquisitionWithDetails & {
  vehicle_number?: string | null
  vehicle_config?: string | null
  transporter_name?: string | null
  delegate_name?: string | null
  aviz_number?: string | null
  weighing_type?: string | null
  weight_tara?: number | null
  weight_brut?: number | null
  weight_net?: number | null
  operator_name?: string | null
}

// Transform Acquisition to TicketData
// NOTE: Hidden acquisition types (0/D) are filtered out from the ticket
export function acquisitionToTicketData(
  acquisition: AcquisitionWithDetails,
  company: Company,
  operatorName?: string
): TicketData {
  const extAcq = acquisition as ExtendedAcquisition
  // Filter out hidden types (zero/director) for the weighing ticket
  const items = acquisitionItemsToTicketItems(acquisition.items, false)
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const baseTime = acquisition.weighing_time ?? undefined

  // Calculate total weights from VISIBLE items only (not hidden types)
  // Only use explicit weight_tara and weight_brut from database
  // NET is calculated from visible items final_quantity if not explicitly set
  const itemsNet = items.reduce((sum, item) => sum + item.finalQuantity, 0)
  const totalTara = extAcq.weight_tara ?? null  // Only from DB, don't calculate
  const totalBrut = extAcq.weight_brut ?? null  // Only from DB, don't calculate
  const totalNet = extAcq.weight_net ?? (itemsNet > 0 ? itemsNet : null)

  // Build material description from visible items only
  const materialDescription = items.map(item => item.materialName).join(', ')

  return {
    type: 'acquisition',
    ticketNumber: generateTicketNumber(
      acquisition.date,
      acquisition.receipt_number,
      'ACH'
    ),
    weighingDate: acquisition.date,
    weighingTimeBrut: formatTime(baseTime) || getCurrentTime(),
    weighingTimeTara: getTimeWithOffset(baseTime, 5),
    company: companyToTicketCompany(company),
    partner: supplierToTicketPartner(acquisition.supplier),
    items,
    subtotal,
    environmentFund: acquisition.environment_fund,
    total: acquisition.total_amount,
    notes: acquisition.notes,
    receiptNumber: acquisition.receipt_number,
    createdAt: acquisition.created_at,

    // New weighing ticket fields
    generatedBy: operatorName || extAcq.operator_name || 'operator',
    weighedBy: operatorName || extAcq.operator_name || 'operator',
    vehicleNumber: extAcq.vehicle_number || null,
    vehicleConfig: extAcq.vehicle_config || null,
    transporterName: extAcq.transporter_name || null,
    delegateName: extAcq.delegate_name || null,
    avizNumber: extAcq.aviz_number || null,
    weighingType: extAcq.weighing_type || 'Statica',
    operatorName: operatorName || extAcq.operator_name || 'Administrator',

    // Weights
    weightTara: totalTara,
    weightBrut: totalBrut,
    weightNet: totalNet,

    // Material description
    materialDescription
  }
}

// Extended Sale type with new weighing fields
type ExtendedSale = SaleWithDetails & {
  vehicle_number?: string | null
  vehicle_config?: string | null
  delegate_name?: string | null
  aviz_number?: string | null
  weighing_type?: string | null
  weight_tara?: number | null
  weight_brut?: number | null
  weight_net?: number | null
  operator_name?: string | null
}

// Transform Sale to TicketData
export function saleToTicketData(
  sale: SaleWithDetails,
  company: Company,
  operatorName?: string
): TicketData {
  const extSale = sale as ExtendedSale
  const items = saleItemsToTicketItems(sale.items)
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0)
  const baseTime = sale.weighing_time ?? undefined

  // Calculate total weights from items if not provided
  // Only use explicit weight_tara and weight_brut from database
  // NET is calculated from items final_quantity if not explicitly set
  const itemsNet = items.reduce((sum, item) => sum + item.finalQuantity, 0)
  const totalTara = extSale.weight_tara ?? null  // Only from DB, don't calculate
  const totalBrut = extSale.weight_brut ?? null  // Only from DB, don't calculate
  const totalNet = extSale.weight_net ?? (itemsNet > 0 ? itemsNet : null)

  // Build material description from items
  const materialDescription = items.map(item => item.materialName).join(', ')

  // Get transporter name from relation
  const transporterName = sale.transporter?.name || null

  return {
    type: 'sale',
    ticketNumber: generateTicketNumber(
      sale.date,
      sale.scale_number,
      'VNZ'
    ),
    weighingDate: sale.date,
    weighingTimeBrut: formatTime(baseTime) || getCurrentTime(),
    weighingTimeTara: getTimeWithOffset(baseTime, 5),
    company: companyToTicketCompany(company),
    partner: companyToTicketCompany(company) as unknown as TicketPartner, // For sales, we are the furnizor
    client: clientToTicketPartner(sale.client),
    items,
    subtotal,
    transportPrice: sale.transport_price,
    total: sale.total_amount,
    notes: sale.notes,
    scaleNumber: sale.scale_number,
    createdAt: sale.created_at,

    // New weighing ticket fields
    generatedBy: operatorName || extSale.operator_name || 'operator',
    weighedBy: operatorName || extSale.operator_name || 'operator',
    vehicleNumber: extSale.vehicle_number || sale.transporter?.vehicle_number || null,
    vehicleConfig: extSale.vehicle_config || null,
    transporterName: transporterName,
    delegateName: extSale.delegate_name || null,
    avizNumber: extSale.aviz_number || null,
    weighingType: extSale.weighing_type || 'Statica',
    operatorName: operatorName || extSale.operator_name || 'Administrator',

    // Weights
    weightTara: totalTara,
    weightBrut: totalBrut,
    weightNet: totalNet,

    // Material description
    materialDescription
  }
}

// ============================================
// Aviz de Insotire a Marfii Transformers
// ============================================

// Helper function to get waste code for a material
function getWasteCode(materialName: string): { cod: string; denumire: string } {
  const lowerName = materialName.toLowerCase()

  // Try to find a matching waste code
  for (const [key, value] of Object.entries(MATERIAL_WASTE_CODES)) {
    if (key !== 'default' && lowerName.includes(key)) {
      return value
    }
  }

  return MATERIAL_WASTE_CODES.default
}

// Transform sale items to aviz items
function saleItemsToAvizItems(
  items: Array<{
    material_id: string
    final_quantity: number
    price_per_kg_ron: number
    line_total: number
    material: Material
  }>
): AvizItem[] {
  return items.map(item => ({
    name: item.material?.name || 'Material necunoscut',
    um: 'kg',
    quantity: item.final_quantity,
    price: item.price_per_kg_ron,
    total: item.line_total
  }))
}

// Transform Sale to AvizData
export function saleToAvizData(
  sale: SaleWithDetails,
  company: Company
): AvizData {
  const avizItems = saleItemsToAvizItems(sale.items)

  return {
    avizNumber: sale.scale_number || generateTicketNumber(sale.date, null, 'AVZ'),
    avizDate: sale.date,

    // Furnizor (noi - expeditorul)
    furnizor: {
      name: company.name,
      cui: company.cui,
      regCom: company.reg_com,
      address: company.address,
      city: company.city,
      county: company.county,
      phone: company.phone,
      bank: company.bank,
      iban: company.iban
    },

    // Cumparator (clientul - destinatarul)
    cumparator: {
      name: sale.client?.name || 'Client necunoscut',
      cui: sale.client?.cui || null,
      regCom: sale.client?.reg_com || null,
      address: sale.client?.address || null,
      city: sale.client?.city || null,
      county: sale.client?.county || null,
      phone: sale.client?.phone || null
    },

    // Punct de lucru
    punctLucruExpeditor: company.address
      ? `${company.address}, ${company.city}, ${company.county}`
      : null,
    punctLucruDestinatar: sale.client?.work_point_address
      ? `${sale.client.work_point_address}, ${sale.client.work_point_city}, ${sale.client.work_point_county}`
      : null,

    // Delegat / transport
    delegat: sale.transporter ? {
      name: sale.transporter.name,
      cnp: null,
      vehicleNumber: sale.transporter.vehicle_number
    } : undefined,

    // Produse
    items: avizItems,

    // Tip transport
    transportType: sale.transport_type === 'intern' ? 'Auto propriu' : 'Auto extern',

    // Observatii
    notes: sale.notes
  }
}

// ============================================
// Anexa 3 - Formular Incarcare-Descarcare Transformers
// Format oficial conform HG 1061/2008
// ============================================

// Helper to generate serie prefix from county
function getSeriePrefix(county: string | null): string {
  if (!county) return 'XX'
  // Use first 2 letters of county as prefix, or common abbreviations
  const countyMap: Record<string, string> = {
    'bucuresti': 'B',
    'ilfov': 'IF',
    'valcea': 'VL',
    'arges': 'AG',
    'dolj': 'DJ',
    'prahova': 'PH',
    'brasov': 'BV',
    'cluj': 'CJ',
    'timis': 'TM',
    'constanta': 'CT',
    'iasi': 'IS',
    'galati': 'GL',
    'bacau': 'BC',
    'mures': 'MS',
    'sibiu': 'SB',
    'suceava': 'SV',
    'bihor': 'BH',
    'hunedoara': 'HD',
    'arad': 'AR',
    'gorj': 'GJ'
  }
  const lowerCounty = county.toLowerCase()
  return countyMap[lowerCounty] || county.substring(0, 2).toUpperCase()
}

// Transform sale items to deseuri array for Anexa 3
function saleItemsToAnexa3Deseuri(
  items: Array<{
    material_id: string
    final_quantity: number
    material: Material
  }>
): Array<{
  categorie: string
  cod: string
  descriere: string
  cantitateKg: number
  cantitateTone: number
  mc: null
}> {
  return items.map(item => {
    const materialName = item.material?.name || 'Material'
    const wasteInfo = getWasteCode(materialName)

    return {
      categorie: `DESEU ${materialName.toUpperCase()}`,
      cod: wasteInfo.cod,
      descriere: 'NEPERICULOASE',
      cantitateKg: item.final_quantity,
      cantitateTone: item.final_quantity / 1000,
      mc: null
    }
  })
}

// Transform Sale to Anexa3Data - Format oficial
export function saleToAnexa3Data(
  sale: SaleWithDetails,
  company: Company
): Anexa3Data {
  const deseuri = saleItemsToAnexa3Deseuri(sale.items)
  const seriePrefix = getSeriePrefix(company.county)

  // Calculate total
  const totalKg = sale.items.reduce((sum, item) => sum + item.final_quantity, 0)
  const totalTone = totalKg / 1000

  // Build punct de lucru string
  const companyPunctLucru = [company.address, company.city, company.county]
    .filter(Boolean)
    .join(', ')

  const clientPunctLucru = sale.client?.work_point_address
    ? [sale.client.work_point_address, sale.client.work_point_city, sale.client.work_point_county]
        .filter(Boolean)
        .join(', ')
    : [sale.client?.address, sale.client?.city, sale.client?.county]
        .filter(Boolean)
        .join(', ')

  return {
    // Serie si numar (ex: B-VL-135)
    seria: `${seriePrefix}-${getSeriePrefix(sale.client?.county || company.county)}`,
    numar: sale.scale_number || generateTicketNumber(sale.date, null, '').replace(/[^0-9]/g, '').slice(-4),

    // INCARCAREA - Expeditor (noi)
    expeditor: {
      name: company.name,
      cui: company.cui ? `RO${company.cui.replace(/^RO/i, '')}` : null,
      punctLucru: companyPunctLucru || null,
      autorizatieMediu: company.environment_auth || null,
      dataExpirareAutorizatie: null
    },

    // DESCARCAREA - Destinatar (clientul)
    destinatar: {
      name: sale.client?.name || 'Client necunoscut',
      cui: sale.client?.cui ? `RO${sale.client.cui.replace(/^RO/i, '')}` : null,
      punctLucru: clientPunctLucru || null,
      autorizatieMediu: sale.client?.environment_auth || null,
      dataExpirareAutorizatie: null,
      vizaAnuala: null
    },

    // Transportator
    transportator: {
      name: sale.transporter?.name || null,
      delegatName: sale.transporter?.name || null,
      delegatCI: null,
      vehicleNumber: sale.transporter?.vehicle_number || null,
      licentaTransport: null,
      dataExpirareTransport: null
    },

    // Deseuri - toate materialele din vanzare
    deseuri,

    // Destinatie (implicit valorificare pentru reciclare)
    destinatie: {
      colectarii: false,
      stocarii: false,
      tratarii: false,
      valorificarii: true,
      eliminarii: false
    },

    // Total cantitate
    totalCantitate: {
      tone: totalTone,
      mc: null
    },

    // Info punct lucru
    punctLucruInfo: null,

    // Observatii
    observatii: sale.notes || null,

    // Date
    dataIncarcare: sale.date,
    dataDescarcare: null
  }
}
