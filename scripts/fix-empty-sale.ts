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

async function fixEmptySale() {
  const emptySaleId = '9d37f45a-f7f3-445e-b21f-293c12fad4ad'

  console.log('=== Corectare vanzare fara items ===\n')

  // 1. Get client ID for VANZARI CURTE
  const { data: client } = await supabase
    .from('clients')
    .select('id, name')
    .eq('company_id', companyId)
    .eq('name', 'VANZARI CURTE')
    .single()

  if (!client) {
    console.error('Client VANZARI CURTE not found!')
    return
  }
  console.log('Client:', client.name, '- ID:', client.id)

  // 2. Get material ID for BATERII AUTO
  const { data: material } = await supabase
    .from('materials')
    .select('id, name')
    .ilike('name', '%baterii%')
    .single()

  if (!material) {
    console.error('Material BATERII AUTO not found!')
    return
  }
  console.log('Material:', material.name, '- ID:', material.id)

  // 3. Delete the empty sale
  console.log('\nStergere vanzare goala:', emptySaleId)
  const { error: deleteError } = await supabase
    .from('sales')
    .delete()
    .eq('id', emptySaleId)

  if (deleteError) {
    console.error('Error deleting:', deleteError.message)
    return
  }
  console.log('✓ Vanzare stearsa')

  // 4. Create correct sale with item
  // CSV: BATERII AUTO, 780kg, 28500 RON/ton = 28.5 RON/kg
  const quantity = 780
  const pricePerKgRon = 28.5 // 28500 / 1000
  const lineTotal = quantity * pricePerKgRon // 22230 RON

  console.log('\nCreare vanzare corecta:')
  console.log('  Material:', material.name)
  console.log('  Cantitate:', quantity, 'kg')
  console.log('  Pret:', pricePerKgRon, 'RON/kg')
  console.log('  Total:', lineTotal, 'RON')

  const { data: newSale, error: saleError } = await supabase
    .from('sales')
    .insert({
      company_id: companyId,
      date: '2026-01-28',
      client_id: client.id,
      payment_method: 'cash',
      transport_type: 'extern',
      transport_price: 0,
      total_amount: lineTotal,
      status: 'pending',
    })
    .select()
    .single()

  if (saleError) {
    console.error('Error creating sale:', saleError.message)
    return
  }
  console.log('✓ Vanzare creata - ID:', newSale.id)

  // 5. Add the item
  const { error: itemError } = await supabase
    .from('sale_items')
    .insert({
      sale_id: newSale.id,
      material_id: material.id,
      quantity: quantity,
      impurities_percent: 0,
      final_quantity: quantity,
      price_per_ton_usd: null,
      exchange_rate: null,
      price_per_kg_ron: pricePerKgRon,
      line_total: lineTotal,
    })

  if (itemError) {
    console.error('Error creating item:', itemError.message)
    return
  }
  console.log('✓ Item adaugat')

  console.log('\n=== DONE ===')
  console.log('Vanzare corectata: BATERII AUTO 780kg @ 28.5 RON/kg = 22,230 RON')
}

fixEmptySale()
