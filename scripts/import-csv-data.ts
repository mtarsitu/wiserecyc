/**
 * Script de import date din CSV pentru ECO METAL COLECT
 *
 * Rulare: npx tsx scripts/import-csv-data.ts
 *
 * ATENTIE: Inainte de rulare, asigura-te ca:
 * 1. Exista fisierul .env cu VITE_SUPABASE_URL si VITE_SUPABASE_ANON_KEY (sau SUPABASE_SERVICE_ROLE_KEY)
 * 2. Compania "ECO METAL COLECT" exista in baza de date
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { parseCSV, parseTimestamp, parsePaymentStatus, parsePaymentMethod, parseTransportType, parseNumber } from './lib/csv-parser.js'
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

// CSV directory
const csvDir = path.join(__dirname, '..', 'dateCSV')

// Caches for lookups
const materialCache = new Map<string, string>() // name -> id
const supplierCache = new Map<string, string>() // name -> id
const clientCache = new Map<string, string>() // name -> id
const transporterCache = new Map<string, string>() // name -> id
const contractCache = new Map<string, string>() // name -> id
const categoryCache = new Map<string, string>() // name -> id

// Company ID pentru ECO METAL COLECT
let companyId: string = ''

// Statistics
const stats = {
  materials: { created: 0, existing: 0 },
  suppliers: { created: 0, existing: 0 },
  clients: { created: 0, existing: 0 },
  transporters: { created: 0, existing: 0 },
  contracts: { created: 0, existing: 0 },
  categories: { created: 0, existing: 0 },
  acquisitions: { created: 0, items: 0 },
  sales: { created: 0, items: 0 },
  expenses: { created: 0 },
  dismantlings: { created: 0, outputs: 0 },
  cashTransactions: 0,
  errors: [] as string[],
}

// ============================================
// Helper Functions
// ============================================

async function findOrCreateCompany(): Promise<string> {
  // ID-ul companiei ECO METAL COLECT - cunoscut din baza de date
  const knownCompanyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'
  console.log(`Folosim compania ECO METAL COLECT (${knownCompanyId})`)
  return knownCompanyId
}

async function loadExistingMaterials() {
  console.log('Incarcare materiale existente...')
  const { data, error } = await supabase
    .from('materials')
    .select('id, name')
    .eq('is_active', true)

  if (error) {
    console.error('Eroare la incarcare materiale:', error)
    return
  }

  data?.forEach(m => {
    materialCache.set(m.name.toLowerCase(), m.id)
  })
  console.log(`Incarcate ${materialCache.size} materiale`)
}

async function loadExistingEntities() {
  console.log('Incarcare entitati existente...')

  // Suppliers
  const { data: suppliers } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  suppliers?.forEach(s => {
    supplierCache.set(s.name.toLowerCase(), s.id)
  })

  // Clients
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  clients?.forEach(c => {
    clientCache.set(c.name.toLowerCase(), c.id)
  })

  // Transporters
  const { data: transporters } = await supabase
    .from('transporters')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('is_active', true)

  transporters?.forEach(t => {
    transporterCache.set(t.name.toLowerCase(), t.id)
  })

  // Contracts
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_number')
    .eq('company_id', companyId)

  contracts?.forEach(c => {
    if (c.contract_number) {
      contractCache.set(c.contract_number.toLowerCase(), c.id)
    }
  })

  // Expense categories
  const { data: categories } = await supabase
    .from('expense_categories')
    .select('id, name')
    .eq('company_id', companyId)

  categories?.forEach(c => {
    categoryCache.set(c.name.toLowerCase(), c.id)
  })

  console.log(`Incarcate: ${supplierCache.size} furnizori, ${clientCache.size} clienti, ${transporterCache.size} transportatori, ${contractCache.size} contracte, ${categoryCache.size} categorii`)
}

// ============================================
// Material Functions
// ============================================

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
  stats.materials.created++
  console.log(`Material creat: ${normalized}`)
  return created.id
}

// ============================================
// Supplier Functions
// ============================================

async function getSupplierId(name: string): Promise<string | null> {
  if (!name) return null
  const key = name.toLowerCase().trim()

  if (supplierCache.has(key)) {
    return supplierCache.get(key)!
  }

  // Try to find in database
  const { data } = await supabase
    .from('suppliers')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name.trim())
    .limit(1)

  if (data && data.length > 0) {
    supplierCache.set(key, data[0].id)
    stats.suppliers.existing++
    return data[0].id
  }

  // Create new supplier
  const { data: created, error } = await supabase
    .from('suppliers')
    .insert({
      company_id: companyId,
      name: name.trim(),
      is_active: true,
    })
    .select('id')
    .single()

  if (error) {
    stats.errors.push(`Eroare creare furnizor ${name}: ${error.message}`)
    return null
  }

  supplierCache.set(key, created.id)
  stats.suppliers.created++
  return created.id
}

// ============================================
// Client Functions
// ============================================

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
    stats.clients.existing++
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
  stats.clients.created++
  return created.id
}

// ============================================
// Transporter Functions
// ============================================

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
    stats.transporters.existing++
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
  stats.transporters.created++
  return created.id
}

// ============================================
// Category Functions
// ============================================

async function getCategoryId(name: string): Promise<string | null> {
  if (!name || name === 'C1') return null
  const key = name.toLowerCase().trim()

  if (categoryCache.has(key)) {
    return categoryCache.get(key)!
  }

  // Try to find in database
  const { data } = await supabase
    .from('expense_categories')
    .select('id')
    .eq('company_id', companyId)
    .ilike('name', name.trim())
    .limit(1)

  if (data && data.length > 0) {
    categoryCache.set(key, data[0].id)
    stats.categories.existing++
    return data[0].id
  }

  // Create new category
  const { data: created, error } = await supabase
    .from('expense_categories')
    .insert({
      company_id: companyId,
      name: name.trim(),
    })
    .select('id')
    .single()

  if (error) {
    stats.errors.push(`Eroare creare categorie ${name}: ${error.message}`)
    return null
  }

  categoryCache.set(key, created.id)
  stats.categories.created++
  return created.id
}

// ============================================
// Contract Functions
// ============================================

async function getContractId(name: string): Promise<string | null> {
  if (!name) return null
  const key = name.toLowerCase().trim()

  if (contractCache.has(key)) {
    return contractCache.get(key)!
  }

  // Try to find in database
  const { data } = await supabase
    .from('contracts')
    .select('id')
    .eq('company_id', companyId)
    .ilike('contract_number', name.trim())
    .limit(1)

  if (data && data.length > 0) {
    contractCache.set(key, data[0].id)
    return data[0].id
  }

  return null
}

// ============================================
// Import Functions
// ============================================

interface IntrariRow {
  Timestamp: string
  'Email Address': string
  'SELECTEAZA FURNIZOR': string
  'SELECTEAZA TIP DE MATERIAL:': string
  'INTRODU CANTITATEA in KG  (foloseste punct, nu virgula) :': string
  'Introdu impuritatile in kg:': string
  'Introdu pretul per kg:': string
  'Achitat sau nu?': string
  'Introdu numarul de bon': string
  'Selecteaza procentul % fondului de mediu:': string
  'Suplimentare:': string
}

async function importIntrari() {
  console.log('\n=== Import Achizitii (intrari.csv) ===')

  const filePath = path.join(csvDir, 'DATE ECOMETAL 2025 - intrari.csv')
  if (!fs.existsSync(filePath)) {
    console.log('Fisierul intrari.csv nu exista')
    return
  }

  const rows = parseCSV<IntrariRow>(filePath)
  console.log(`Citite ${rows.length} randuri`)

  // Group rows by (date, receipt_number) to create single acquisitions with multiple items
  // Filter only 2026 data
  const groups = new Map<string, IntrariRow[]>()

  for (const row of rows) {
    const ts = parseTimestamp(row.Timestamp)
    if (!ts) continue

    // Skip records not from 2026
    if (!ts.date.startsWith('2026-')) continue

    const receiptNum = row['Introdu numarul de bon'] || 'unknown'
    const key = `${ts.date}-${receiptNum}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(row)
  }

  console.log(`Grupate in ${groups.size} achizitii`)

  let processed = 0
  for (const [key, items] of groups) {
    const firstRow = items[0]
    const ts = parseTimestamp(firstRow.Timestamp)!

    // Get supplier
    const supplierName = firstRow['SELECTEAZA FURNIZOR']
    const supplierId = await getSupplierId(supplierName)
    if (!supplierId) {
      stats.errors.push(`Skip achizitie ${key}: nu s-a putut crea furnizorul ${supplierName}`)
      continue
    }

    // Determine payment status
    const paymentStatus = parsePaymentStatus(firstRow['Achitat sau nu?'])

    // Calculate environment fund from first row
    const envFundPercent = parseNumber(firstRow['Selecteaza procentul % fondului de mediu:'])

    // Create acquisition
    const { data: acquisition, error: acqError } = await supabase
      .from('acquisitions')
      .insert({
        company_id: companyId,
        date: ts.date,
        supplier_id: supplierId,
        location_type: 'curte',
        payment_status: paymentStatus,
        receipt_number: firstRow['Introdu numarul de bon'] || null,
        environment_fund: envFundPercent,
        total_amount: 0, // Will calculate after items
      })
      .select('id')
      .single()

    if (acqError) {
      stats.errors.push(`Eroare creare achizitie ${key}: ${acqError.message}`)
      continue
    }

    let totalAmount = 0

    // Create items
    for (const row of items) {
      const materialName = row['SELECTEAZA TIP DE MATERIAL:']
      const materialId = await getMaterialId(materialName)
      if (!materialId) {
        stats.errors.push(`Skip item: material ${materialName} nu s-a putut crea`)
        continue
      }

      const quantity = parseNumber(row['INTRODU CANTITATEA in KG  (foloseste punct, nu virgula) :'])
      const impurities = parseNumber(row['Introdu impuritatile in kg:'])
      const pricePerKg = parseNumber(row['Introdu pretul per kg:'])
      const impuritiesPercent = quantity > 0 ? (impurities / quantity) * 100 : 0
      const finalQuantity = quantity - impurities
      const lineTotal = finalQuantity * pricePerKg

      // Determine acquisition_type from Suplimentare column
      // O = plusuri (zero), D = delegat/director, S = supliment stoc
      const supl = row['Suplimentare:']?.trim().toUpperCase() || ''
      let acquisitionType: 'normal' | 'zero' | 'director' | 'stoc' = 'normal'
      if (supl === 'O' || supl === '0') acquisitionType = 'zero'
      else if (supl === 'D') acquisitionType = 'director'
      else if (supl === 'S') acquisitionType = 'stoc'

      const { error: itemError } = await supabase
        .from('acquisition_items')
        .insert({
          acquisition_id: acquisition.id,
          material_id: materialId,
          quantity,
          impurities_percent: impuritiesPercent,
          final_quantity: finalQuantity,
          price_per_kg: pricePerKg,
          line_total: lineTotal,
          acquisition_type: acquisitionType,
        })

      if (itemError) {
        stats.errors.push(`Eroare creare item: ${itemError.message}`)
      } else {
        stats.acquisitions.items++
        totalAmount += lineTotal
      }
    }

    // Update total amount
    await supabase
      .from('acquisitions')
      .update({ total_amount: totalAmount })
      .eq('id', acquisition.id)

    // Create cash transaction for paid acquisitions
    if (paymentStatus === 'paid' && totalAmount > 0) {
      const cashRegisterId = '46584a1b-f341-42d1-b8ea-c5933cc11a34' // Casierie Cash
      const { error: cashError } = await supabase
        .from('cash_transactions')
        .insert({
          company_id: companyId,
          cash_register_id: cashRegisterId,
          date: ts.date,
          type: 'expense', // bani ies din casa
          amount: totalAmount,
          description: `Achizitie ${supplierName} - bon ${firstRow['Introdu numarul de bon'] || 'N/A'}`,
          source_type: 'acquisition',
          source_id: acquisition.id,
        })

      if (cashError) {
        stats.errors.push(`Eroare creare tranzactie cash: ${cashError.message}`)
      } else {
        stats.cashTransactions++
      }
    }

    stats.acquisitions.created++
    processed++

    if (processed % 50 === 0) {
      console.log(`Procesate ${processed}/${groups.size} achizitii...`)
    }
  }

  console.log(`Import achizitii finalizat: ${stats.acquisitions.created} achizitii, ${stats.acquisitions.items} items`)
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
}

async function importVanzari() {
  console.log('\n=== Import Vanzari (vanzari.csv) ===')

  const filePath = path.join(csvDir, 'DATE ECOMETAL 2025 - vanzari.csv')
  if (!fs.existsSync(filePath)) {
    console.log('Fisierul vanzari.csv nu exista')
    return
  }

  const rows = parseCSV<VanzariRow>(filePath)
  console.log(`Citite ${rows.length} randuri`)

  for (const row of rows) {
    const ts = parseTimestamp(row.Timestamp)
    if (!ts) continue

    // Skip records not from 2026
    if (!ts.date.startsWith('2026-')) continue

    // Get client
    const clientName = row['Selecteaza clientul:']
    if (!clientName) continue

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

    // Get transporter
    const transporterName = row['Selecteaza transportatorul:']
    const transporterId = await getTransporterId(transporterName)

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
        scale_number: row['Introdu numarul bonului de cantar:'] || null,
        total_amount: lineTotal,
        status: 'pending',
      })
      .select('id')
      .single()

    if (saleError) {
      stats.errors.push(`Eroare creare vanzare: ${saleError.message}`)
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
      stats.sales.items++
    }

    // Create cash transaction for sale (income)
    // Cash register IDs
    const CASIERIE_CASH = '46584a1b-f341-42d1-b8ea-c5933cc11a34' // C1
    const CASA_M = '4a700d05-7b58-424c-9d2a-a3f24cab1932'         // C2
    const BANCA = 'f30f1ce4-3a6a-47a5-9270-319adb6551c5'          // B

    // Determine register based on payment method
    let registerId = CASIERIE_CASH
    if (rawPaymentMethod === 'B') {
      registerId = BANCA
    } else if (rawPaymentMethod === 'C2') {
      registerId = CASA_M
    }

    if (lineTotal > 0) {
      const { error: cashError } = await supabase
        .from('cash_transactions')
        .insert({
          company_id: companyId,
          cash_register_id: registerId,
          date: ts.date,
          type: 'income', // vanzare = bani intra
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

    stats.sales.created++
  }

  console.log(`Import vanzari finalizat: ${stats.sales.created} vanzari, ${stats.sales.items} items`)
}

interface PlatiRow {
  Timestamp: string
  'Denumire:': string
  'Introdu suma: (nu folosi virgula foloseste punctul, EX: 125.25-foloseste punct)': string
  'Plata sau incasare?': string
  'Selecteaza forma de plata: (daca selectezi cheltuieli contracte doar iti va adauga suma cheltuita la cheltuielile contractuluii respectiv nu va scadea banii din casa)': string
  'Selecteaza categoria: (pentru a putea avea calcule cat mai exacte este nevoie ca orice plata sa faca parte dintr-o categorie)': string
  'Adauga mentiuni daca exista:': string
  'Atribuie cheltuiala:  (daca cheltuiala face parte din curte, selecteaza CURTE, daca face parte dintr-un anume contract selecteaza-l pe acela)': string
}

async function importPlatiIncasari() {
  console.log('\n=== Import Plati/Incasari (plati incasari.csv) ===')

  const filePath = path.join(csvDir, 'DATE ECOMETAL 2025 - plati incasari.csv')
  if (!fs.existsSync(filePath)) {
    console.log('Fisierul plati incasari.csv nu exista')
    return
  }

  const rows = parseCSV<PlatiRow>(filePath)
  console.log(`Citite ${rows.length} randuri`)

  for (const row of rows) {
    const ts = parseTimestamp(row.Timestamp)
    if (!ts) continue

    // Skip records not from 2026
    if (!ts.date.startsWith('2026-')) continue

    const name = row['Denumire:']
    if (!name) continue

    const amount = parseNumber(row['Introdu suma: (nu folosi virgula foloseste punctul, EX: 125.25-foloseste punct)'])
    const type = row['Plata sau incasare?']?.trim().toUpperCase() === 'I' ? 'collection' : 'payment'
    const rawPaymentMethod = row['Selecteaza forma de plata: (daca selectezi cheltuieli contracte doar iti va adauga suma cheltuita la cheltuielile contractuluii respectiv nu va scadea banii din casa)']?.trim().toUpperCase()
    const paymentMethod = parsePaymentMethod(rawPaymentMethod || '')
    const categoryName = row['Selecteaza categoria: (pentru a putea avea calcule cat mai exacte este nevoie ca orice plata sa faca parte dintr-o categorie)']
    const notes = row['Adauga mentiuni daca exista:']
    const attribution = row['Atribuie cheltuiala:  (daca cheltuiala face parte din curte, selecteaza CURTE, daca face parte dintr-un anume contract selecteaza-l pe acela)']

    // Get or create category
    const categoryId = await getCategoryId(categoryName)

    // Determine attribution (valid: 'contract' | 'punct_lucru' | 'deee' | null)
    let attributionType: 'contract' | 'punct_lucru' | 'deee' | null = null
    let attributionId: string | null = null

    if (attribution) {
      if (attribution.toUpperCase() === 'CURTE') {
        // CURTE = punct de lucru
        attributionType = 'punct_lucru'
      } else {
        // Try to find contract
        const contractId = await getContractId(attribution)
        if (contractId) {
          attributionType = 'contract'
          attributionId = contractId
        }
      }
    }

    // Create expense
    const { data: expense, error } = await supabase
      .from('expenses')
      .insert({
        company_id: companyId,
        date: ts.date,
        name,
        amount,
        type,
        payment_method: paymentMethod,
        category_id: categoryId,
        attribution_type: attributionType,
        attribution_id: attributionId,
        notes: notes || null,
      })
      .select('id')
      .single()

    if (error) {
      stats.errors.push(`Eroare creare cheltuiala ${name}: ${error.message}`)
    } else {
      stats.expenses.created++

      // Cash register IDs
      const CASIERIE_CASH = '46584a1b-f341-42d1-b8ea-c5933cc11a34' // C1
      const CASA_M = '4a700d05-7b58-424c-9d2a-a3f24cab1932'         // C2
      const BANCA = 'f30f1ce4-3a6a-47a5-9270-319adb6551c5'          // B

      // Determine source register based on payment method (B/C1/C2)
      let sourceRegisterId = CASIERIE_CASH
      if (rawPaymentMethod === 'B') {
        sourceRegisterId = BANCA
      } else if (rawPaymentMethod === 'C2') {
        sourceRegisterId = CASA_M
      }

      const isTransferCase = name.toUpperCase().includes('TRANSFER CASE')

      if (amount > 0) {
        if (isTransferCase) {
          // TRANSFER CASE: expense din sursa, income in Casierie Cash
          // 1. Expense din sursa (bank sau alta casa)
          const { error: e1 } = await supabase
            .from('cash_transactions')
            .insert({
              company_id: companyId,
              cash_register_id: sourceRegisterId,
              date: ts.date,
              type: 'expense',
              amount,
              description: `${name} (transfer OUT)`,
              source_type: 'expense',
              source_id: expense.id,
            })
          if (!e1) stats.cashTransactions++

          // 2. Income in Casierie Cash
          const { error: e2 } = await supabase
            .from('cash_transactions')
            .insert({
              company_id: companyId,
              cash_register_id: CASIERIE_CASH,
              date: ts.date,
              type: 'income',
              amount,
              description: `${name} (transfer IN)`,
              source_type: 'expense',
              source_id: expense.id,
            })
          if (!e2) stats.cashTransactions++
        } else {
          // Normal payment/collection
          // P (Plata) = expense (bani ies), I (Incasare) = income (bani intra)
          const cashTransactionType = type === 'payment' ? 'expense' : 'income'

          const { error: cashError } = await supabase
            .from('cash_transactions')
            .insert({
              company_id: companyId,
              cash_register_id: sourceRegisterId,
              date: ts.date,
              type: cashTransactionType,
              amount,
              description: name,
              source_type: 'expense',
              source_id: expense.id,
            })

          if (cashError) {
            stats.errors.push(`Eroare tranzactie cash ${name}: ${cashError.message}`)
          } else {
            stats.cashTransactions++
          }
        }
      }
    }
  }

  console.log(`Import cheltuieli finalizat: ${stats.expenses.created}`)
}

interface DezmembrariRow {
  Timestamp: string
  'Alege de unde dezmembrezi: (Curte sau un contract anume)': string
  'Alege din ce material dezmembrezi:': string
  'Alege ce tip de material ai obtinut din dezmembrare:': string
  'Introdu cantitatea obtinuta a materialului mai sus mentionat:': string
  'Detalii suplimentare?': string
}

async function importDezmembrari() {
  console.log('\n=== Import Dezmembrari (dezmembrari.csv) ===')

  const filePath = path.join(csvDir, 'DATE ECOMETAL 2025 - dezmembrari.csv')
  if (!fs.existsSync(filePath)) {
    console.log('Fisierul dezmembrari.csv nu exista')
    return
  }

  const rows = parseCSV<DezmembrariRow>(filePath)
  console.log(`Citite ${rows.length} randuri`)

  for (const row of rows) {
    const ts = parseTimestamp(row.Timestamp)
    if (!ts) continue

    // Skip records not from 2026
    if (!ts.date.startsWith('2026-')) continue

    // Get source material
    const sourceMaterialName = row['Alege din ce material dezmembrezi:']
    const sourceMaterialId = await getMaterialId(sourceMaterialName)
    if (!sourceMaterialId) {
      stats.errors.push(`Skip dezmembrare: material sursa ${sourceMaterialName} nu s-a putut crea`)
      continue
    }

    // Get output material
    const outputMaterialName = row['Alege ce tip de material ai obtinut din dezmembrare:']
    const outputMaterialId = await getMaterialId(outputMaterialName)
    if (!outputMaterialId) {
      stats.errors.push(`Skip dezmembrare: material output ${outputMaterialName} nu s-a putut crea`)
      continue
    }

    const quantity = parseNumber(row['Introdu cantitatea obtinuta a materialului mai sus mentionat:'])
    const location = row['Alege de unde dezmembrezi: (Curte sau un contract anume)']?.trim().toUpperCase()
    const locationType = location === 'CURTE' ? 'curte' : 'contract'
    const notes = row['Detalii suplimentare?']

    // Create dismantling
    const { data: dismantling, error: dismError } = await supabase
      .from('dismantlings')
      .insert({
        company_id: companyId,
        date: ts.date,
        location_type: locationType,
        source_material_id: sourceMaterialId,
        source_quantity: 0, // Not provided in CSV
        notes: notes || null,
      })
      .select('id')
      .single()

    if (dismError) {
      stats.errors.push(`Eroare creare dezmembrare: ${dismError.message}`)
      continue
    }

    // Create output
    const { error: outputError } = await supabase
      .from('dismantling_outputs')
      .insert({
        dismantling_id: dismantling.id,
        material_id: outputMaterialId,
        quantity,
      })

    if (outputError) {
      stats.errors.push(`Eroare creare output dezmembrare: ${outputError.message}`)
    } else {
      stats.dismantlings.outputs++
    }

    stats.dismantlings.created++
  }

  console.log(`Import dezmembrari finalizat: ${stats.dismantlings.created} dezmembrari, ${stats.dismantlings.outputs} outputs`)
}

interface DateNoiRow {
  Timestamp: string
  'Alege de mai jos categoria potrivita:': string
  'Introdu numele Materialului:': string
  'Introdu numele Contractului:': string
  'Introdu cantitatea contractata in tone': string
  'Introdu numele Furnizorului:': string
  'Introdu numele Clientului:': string
  'Introdu numele Platii:': string
  'Introdu numele Transportatorului:': string
  'Introdu numele Categoriei de cheltuieli:': string
}

async function importDateNoi() {
  console.log('\n=== Import Date Referinta (date noi.csv) ===')

  const filePath = path.join(csvDir, 'DATE ECOMETAL 2025 - date noi.csv')
  if (!fs.existsSync(filePath)) {
    console.log('Fisierul date noi.csv nu exista')
    return
  }

  const rows = parseCSV<DateNoiRow>(filePath)
  console.log(`Citite ${rows.length} randuri`)

  for (const row of rows) {
    const category = row['Alege de mai jos categoria potrivita:']?.trim().toUpperCase()

    if (category === 'FURNIZORI' || !category) {
      const name = row['Introdu numele Furnizorului:']
      if (name) await getSupplierId(name)
    }

    if (category === 'CLIENTI') {
      const name = row['Introdu numele Clientului:']
      if (name) await getClientId(name)
    }

    if (category === 'TRANSPORT') {
      const name = row['Introdu numele Transportatorului:']
      if (name) await getTransporterId(name)
    }

    if (category === 'TIP MATERIAL') {
      const name = row['Introdu numele Materialului:']
      if (name) await getMaterialId(name)
    }

    if (category === 'CONTRACTE') {
      const name = row['Introdu numele Contractului:']
      const quantity = parseNumber(row['Introdu cantitatea contractata in tone'])

      if (name && !contractCache.has(name.toLowerCase())) {
        const { data, error } = await supabase
          .from('contracts')
          .insert({
            company_id: companyId,
            contract_number: name,
            value: quantity * 1000, // Convert to kg
            status: 'active',
          })
          .select('id')
          .single()

        if (!error && data) {
          contractCache.set(name.toLowerCase(), data.id)
          stats.contracts.created++
        }
      }
    }
  }

  console.log('Import date referinta finalizat')
}

// ============================================
// Main
// ============================================

async function main() {
  console.log('==============================================')
  console.log('Import date CSV pentru ECO METAL COLECT')
  console.log('==============================================')

  try {
    // Find or create company
    companyId = await findOrCreateCompany()

    // Load existing data
    await loadExistingMaterials()
    await loadExistingEntities()

    // Import in order
    await importDateNoi()
    await importIntrari()
    await importVanzari()
    await importPlatiIncasari()
    await importDezmembrari()

    // Print statistics
    console.log('\n==============================================')
    console.log('STATISTICI IMPORT')
    console.log('==============================================')
    console.log(`Materiale: ${stats.materials.created} create`)
    console.log(`Furnizori: ${stats.suppliers.created} creati, ${stats.suppliers.existing} existenti`)
    console.log(`Clienti: ${stats.clients.created} creati, ${stats.clients.existing} existenti`)
    console.log(`Transportatori: ${stats.transporters.created} creati`)
    console.log(`Contracte: ${stats.contracts.created} create`)
    console.log(`Categorii: ${stats.categories.created} create`)
    console.log(`Achizitii: ${stats.acquisitions.created} create, ${stats.acquisitions.items} items`)
    console.log(`Vanzari: ${stats.sales.created} create, ${stats.sales.items} items`)
    console.log(`Cheltuieli: ${stats.expenses.created} create`)
    console.log(`Dezmembrari: ${stats.dismantlings.created} create, ${stats.dismantlings.outputs} outputs`)
    console.log(`Tranzactii cash: ${stats.cashTransactions} create`)

    if (stats.errors.length > 0) {
      console.log(`\nErori (${stats.errors.length}):`)
      stats.errors.slice(0, 20).forEach(e => console.log(`  - ${e}`))
      if (stats.errors.length > 20) {
        console.log(`  ... si inca ${stats.errors.length - 20} erori`)
      }
    }

  } catch (error) {
    console.error('Eroare fatala:', error)
    process.exit(1)
  }
}

main()
