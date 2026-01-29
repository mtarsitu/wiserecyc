import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8')
const env: Record<string, string> = {}
envContent.split('\n').forEach(line => {
  const [key, ...val] = line.split('=')
  if (key) env[key.trim()] = val.join('=').trim()
})

const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const companyId = '87ef7498-2f8c-4750-8c98-e9c96f30263e'

async function fixContractExpenses() {
  console.log('=== Actualizare cheltuieli pe contracte ===\n')

  // Get MUNICIPIUL VASLUI contract
  const { data: contracts } = await supabase
    .from('contracts')
    .select('id, contract_number')
    .eq('company_id', companyId)
    .eq('contract_number', 'MUNICIPIUL VASLUI')
    .single()

  if (!contracts) {
    console.log('Contract MUNICIPIUL VASLUI negasit!')
    return
  }

  console.log('Contract gasit:', contracts.id)

  // Find the 2 expenses that should be on this contract
  // 1. MANCARE - 600 RON - 2026-01-19
  // 2. MUNICIPIUL VASLUI - 2600 RON - 2026-01-21

  const { data: expense1 } = await supabase
    .from('expenses')
    .select('id, name, amount, date')
    .eq('company_id', companyId)
    .eq('name', 'MANCARE')
    .eq('amount', 600)
    .gte('date', '2026-01-19')
    .lte('date', '2026-01-20')
    .maybeSingle()

  const { data: expense2 } = await supabase
    .from('expenses')
    .select('id, name, amount, date')
    .eq('company_id', companyId)
    .eq('name', 'MUNICIPIUL VASLUI')
    .eq('amount', 2600)
    .gte('date', '2026-01-21')
    .lte('date', '2026-01-22')
    .maybeSingle()

  console.log('\nCheltuieli gasite:')
  if (expense1) console.log('1.', expense1.name, '-', expense1.amount, 'RON -', expense1.date)
  if (expense2) console.log('2.', expense2.name, '-', expense2.amount, 'RON -', expense2.date)

  // Update them to be attributed to contract
  const expenseIds = [expense1?.id, expense2?.id].filter(Boolean)

  if (expenseIds.length === 0) {
    console.log('\nNu s-au gasit cheltuielile!')
    return
  }

  const { error } = await supabase
    .from('expenses')
    .update({
      attribution_type: 'contract',
      attribution_id: contracts.id
    })
    .in('id', expenseIds)

  if (error) {
    console.error('Eroare:', error.message)
    return
  }

  console.log('\n✅ Actualizate', expenseIds.length, 'cheltuieli pe contractul MUNICIPIUL VASLUI')

  // Verify
  const { data: updated } = await supabase
    .from('expenses')
    .select('name, amount, attribution_type, attribution_id')
    .in('id', expenseIds)

  console.log('\nVerificare:')
  updated?.forEach(e => console.log(' -', e.name, e.amount, 'RON - attribution:', e.attribution_type))
}

fixContractExpenses()
