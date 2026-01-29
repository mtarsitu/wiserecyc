/**
 * Script pentru completarea automata a datelor firmelor (CUI, J, adresa)
 *
 * Rulare: npx tsx scripts/lookup-company-details.ts
 *
 * Acest script:
 * 1. Extrage furnizorii si clientii fara CUI din baza de date
 * 2. Cauta datele pe listafirme.ro
 * 3. Actualizeaza baza de date cu informatiile gasite
 *
 * Progresul este salvat incremental, daca se intrerupe, continua de unde a ramas.
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

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
const COMPANY_ID = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

// Progress file - pentru a continua de unde am ramas
const PROGRESS_FILE = path.join(__dirname, 'lookup-progress.json')
const RESULTS_FILE = path.join(__dirname, 'lookup-results.json')

interface CompanyData {
  cui: string | null
  reg_com: string | null
  address: string | null
  city: string | null
  county: string | null
}

interface ProgressData {
  processed: string[] // IDs already processed
  found: number
  notFound: number
  skipped: number
  errors: string[]
}

interface CompanyResult {
  id: string
  name: string
  type: 'supplier' | 'client'
  data: CompanyData | null
  status: 'found' | 'not_found' | 'skipped' | 'error'
  error?: string
}

// Names to skip (not real companies)
const SKIP_NAMES = [
  'PERSOANE FIZICE',
  'PERSOANA FIZICA',
  'PFA',
  'PARTICULARI',
  'NECUNOSCUT',
  'TEST',
  'DIVERSE',
  'ALTELE',
  'CLIENT',
  '0',
  'N/A',
  '-',
  'VANZARI CURTE',
]

function shouldSkip(name: string): boolean {
  const normalized = name.trim().toUpperCase()
  return SKIP_NAMES.some(skip => normalized.includes(skip) || normalized === skip)
}

function loadProgress(): ProgressData {
  if (fs.existsSync(PROGRESS_FILE)) {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))
  }
  return {
    processed: [],
    found: 0,
    notFound: 0,
    skipped: 0,
    errors: [],
  }
}

function saveProgress(progress: ProgressData) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2))
}

function loadResults(): CompanyResult[] {
  if (fs.existsSync(RESULTS_FILE)) {
    return JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'))
  }
  return []
}

function saveResults(results: CompanyResult[]) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2))
}

// Function to update a single company with found data
async function updateCompany(
  id: string,
  type: 'supplier' | 'client',
  data: CompanyData
): Promise<boolean> {
  const table = type === 'supplier' ? 'suppliers' : 'clients'

  const updateData: Record<string, string | null> = {}
  if (data.cui) updateData.cui = data.cui
  if (data.reg_com) updateData.reg_com = data.reg_com
  if (data.address) updateData.address = data.address
  if (data.city) updateData.city = data.city
  if (data.county) updateData.county = data.county

  if (Object.keys(updateData).length === 0) {
    return false
  }

  const { error } = await supabase
    .from(table)
    .update(updateData)
    .eq('id', id)

  if (error) {
    console.error(`Eroare la actualizare ${type} ${id}:`, error)
    return false
  }

  return true
}

// Main function to list companies without CUI
async function listCompaniesWithoutCUI() {
  console.log('==============================================')
  console.log('Lookup Company Details Script')
  console.log('==============================================')

  const progress = loadProgress()
  console.log(`Progres anterior: ${progress.processed.length} procesate, ${progress.found} gasite, ${progress.notFound} negasite, ${progress.skipped} omise`)

  // Get suppliers without CUI
  console.log('\nExtragere furnizori fara CUI...')
  const { data: suppliers, error: suppError } = await supabase
    .from('suppliers')
    .select('id, name')
    .eq('company_id', COMPANY_ID)
    .eq('is_active', true)
    .is('cui', null)
    .order('name')

  if (suppError) {
    console.error('Eroare la citire furnizori:', suppError)
    return
  }

  // Get clients without CUI
  console.log('Extragere clienti fara CUI...')
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .eq('company_id', COMPANY_ID)
    .eq('is_active', true)
    .is('cui', null)
    .order('name')

  if (clientError) {
    console.error('Eroare la citire clienti:', clientError)
    return
  }

  console.log(`\nTotal: ${suppliers?.length || 0} furnizori + ${clients?.length || 0} clienti = ${(suppliers?.length || 0) + (clients?.length || 0)} companii de cautat`)

  // Combine into single list
  interface CompanyToLookup {
    id: string
    name: string
    type: 'supplier' | 'client'
  }

  const companies: CompanyToLookup[] = [
    ...(suppliers || []).map(s => ({ ...s, type: 'supplier' as const })),
    ...(clients || []).map(c => ({ ...c, type: 'client' as const })),
  ]

  // Filter out already processed and skip names
  const toProcess = companies.filter(c => {
    if (progress.processed.includes(c.id)) return false
    if (shouldSkip(c.name)) {
      if (!progress.processed.includes(c.id)) {
        progress.processed.push(c.id)
        progress.skipped++
      }
      return false
    }
    return true
  })

  console.log(`\nDe procesat: ${toProcess.length} companii (dupa excluderi)\n`)

  // Save initial progress with skipped
  saveProgress(progress)

  // Output the list for manual processing or browser automation
  console.log('\n=== LISTA COMPANII DE CAUTAT ===\n')

  // Generate SQL for batch lookup
  const sqlFile = path.join(__dirname, 'companies-to-lookup.sql')
  let sqlContent = '-- Lista companiilor de cautat pe listafirme.ro\n'
  sqlContent += '-- Generat: ' + new Date().toISOString() + '\n\n'

  for (const company of toProcess) {
    const searchUrl = `https://www.listafirme.ro/search.asp?q=${encodeURIComponent(company.name)}`
    console.log(`[${company.type.toUpperCase()}] ${company.name}`)
    console.log(`  ID: ${company.id}`)
    console.log(`  URL: ${searchUrl}`)
    console.log('')

    sqlContent += `-- ${company.type}: ${company.name}\n`
    sqlContent += `-- ID: ${company.id}\n`
    sqlContent += `-- URL: ${searchUrl}\n`
    sqlContent += `-- UPDATE ${company.type === 'supplier' ? 'suppliers' : 'clients'} SET cui = '', reg_com = '', address = '', city = '', county = '' WHERE id = '${company.id}';\n\n`
  }

  fs.writeFileSync(sqlFile, sqlContent)
  console.log(`\nLista SQL salvata in: ${sqlFile}`)

  // Print statistics
  console.log('\n=== STATISTICI ===')
  console.log(`Total companii in DB fara CUI: ${companies.length}`)
  console.log(`Omise (persoane fizice, etc.): ${progress.skipped}`)
  console.log(`De procesat: ${toProcess.length}`)
  console.log(`Deja procesate: ${progress.processed.length - progress.skipped}`)
  console.log(`Gasite anterior: ${progress.found}`)
  console.log(`Negasite anterior: ${progress.notFound}`)

  return toProcess
}

// Function to apply results from JSON file to database
async function applyResults() {
  console.log('\n=== Aplicare rezultate in baza de date ===\n')

  const results = loadResults()
  if (results.length === 0) {
    console.log('Nu exista rezultate de aplicat.')
    console.log('Adaugati datele in fisierul lookup-results.json')
    return
  }

  let updated = 0
  let errors = 0

  for (const result of results) {
    if (result.status === 'found' && result.data) {
      console.log(`Actualizare ${result.type} "${result.name}"...`)
      const success = await updateCompany(result.id, result.type, result.data)
      if (success) {
        updated++
        console.log(`  ✓ Actualizat: CUI=${result.data.cui}, J=${result.data.reg_com}`)
      } else {
        errors++
        console.log(`  ✗ Eroare la actualizare`)
      }
    }
  }

  console.log(`\nRezultat: ${updated} actualizate, ${errors} erori`)
}

// Parse command line arguments
const args = process.argv.slice(2)

if (args.includes('--apply')) {
  applyResults()
} else {
  listCompaniesWithoutCUI()
}

// Export for use in other scripts
export {
  loadProgress,
  saveProgress,
  loadResults,
  saveResults,
  updateCompany,
  shouldSkip,
  COMPANY_ID,
  PROGRESS_FILE,
  RESULTS_FILE,
  type CompanyData,
  type ProgressData,
  type CompanyResult,
}
