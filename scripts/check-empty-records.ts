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

async function checkEmptyRecords() {
  console.log('=== Verificare vanzari FARA items ===\n')

  const { data: sales } = await supabase
    .from('sales')
    .select(`
      id,
      date,
      total_amount,
      client:clients(name),
      items:sale_items(id)
    `)
    .eq('company_id', companyId)
    .order('date', { ascending: false })

  const emptySales = sales?.filter(s => !s.items || s.items.length === 0) || []

  console.log('Vanzari fara items:', emptySales.length)
  emptySales.forEach(sale => {
    console.log(`  - ${sale.date} | ${(sale.client as any)?.name || 'N/A'} | ${sale.total_amount} RON | ID: ${sale.id}`)
  })

  console.log('\n\n=== Verificare achizitii FARA items ===\n')

  const { data: acquisitions } = await supabase
    .from('acquisitions')
    .select(`
      id,
      date,
      total_amount,
      supplier:suppliers(name),
      items:acquisition_items(id)
    `)
    .eq('company_id', companyId)
    .order('date', { ascending: false })

  const emptyAcquisitions = acquisitions?.filter(a => !a.items || a.items.length === 0) || []

  console.log('Achizitii fara items:', emptyAcquisitions.length)
  emptyAcquisitions.forEach(acq => {
    console.log(`  - ${acq.date} | ${(acq.supplier as any)?.name || 'N/A'} | ${acq.total_amount} RON | ID: ${acq.id}`)
  })

  // Summary
  console.log('\n\n=== SUMAR ===')
  console.log('Total vanzari fara items:', emptySales.length)
  console.log('Total achizitii fara items:', emptyAcquisitions.length)

  if (emptySales.length > 0 || emptyAcquisitions.length > 0) {
    console.log('\n⚠️  Aceste inregistrari sunt incomplete si ar trebui sterse sau completate!')
  }
}

checkEmptyRecords()
