/**
 * Script de import vanzari din CSV pentru ECO METAL COLECT
 *
 * Rulare: npx tsx scripts/import-sales.ts
 *
 * Optiuni:
 *   --clear : Sterge vanzarile existente inainte de import
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseCSV, parseTimestamp, parsePaymentMethod, parseTransportType, parseNumber } from './lib/csv-parser.js'
import { normalizeMaterialName, newMaterials } from './lib/material-mapping.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables from .env file
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8')
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      if (key && valueParts.length > 0) {
        process.env[key.trim()] = valueParts.join('=').trim()
      }
    })
  }
}

loadEnv()

// Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Company ID pentru ECO METAL COLECT
const companyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

// CSV directory
const csvDir = path.join(__dirname, '..', 'dateCSV')

// Caches for lookups
const materialCache = new Map<string, string>()
const clientCache = new Map<string, string>()
const transporterCache = new Map<string, string>()
const vehicleCache = new Map<string, string>()

// Stats
const stats = {
  salesCreated: 0,
  salesItemsCreated: 0,
  clientsCreated: 0,
  transportersCreated: 0,
  materialsCreated: 0,
  cashTransactions: 0,
  errors: [] as string[],
}

// ============================================
// Helper Functions
// ============================================

async function loadExistingData() {
  console.log('Incarcare date existente...')

  // Materials
  const { data: materials } = await supabase
    .from('materials')
    .select('id, name')
    .eq('is_active', true)

  materials?.forEach(m => {
    materialCache.set(m.name.toLowerCase(), m.id)
  })
  console.log(`  - ${materialCache.size} materiale`)

  // Clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  clients?.forEach(c => {
    clientCache.set(c.name.toLowerCase(), c.id)
  })
  console.log(`  - ${clientCache.size} clienti`)

  // Transporters
  const { data: transporters } = await supabase
    .from('transporters')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  transporters?.forEach(t => {
    transporterCache.set(t.name.toLowerCase(), t.id)
  })
  console.log(`  - ${transporterCache.size} transportatori`)

  // Vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, plate_number')
    .eq('company_id', companyId)
    .eq('is_active', true)

  vehicles?.forEach(v => {
    vehicleCache.set(v.plate_number.toLowerCase().replace(/\s+/g, ''), v.id)
  })
  console.log(`  - ${vehicleCache.size} vehicule`)
}

async function getMaterialId(name: string): Promise<string | null> {
  const normalized = normalizeMaterialName(name)
  const key = normalized.toLowerCase()

  if (materialCache.has(key)) {
    return materialCache.get(key)!
  }

  // Try to find in database
  const { data } = await supabase
    .from('materials')
    .select('id')
    .ilike('name', normalized)
    .limit(1)

  if (data && data.length > 0) {
    materialCache.set(key, data[0].id)
    return data[0].id
  }

  // Create new material
  const newMaterial = newMaterials.find(m => m.name.toLowerCase() === key)
  const { data: created, error } = await supabase
    .from('materials')
    .insert({
      name: normalized,
      unit: 'kg',
      category: newMaterial?.category || 'altele',
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    stats.errors.push(`Eroare creare material ${normalized}: ${error.message}`)
    return null
  }

  materialCache.set(key, created.id)
  stats.materialsCreated++
  console.log(`Material creat: ${normalized}`)
  return created.id
}

async function getClientId(name: string): Promise<string | null> {
  if (!name) return null
  const key = name.toLowerCase().trim()

  if (clientCache.has(key)) {
    return clientCache.get(key)!
  }

  // Try to find in database
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name.trim())
    .limit(1)

  if (data && data.length > 0) {
    clientCache.set(key, data[0].id)
    return data[0].id
  }

  // Create new client
  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      company_id: companyId,
      name: name.trim(),
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    stats.errors.push(`Eroare creare client ${name}: ${error.message}`)
    return null
  }

  clientCache.set(key, created.id)
  stats.clientsCreated++
  console.log(`Client creat: ${name.trim()}`)
  return created.id
}

async function getTransporterId(name: string): Promise<string | null> {
  if (!name || name === 'CLIENT' || name === '0') return null
  const key = name.toLowerCase().trim()

  if (transporterCache.has(key)) {
    return transporterCache.get(key)!
  }

  // Try to find in database
  const { data } = await supabase
    .from('transporters')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name.trim())
    .limit(1)

  if (data && data.length > 0) {
    transporterCache.set(key, data[0].id)
    return data[0].id
  }

  // Create new transporter
  const { data: created, error } = await supabase
    .from('transporters')
    .insert({
      company_id: companyId,
      name: name.trim(),
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    stats.errors.push(`Eroare creare transportator ${name}: ${error.message}`)
    return null
  }

  transporterCache.set(key, created.id)
  stats.transportersCreated++
  console.log(`Transportator creat: ${name.trim()}`)
  return created.id
}

function getVehicleId(plateNumber: string): string | null {
  if (!plateNumber || plateNumber === 'CLIENT' || plateNumber === '0') return null
  const key = plateNumber.toLowerCase().replace(/\s+/g, '').trim()
  return vehicleCache.get(key) || null
}

async function clearExistingSales() {
  console.log('\nStergere vanzari existente pentru ECO METAL COLECT...')

  // Get existing sales
  const { data: sales } = await supabase
    .from('sales')
    .select('id')
    .eq('company_id', companyId)

  if (!sales || sales.length === 0) {
    console.log('Nu exista vanzari de sters.')
    return
  }

  console.log(`Gasit ${sales.length} vanzari de sters...`)

  const saleIds = sales.map(s => s.id)

  // Delete related cash transactions
  const { error: cashError } = await supabase
    .from('cash_transactions')
    .delete()
    .eq('source_type', 'sale')
    .in('source_id', saleIds)

  if (cashError) {
    console.error('Eroare stergere cash transactions:', cashError.message)
  }

  // Delete sale items
  const { error: itemsError } = await supabase
    .from('sale_items')
    .delete()
    .in('sale_id', saleIds)

  if (itemsError) {
    console.error('Eroare stergere sale items:', itemsError.message)
  }

  // Delete sales
  const { error: salesError } = await supabase
    .from('sales')
    .delete()
    .eq('company_id', companyId)

  if (salesError) {
    console.error('Eroare stergere sales:', salesError.message)
  } else {
    console.log(`Sterse ${sales.length} vanzari`)
  }
}

interface VanzariRow {
  Timestamp: string
  'Selecteaza clientul:': string
  'Selecteaza tipul de material vandut:': string
  'Introdu cantitatea in kg:': string
  'Introdu numarul bonului de cantar:': string
  'Introdu pretul per tona ron:': string
  'Curs valutar': string
  'Selecteaza forma de plata:': string
  'Provenienta marfa:': string
  'Transportul este:': string
  'Introdu pretul transportului:': string
  'Selecteaza transportatorul:': string
  'Suplimentare': string
}

async function importVanzari() {
  console.log('\n=== Import Vanzari ===')

  const filePath = path.join(csvDir, 'DATE ECOMETAL 2025 - vanzari.csv')
  if (!fs.existsSync(filePath)) {
    console.error('Fisierul vanzari.csv nu exista la:', filePath)
    return
  }

  const rows = parseCSV<VanzariRow>(filePath)
  console.log(`Citite ${rows.length} randuri din CSV`)

  // Cash register IDs
  const CASIERIE_CASH = '46584a1b-f341-42d1-b8ea-c5933cc11a34' // C1
  const CASA_M = '4a700d05-7b58-424c-9d2a-a3f24cab1932'         // C2
  const BANCA = 'f30f1ce4-3a6a-47a5-9270-319adb6551c5'          // B

  let processed = 0
  for (const row of rows) {
    const ts = parseTimestamp(row.Timestamp)
    if (!ts) {
      stats.errors.push(`Skip: timestamp invalid "${row.Timestamp}"`)
      continue
    }

    // Skip records not from 2026
    if (!ts.date.startsWith('2026-')) continue

    // Get client
    const clientName = row['Selecteaza clientul:']
    if (!clientName) {
      stats.errors.push(`Skip: client gol la ${ts.date}`)
      continue
    }

    const clientId = await getClientId(clientName)
    if (!clientId) {
      stats.errors.push(`Skip vanzare: nu s-a putut crea clientul ${clientName}`)
      continue
    }

    // Get material
    const materialName = row['Selecteaza tipul de material vandut:']
    const materialId = await getMaterialId(materialName)
    if (!materialId) {
      stats.errors.push(`Skip vanzare: material ${materialName} nu s-a putut crea`)
      continue
    }

    // Get transporter and check if it's actually a vehicle plate
    const transporterField = row['Selecteaza transportatorul:']
    let transporterId: string | null = null
    let vehicleId: string | null = null

    // Check if it looks like a plate number (e.g., "B 204 EMC", "IF 52 MRN")
    const isPlateNumber = /^[A-Z]{1,2}\s*\d+\s*[A-Z]{2,3}$/.test(transporterField?.trim() || '')

    if (isPlateNumber) {
      vehicleId = getVehicleId(transporterField)
    } else {
      transporterId = await getTransporterId(transporterField)
    }

    const quantity = parseNumber(row['Introdu cantitatea in kg:'])
    const pricePerTon = parseNumber(row['Introdu pretul per tona ron:'])
    const pricePerKg = pricePerTon / 1000
    const transportPrice = parseNumber(row['Introdu pretul transportului:'])
    const rawPaymentMethod = row['Selecteaza forma de plata:']?.trim().toUpperCase()
    const paymentMethod = parsePaymentMethod(rawPaymentMethod || '')
    const transportType = parseTransportType(row['Transportul este:'])

    // Determine attribution_type (valid: 'contract' | 'punct_lucru' | 'deee' | null)
    const provenienta = row['Provenienta marfa:']?.trim().toUpperCase()
    let attributionType: 'contract' | 'punct_lucru' | 'deee' | null = null
    if (provenienta && provenienta !== 'CURTE') {
      attributionType = 'contract'
    }

    const lineTotal = quantity * pricePerKg

    // Create sale
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        company_id: companyId,
        date: ts.date,
        client_id: clientId,
        payment_method: paymentMethod,
        attribution_type: attributionType,
        transport_type: transportType,
        transport_price: transportPrice,
        transporter_id: transporterId,
        vehicle_id: vehicleId,
        scale_number: row['Introdu numarul bonului de cantar:'] || null,
        total_amount: lineTotal,
        status: 'pending',
      })
      .select('id')
      .single()

    if (saleError) {
      stats.errors.push(`Eroare creare vanzare la ${ts.date}: ${saleError.message}`)
      continue
    }

    // Create sale item
    const { error: itemError } = await supabase
      .from('sale_items')
      .insert({
        sale_id: sale.id,
        material_id: materialId,
        quantity,
        impurities_percent: 0,
        final_quantity: quantity,
        price_per_kg_ron: pricePerKg,
        line_total: lineTotal,
      })

    if (itemError) {
      stats.errors.push(`Eroare creare sale item: ${itemError.message}`)
    } else {
      stats.salesItemsCreated++
    }

    // Determine register based on payment method
    let registerId = CASIERIE_CASH
    if (rawPaymentMethod === 'B') {
      registerId = BANCA
    } else if (rawPaymentMethod === 'C2') {
      registerId = CASA_M
    }

    // Create cash transaction for sale (income)
    if (lineTotal > 0) {
      const { error: cashError } = await supabase
        .from('cash_transactions')
        .insert({
          company_id: companyId,
          cash_register_id: registerId,
          date: ts.date,
          type: 'income',
          amount: lineTotal,
          description: `Vanzare ${clientName} - ${materialName}`,
          source_type: 'sale',
          source_id: sale.id,
        })

      if (cashError) {
        stats.errors.push(`Eroare tranzactie cash vanzare: ${cashError.message}`)
      } else {
        stats.cashTransactions++
      }
    }

    stats.salesCreated++
    processed++

    if (processed % 20 === 0) {
      console.log(`Procesate ${processed} vanzari...`)
    }
  }

  console.log(`\nImport finalizat!`)
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('==============================================')
  console.log('Import Vanzari pentru ECO METAL COLECT')
  console.log('==============================================')

  const shouldClear = process.argv.includes('--clear')

  try {
    await loadExistingData()

    if (shouldClear) {
      await clearExistingSales()
    }

    await importVanzari()

    // Print statistics
    console.log('\n==============================================')
    console.log('STATISTICI')
    console.log('==============================================')
    console.log(`Vanzari create: ${stats.salesCreated}`)
    console.log(`Sale items: ${stats.salesItemsCreated}`)
    console.log(`Clienti creati: ${stats.clientsCreated}`)
    console.log(`Transportatori creati: ${stats.transportersCreated}`)
    console.log(`Materiale create: ${stats.materialsCreated}`)
    console.log(`Tranzactii cash: ${stats.cashTransactions}`)

    if (stats.errors.length > 0) {
      console.log(`\nErori (${stats.errors.length}):`)
      stats.errors.slice(0, 30).forEach(e => console.log(`  - ${e}`))
      if (stats.errors.length > 30) {
        console.log(`  ... si inca ${stats.errors.length - 30} erori`)
      }
    }

  } catch (error) {
    console.error('Eroare fatala:', error)
    process.exit(1)
  }
}

main()
