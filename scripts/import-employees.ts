import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env file
const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key) env[key.trim()] = val.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const companyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

// Parse CSV
function parseCSV(content: string): Record<string, string>[] {
  const lines = content.split('\n').filter(line => line.trim())
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim())
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = []
    let current = ''
    let inQuotes = false

    for (const char of lines[i]) {
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] || ''
    })
    rows.push(row)
  }

  return rows
}

async function importEmployees() {
  console.log('Citire CSV plati incasari...')

  const csvPath = path.join(__dirname, '..', 'dateCSV', 'DATE ECOMETAL 2025 - plati incasari.csv')
  const csvContent = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCSV(csvContent)

  // Extract unique employee names from "Denumire:" column where it starts with "SALARIAT"
  const employeeNames = new Set<string>()

  for (const row of rows) {
    const denumire = row['Denumire:'] || ''
    if (denumire.startsWith('SALARIAT ')) {
      const name = denumire.replace('SALARIAT ', '').trim()
      if (name) {
        employeeNames.add(name)
      }
    }
  }

  console.log(`\nGasit ${employeeNames.size} salariati unici:`)
  const sortedNames = Array.from(employeeNames).sort()
  sortedNames.forEach((name, i) => console.log(`  ${i + 1}. ${name}`))

  // Check existing employees
  const { data: existingEmployees } = await supabase
    .from('employees')
    .select('full_name')
    .eq('company_id', companyId)

  const existingNames = new Set((existingEmployees || []).map(e => e.full_name.toUpperCase()))

  // Filter out already existing employees
  const newEmployees = sortedNames.filter(name => !existingNames.has(name.toUpperCase()))

  if (newEmployees.length === 0) {
    console.log('\nToti salariati exista deja in baza de date.')
    return
  }

  console.log(`\n${newEmployees.length} salariati noi de adaugat:`)
  newEmployees.forEach((name, i) => console.log(`  ${i + 1}. ${name}`))

  // Insert new employees
  const employeesToInsert = newEmployees.map(name => ({
    company_id: companyId,
    full_name: name,
    is_active: true,
  }))

  const { data, error } = await supabase
    .from('employees')
    .insert(employeesToInsert)
    .select()

  if (error) {
    console.error('Eroare la inserare:', error.message)
    return
  }

  console.log(`\n✅ ${data.length} salariati adaugati cu succes!`)
}

importEmployees().catch(console.error)
