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

async function cleanupData() {
  console.log('Stergere date vechi pentru compania ECO METAL COLECT...')

  // Get IDs for child table deletes
  const { data: acquisitions } = await supabase.from('acquisitions').select('id').eq('company_id', companyId)
  const { data: sales } = await supabase.from('sales').select('id').eq('company_id', companyId)
  const { data: dismantlings } = await supabase.from('dismantlings').select('id').eq('company_id', companyId)

  const acqIds = acquisitions?.map(a => a.id) || []
  const saleIds = sales?.map(s => s.id) || []
  const dismIds = dismantlings?.map(d => d.id) || []

  // Delete child tables first
  if (acqIds.length > 0) {
    console.log(`Stergere ${acqIds.length} acquisition_items...`)
    const { error } = await supabase.from('acquisition_items').delete().in('acquisition_id', acqIds)
    if (error) console.log('Error acquisition_items:', error.message)
  }

  if (saleIds.length > 0) {
    console.log(`Stergere ${saleIds.length} sale_items...`)
    const { error } = await supabase.from('sale_items').delete().in('sale_id', saleIds)
    if (error) console.log('Error sale_items:', error.message)
  }

  if (dismIds.length > 0) {
    console.log(`Stergere ${dismIds.length} dismantling_outputs...`)
    const { error } = await supabase.from('dismantling_outputs').delete().in('dismantling_id', dismIds)
    if (error) console.log('Error dismantling_outputs:', error.message)
  }

  // Delete parent tables
  console.log('Stergere acquisitions...')
  const { error: e2 } = await supabase.from('acquisitions').delete().eq('company_id', companyId)
  if (e2) console.log('Error acquisitions:', e2.message)

  console.log('Stergere sales...')
  const { error: e4 } = await supabase.from('sales').delete().eq('company_id', companyId)
  if (e4) console.log('Error sales:', e4.message)

  console.log('Stergere dismantlings...')
  const { error: e6 } = await supabase.from('dismantlings').delete().eq('company_id', companyId)
  if (e6) console.log('Error dismantlings:', e6.message)

  console.log('Stergere expenses...')
  const { error: e7 } = await supabase.from('expenses').delete().eq('company_id', companyId)
  if (e7) console.log('Error expenses:', e7.message)

  console.log('Stergere cash_transactions...')
  const { error: e8 } = await supabase.from('cash_transactions').delete().eq('company_id', companyId)
  if (e8) console.log('Error cash_transactions:', e8.message)

  console.log('Cleanup complet!')
}

// Only run cleanup
cleanupData()
